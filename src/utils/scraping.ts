import chalk from "chalk";
import { writeFile } from "fs/promises";
import jsdom from "jsdom";
import mime from "mime-types";
import { Buffer } from "node:buffer";
import prettier from "prettier";
import { error, info } from "./log";
import { addSearchParam } from "./url";

type JSONValue =
  | string
  | number
  | boolean
  | { [key: string]: JSONValue }
  | Array<JSONValue>;

export async function paginatedScrape({
  url,
  order,
  limitItems,
  dataHandler,
}: {
  url: string;
  order?: string;
  limitItems?: number;
  dataHandler: (data: JSONValue) => unknown;
}) {
  let page = 0;
  let pagesRemaining = true;
  let itemsRemainingUntilLimitReached = limitItems;
  let nextPageUrl: string | undefined = order
    ? addSearchParam(url, "order", order)
    : url;
  const nextPattern = /(?<=<)([\S]*)(?=>; rel="next")/i;

  while (
    pagesRemaining &&
    nextPageUrl &&
    (itemsRemainingUntilLimitReached === undefined ||
      itemsRemainingUntilLimitReached > 0)
  ) {
    page = page + 1;
    const response = await fetch(nextPageUrl);

    if (!response.ok) {
      error(`Couldn't fetch ${chalk.blue(url)}`);
      return;
    }

    const totalPagesHeader = response.headers.get("x-wp-totalpages");

    info(
      `Scraping page ${chalk.blue(page)} of ${chalk.blue(
        totalPagesHeader,
      )} from ${chalk.blue(nextPageUrl)} ...`,
      true,
    );

    const linkHeader = response.headers.get("link");
    pagesRemaining = !!linkHeader && linkHeader.includes('rel="next"');

    if (pagesRemaining && linkHeader) {
      const match = linkHeader.match(nextPattern);
      nextPageUrl = match ? match[0] : undefined;
    }

    let data: JSONValue = await response.json();

    if (itemsRemainingUntilLimitReached !== undefined && Array.isArray(data)) {
      if (data.length > itemsRemainingUntilLimitReached) {
        data = data.slice(0, itemsRemainingUntilLimitReached);
        itemsRemainingUntilLimitReached = 0;
      } else {
        itemsRemainingUntilLimitReached =
          itemsRemainingUntilLimitReached - data.length;
      }
    }

    await dataHandler(data);
  }
}

export async function formatAsJson(object: unknown) {
  const stringifiedObject = JSON.stringify(object);

  try {
    return prettier.format(stringifiedObject, { parser: "json" });
  } catch {
    return stringifiedObject;
  }
}

export async function formatStringAsHtml(string: string) {
  try {
    return prettier.format(string, { parser: "html" });
  } catch {
    return string;
  }
}

export function filterHtml(
  htmlString: string,
  {
    classFilters,
    idFilters,
    elementFilters,
    removeAttributes,
    removeAllAttributes,
    removeEmptyElements,
  }: {
    classFilters?: string[];
    idFilters?: string[];
    elementFilters?: string[];
    removeAttributes?: string[];
    removeAllAttributes?: boolean;
    removeEmptyElements?: boolean;
  },
) {
  const dom = new jsdom.JSDOM(htmlString);

  if (classFilters) {
    for (const filter of classFilters) {
      dom.window.document
        .querySelectorAll(`.${filter}`)
        .forEach((e) => e.remove());
    }
  }

  if (idFilters) {
    for (const filter of idFilters) {
      dom.window.document
        .querySelectorAll(`#${filter}`)
        .forEach((e) => e.remove());
    }
  }

  if (elementFilters) {
    for (const filter of elementFilters) {
      dom.window.document
        .querySelectorAll(`${filter}`)
        .forEach((e) => e.remove());
    }
  }

  if (removeEmptyElements) {
    for (const element of dom.window.document.querySelectorAll("body *")) {
      if (!element.textContent || element.textContent.trim().length === 0) {
        element.remove();
      }
    }
  }

  if (removeAllAttributes) {
    for (const element of dom.window.document.querySelectorAll("body *")) {
      while (element.attributes.length > 0) {
        element.removeAttribute(element.attributes[0].name);
      }
    }
  } else if (removeAttributes && removeAttributes.length > 0) {
    for (const element of dom.window.document.querySelectorAll("body *")) {
      for (const attribute of removeAttributes) {
        element.removeAttribute(attribute);
      }
    }
  }

  return dom.window.document.body.innerHTML;
}

export function getInJSON(json: JSONValue, key: string) {
  if (
    typeof json === "object" &&
    !Array.isArray(json) &&
    key in json &&
    json[key] !== undefined &&
    json[key] !== null
  ) {
    return json[key];
  }

  return undefined;
}

export function filterJSON(json: JSONValue, jsonFilters: string[]) {
  if (typeof json !== "object" || Array.isArray(json)) {
    return {};
  }

  const removeKeys = jsonFilters.filter((filter) => !filter.endsWith("*"));
  const removeStartingWith = jsonFilters
    .filter((filter) => filter.endsWith("*"))
    .map((filter) => filter.slice(0, -1));

  return Object.keys(json)
    .filter(
      (key) =>
        !(
          removeKeys.includes(key) ||
          removeStartingWith.some((removeKey) => key.startsWith(removeKey))
        ),
    )
    .reduce((filteredJson, key) => ({ ...filteredJson, [key]: json[key] }), {});
}

export function getLinks(json: JSONValue) {
  return getInJSON(json, "_links");
}

export function getMetadata(json: JSONValue, jsonFilters?: string[]) {
  const defaultRemoveKeys = ["content", "excerpt", "_links"];

  return filterJSON(json, [...defaultRemoveKeys, ...(jsonFilters || [])]);
}

export async function findImageMediaIds(htmlString: string) {
  const dom = new jsdom.JSDOM(htmlString);
  const mediaIds = [];

  for (const element of dom.window.document.querySelectorAll("img")) {
    const attachmentId = element.getAttribute("data-attachment-id");

    if (attachmentId) {
      mediaIds.push(parseInt(attachmentId));
    }
  }

  return [...new Set(mediaIds)];
}

export async function downloadImages(
  mediaIds: number[],
  apiUrl: string,
  dir: string,
) {
  for (const mediaId of mediaIds) {
    const mediaItemApiUrl = `${apiUrl}/media/${mediaId}`;
    const response = await fetch(mediaItemApiUrl);

    if (!response.ok) {
      error(`Couldn't fetch ${chalk.blue(mediaItemApiUrl)}`);
      return;
    }

    const mediaItem = await response.json();

    if (mediaItem.media_type === "image") {
      await downloadMediaItemImage(mediaItem, dir);
    }
  }
}

export async function downloadMediaItemImage(
  mediaItem: {
    slug?: string;
    media_type?: string;
    mime_type?: string;
    media_details?: {
      sizes?: {
        full?: {
          source_url?: string;
        };
      };
    };
  },
  dir: string,
) {
  if (
    mediaItem.media_type === "image" &&
    mediaItem.media_details &&
    mediaItem.media_details.sizes &&
    mediaItem.media_details.sizes.full &&
    mediaItem.media_details.sizes.full.source_url &&
    mediaItem.slug &&
    mediaItem.mime_type
  ) {
    const fullImageUrl = mediaItem.media_details.sizes.full.source_url;
    const fileName = `${mediaItem.slug}.${mime.extension(mediaItem.mime_type)}`;

    const response = await fetch(fullImageUrl);

    if (!response.ok) {
      error(`Couldn't fetch ${chalk.blue(fullImageUrl)}`);
      return;
    }

    const blob = await response.blob();
    const arrayBuffer = await blob.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    await writeFile(`${dir}/${fileName}`, buffer);
    info(`Downloaded image ${chalk.blue(fileName)}`);
  }
}

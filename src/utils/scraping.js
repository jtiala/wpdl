import chalk from "chalk";
import { writeFile } from "fs/promises";
import jsdom from "jsdom";
import mime from "mime-types";
import { Buffer } from "node:buffer";
import prettier from "prettier";
import { error, info } from "./log.js";

export async function paginatedScrape(url, limitPages, handleData) {
  let page = 0;
  let pagesRemaining = true;
  let nextPageUrl = url;
  const nextPattern = /(?<=<)([\S]*)(?=>; rel="next")/i;

  while (pagesRemaining) {
    page = page + 1;
    const response = await fetch(nextPageUrl);

    if (!response.ok) {
      error(`Couldn't fetch ${chalk.blue(url)}`);
      return;
    }

    const totalPagesHeader = response.headers.get("x-wp-totalpages");
    const linkHeader = response.headers.get("link");

    pagesRemaining =
      page !== limitPages && linkHeader && linkHeader.includes('rel="next"');

    info(
      `Scraping page ${chalk.blue(page)} of ${chalk.blue(
        totalPagesHeader
      )} from ${chalk.blue(nextPageUrl)} ...`,
      true
    );

    if (pagesRemaining) {
      nextPageUrl = linkHeader.match(nextPattern)[0];
    }

    const data = await response.json();

    await handleData(data);
  }
}

export function formatObjectAsJson(object) {
  const stringifiedObject = JSON.stringify(object);

  try {
    return prettier.format(stringifiedObject, { parser: "json" });
  } catch {
    return stringifiedObject;
  }
}

export function formatStringAsHtml(string) {
  try {
    return prettier.format(string, { parser: "html" });
  } catch {
    return string;
  }
}

export function filterHtml(
  htmlString,
  {
    classFilters,
    idFilters,
    elementFilters,
    removeAttributes,
    removeAllAttributes,
    removeEmptyElements,
  }
) {
  const dom = new jsdom.JSDOM(htmlString);

  for (const filter of classFilters) {
    dom.window.document
      .querySelectorAll(`.${filter}`)
      .forEach((e) => e.remove());
  }

  for (const filter of idFilters) {
    dom.window.document
      .querySelectorAll(`#${filter}`)
      .forEach((e) => e.remove());
  }

  for (const filter of elementFilters) {
    dom.window.document
      .querySelectorAll(`${filter}`)
      .forEach((e) => e.remove());
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
  } else if (removeAttributes.length > 0) {
    for (const element of dom.window.document.querySelectorAll("body *")) {
      for (const attribute of removeAttributes) {
        element.removeAttribute(attribute);
      }
    }
  }

  return dom.window.document.body.innerHTML;
}

export function getInJSON(json, key) {
  if (key in json && json[key] !== undefined && json[key] !== null) {
    return json[key];
  }

  return undefined;
}

export function filterJSON(json, jsonFilters) {
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
        )
    )
    .reduce((filteredJson, key) => ({ ...filteredJson, [key]: json[key] }), {});
}

export function getLinks(json) {
  return getInJSON(json, "_links");
}

export function getMetadata(json, jsonFilters) {
  const defaultRemoveKeys = ["content", "excerpt", "_links"];

  return filterJSON(json, [...defaultRemoveKeys, ...jsonFilters]);
}

export async function findImageMediaIds(htmlString) {
  const dom = new jsdom.JSDOM(htmlString);
  const mediaIds = [];

  for (const element of dom.window.document.querySelectorAll("img")) {
    if (element.hasAttribute("data-attachment-id")) {
      mediaIds.push(parseInt(element.getAttribute("data-attachment-id")));
    }
  }

  let uniqueMediaIds = [...new Set(mediaIds)];

  return uniqueMediaIds;
}

export async function downloadImages(mediaIds, apiUrl, dir) {
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

export async function downloadMediaItemImage(mediaItem, dir) {
  if (
    mediaItem.media_type === "image" &&
    mediaItem.media_details.sizes.full.source_url &&
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

import chalk from "chalk";
import { mkdir, rm, writeFile } from "fs/promises";
import jsdom from "jsdom";
import mime from "mime-types";
import prettier from "prettier";

export const info = (message) => console.log(chalk.cyan(message) + "\n");
export const success = (message) => console.log(chalk.green(message) + "\n");
export const error = (message) => console.log(chalk.red(message) + "\n");

export const isValidUrl = (string) => {
  try {
    new URL(string);
    return true;
  } catch (e) {
    return false;
  }
};

export async function paginatedScrape(url, limitPages, handleData) {
  let page = 0;
  let pagesRemaining = true;
  let nextPageUrl = url;
  const nextPattern = /(?<=<)([\S]*)(?=>; rel="next")/i;

  while (pagesRemaining) {
    page = page + 1;
    const response = await fetch(nextPageUrl);
    const totalPagesHeader = response.headers.get("x-wp-totalpages");
    const linkHeader = response.headers.get("link");

    pagesRemaining =
      page !== limitPages && linkHeader && linkHeader.includes(`rel=\"next\"`);

    info(
      `Scraping page ${chalk.green(page)} of ${chalk.green(
        totalPagesHeader
      )} from ${chalk.green(nextPageUrl)} ...`
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

export async function findImageMediaIds(htmlString) {
  const dom = new jsdom.JSDOM(htmlString);
  const mediaIds = [];

  for (const element of dom.window.document.querySelectorAll("img")) {
    if (element.hasAttribute("data-attachment-id")) {
      mediaIds.push(parseInt(element.getAttribute("data-attachment-id")));
    }
  }

  if (mediaIds.length > 0) {
    info(`Found ${chalk.blue(mediaIds.length)} images`);
  }

  return mediaIds;
}

export async function downloadImages(mediaIds, apiUrl, dir) {
  for (const mediaId of mediaIds) {
    const mediaItemApiUrl = `${apiUrl}/media/${mediaId}`;
    const response = await fetch(mediaItemApiUrl);
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
    const imageData = await fetch(fullImageUrl);
    const blob = await imageData.blob();
    const arrayBuffer = await blob.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    await writeFile(`${dir}/${fileName}`, buffer);
    info(`Downloaded image ${chalk.blue(fileName)}`);
  }
}

export async function cleanDir(dir, recreate = true, silent = false) {
  if (!silent) {
    info(`Cleaning ${chalk.blue(dir)} ...`);
  }

  await rm(dir, { recursive: true, force: true });

  if (recreate) {
    await mkdir(dir, { recursive: true });
  }

  if (!silent) {
    success("Done.");
  }
}

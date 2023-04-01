import chalk from "chalk";
import { mkdir, writeFile } from "fs/promises";
import {
  cleanDir,
  downloadMediaItemImage,
  filterJSON,
  formatObjectAsJson,
  info,
  paginatedScrape,
  success,
} from "./utils.js";

function getMediaItemMetadata(mediaItem, jsonFilters) {
  const defaultRemoveKeys = ["_links"];

  return filterJSON(mediaItem, [...defaultRemoveKeys, ...jsonFilters]);
}

export async function scrapeMedia({
  apiUrl,
  dataDir,
  jsonFilters,
  limitPages,
}) {
  info("--- media ---");

  const mediaApiUrl = `${apiUrl}/media`;
  const mediaDir = `${dataDir}/media`;

  await mkdir(mediaDir, { recursive: true });

  await paginatedScrape(mediaApiUrl, limitPages, async (mediaList) => {
    if (!Array.isArray(mediaList) || mediaList.length === 0) {
      info("No media found.");
      cleanDir(mediaDir, true);

      return;
    }

    for (const mediaItem of mediaList) {
      const mediaItemIdentifier = `${mediaItem.id}-${mediaItem.slug}`;
      const mediaItemDir = `${mediaDir}/${mediaItemIdentifier}`;

      await cleanDir(mediaItemDir, true, true);

      await writeFile(
        `${mediaItemDir}/full-data.json`,
        formatObjectAsJson(mediaItem)
      );

      await writeFile(
        `${mediaItemDir}/meta-data.json`,
        formatObjectAsJson(getMediaItemMetadata(mediaItem, jsonFilters))
      );

      if (mediaItem.media_type === "image") {
        await downloadMediaItemImage(mediaItem, mediaItemDir);
      }

      info(`Scraped media item ${chalk.blue(mediaItemIdentifier)}`);
    }
  });

  success("Done.");
}

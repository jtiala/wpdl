import chalk from "chalk";
import { mkdir, writeFile } from "fs/promises";
import mime from "mime-types";
import {
  cleanDir,
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

      if (mediaItem.media_type === "image" && mediaItem.mime_type) {
        const fullImageUrl = mediaItem.media_details.sizes.full.source_url;

        if (fullImageUrl) {
          const fileName = `${mediaItem.slug}.${mime.extension(
            mediaItem.mime_type
          )}`;

          const imageData = await fetch(fullImageUrl);
          const blob = await imageData.blob();
          const arrayBuffer = await blob.arrayBuffer();
          const buffer = Buffer.from(arrayBuffer);
          await writeFile(`${mediaItemDir}/${fileName}`, buffer);
        }
      }

      info(`Scraped media item ${chalk.blue(mediaItemIdentifier)}`);
    }
  });

  success("Done.");
}

import chalk from "chalk";
import { mkdir, writeFile } from "fs/promises";
import { cleanDir } from "../utils/fs.js";
import { info, success } from "../utils/log.js";
import {
  downloadMediaItemImage,
  formatObjectAsJson,
  getLinks,
  getMetadata,
  paginatedScrape,
} from "../utils/scraping.js";

export async function scrapeMedia({
  apiUrl,
  dataDir,
  jsonFilters,
  limitPages,
}) {
  info(`Scraping ${chalk.blue("media")}...`, true);

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

      info(`Scraping media item ${chalk.blue(mediaItemIdentifier)}...`);

      await cleanDir(mediaItemDir, true, true);

      await writeFile(
        `${mediaItemDir}/full-data.json`,
        formatObjectAsJson(mediaItem)
      );

      await writeFile(
        `${mediaItemDir}/meta-data.json`,
        formatObjectAsJson(getMetadata(mediaItem, jsonFilters))
      );

      await writeFile(
        `${mediaItemDir}/links.json`,
        formatObjectAsJson(getLinks(mediaItem))
      );

      if (mediaItem.media_type === "image") {
        await downloadMediaItemImage(mediaItem, mediaItemDir);
      }

      success("Done.", true);
    }
  });

  success("Done scraping media.", true);
}

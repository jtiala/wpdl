import chalk from "chalk";
import { mkdir, writeFile } from "fs/promises";
import { cleanDir } from "../utils/fs";
import { info, success } from "../utils/log";
import {
  downloadMediaItemImage,
  formatAsJson,
  getLinks,
  getMetadata,
  paginatedScrape,
} from "../utils/scraping";

export async function scrapeMedia({
  apiUrl,
  dataDir,
  jsonFilters,
  order,
  limitItems,
}: {
  apiUrl: string;
  dataDir: string;
  jsonFilters?: string[];
  order?: string;
  limitItems?: number;
}) {
  info(`Scraping ${chalk.blue("media")}...`, true);

  const mediaApiUrl = `${apiUrl}/media`;
  const mediaDir = `${dataDir}/media`;

  await mkdir(mediaDir, { recursive: true });

  await paginatedScrape({
    url: mediaApiUrl,
    order,
    limitItems,
    dataHandler: async (mediaList) => {
      if (!Array.isArray(mediaList) || mediaList.length === 0) {
        info("No media found.");
        cleanDir(mediaDir, true);

        return;
      }

      for (const mediaItem of mediaList) {
        if (
          typeof mediaItem === "object" &&
          "id" in mediaItem &&
          "slug" in mediaItem
        ) {
          const mediaItemIdentifier = `${mediaItem.id}-${mediaItem.slug}`;
          const mediaItemDir = `${mediaDir}/${mediaItemIdentifier}`;

          info(`Scraping media item ${chalk.blue(mediaItemIdentifier)}...`);

          await cleanDir(mediaItemDir, true, true);

          await writeFile(
            `${mediaItemDir}/full-data.json`,
            await formatAsJson(mediaItem),
          );

          await writeFile(
            `${mediaItemDir}/meta-data.json`,
            await formatAsJson(getMetadata(mediaItem, jsonFilters)),
          );

          await writeFile(
            `${mediaItemDir}/links.json`,
            await formatAsJson(getLinks(mediaItem)),
          );

          if (mediaItem.media_type === "image") {
            await downloadMediaItemImage(mediaItem, mediaItemDir);
          }

          success("Done.", true);
        }
      }
    },
  });

  success("Done scraping media.", true);
}

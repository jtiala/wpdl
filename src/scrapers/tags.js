import chalk from "chalk";
import { mkdir, writeFile } from "fs/promises";
import { cleanDir } from "../utils/fs.js";
import { info, success } from "../utils/log.js";
import {
  formatObjectAsJson,
  getLinks,
  getMetadata,
  paginatedScrape,
} from "../utils/scraping.js";

export async function scrapeTags({ apiUrl, dataDir, jsonFilters, limitPages }) {
  info(`Scraping ${chalk.blue("tags")}...`, true);

  const tagsApiUrl = `${apiUrl}/tags`;
  const tagsDir = `${dataDir}/tags`;

  await mkdir(tagsDir, { recursive: true });

  await paginatedScrape(tagsApiUrl, limitPages, async (tags) => {
    if (!Array.isArray(tags) || tags.length === 0) {
      info("No tags found.");
      cleanDir(tagsDir, true);

      return;
    }

    for (const tag of tags) {
      const tagIdentifier = `${tag.id}-${tag.slug}`;
      const tagDir = `${tagsDir}/${tagIdentifier}`;

      info(`Scraping tag ${chalk.blue(tagIdentifier)}...`);

      await cleanDir(tagDir, true, true);

      await writeFile(`${tagDir}/full-data.json`, formatObjectAsJson(tag));

      await writeFile(
        `${tagDir}/meta-data.json`,
        formatObjectAsJson(getMetadata(tag, jsonFilters))
      );

      await writeFile(
        `${tagDir}/links.json`,
        formatObjectAsJson(getLinks(tag))
      );

      success("Done.", true);
    }
  });

  success("Done scraping tags.", true);
}

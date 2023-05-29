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

export async function scrapeCategories({
  apiUrl,
  dataDir,
  jsonFilters,
  limitPages,
}) {
  info(`Scraping ${chalk.blue("categories")}...`, true);

  const categoriesApiUrl = `${apiUrl}/categories`;
  const categoriesDir = `${dataDir}/categories`;

  await mkdir(categoriesDir, { recursive: true });

  await paginatedScrape(categoriesApiUrl, limitPages, async (categories) => {
    if (!Array.isArray(categories) || categories.length === 0) {
      info("No categories found.");
      cleanDir(categoriesDir, true);

      return;
    }

    for (const category of categories) {
      const categoryIdentifier = `${category.id}-${category.slug}`;
      const categoryDir = `${categoriesDir}/${categoryIdentifier}`;

      info(`Scraping category ${chalk.blue(categoryIdentifier)}...`);

      await cleanDir(categoryDir, true, true);

      await writeFile(
        `${categoryDir}/full-data.json`,
        formatObjectAsJson(category)
      );

      await writeFile(
        `${categoryDir}/meta-data.json`,
        formatObjectAsJson(getMetadata(category, jsonFilters))
      );

      await writeFile(
        `${categoryDir}/links.json`,
        formatObjectAsJson(getLinks(category))
      );

      success("Done.", true);
    }
  });

  success("Done scraping categories.", true);
}

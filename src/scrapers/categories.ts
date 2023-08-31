import chalk from "chalk";
import { mkdir, writeFile } from "fs/promises";
import { cleanDir } from "../utils/fs";
import { info, success } from "../utils/log";
import {
  formatAsJson,
  getLinks,
  getMetadata,
  paginatedScrape,
} from "../utils/scraping";

export async function scrapeCategories({
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
  info(`Scraping ${chalk.blue("categories")}...`, true);

  const categoriesApiUrl = `${apiUrl}/categories`;
  const postsApiUrl = `${apiUrl}/posts`;
  const categoriesDir = `${dataDir}/categories`;

  await mkdir(categoriesDir, { recursive: true });

  await paginatedScrape({
    url: categoriesApiUrl,
    order,
    limitItems,
    dataHandler: async (categories) => {
      if (!Array.isArray(categories) || categories.length === 0) {
        info("No categories found.");
        cleanDir(categoriesDir, true);

        return;
      }

      for (const category of categories) {
        if (
          typeof category === "object" &&
          "id" in category &&
          "slug" in category
        ) {
          const categoryIdentifier = `${category.id}-${category.slug}`;
          const categoryDir = `${categoriesDir}/${categoryIdentifier}`;

          info(`Scraping category ${chalk.blue(categoryIdentifier)}...`);

          await cleanDir(categoryDir, true, true);

          await writeFile(
            `${categoryDir}/full-data.json`,
            await formatAsJson(category),
          );

          await writeFile(
            `${categoryDir}/meta-data.json`,
            await formatAsJson(getMetadata(category, jsonFilters)),
          );

          await writeFile(
            `${categoryDir}/links.json`,
            await formatAsJson(getLinks(category)),
          );

          const postIds: number[] = [];

          info(
            `Scraping ${chalk.blue("posts")} for category ${chalk.blue(
              categoryIdentifier,
            )}...`,
          );

          await paginatedScrape({
            url: `${postsApiUrl}?categories=${category.id}`,
            dataHandler: async (posts) => {
              if (!Array.isArray(posts) || posts.length === 0) {
                info("No posts found for the category.");

                return;
              }

              for (const post of posts) {
                if (
                  typeof post === "object" &&
                  "id" in post &&
                  typeof post.id === "number"
                ) {
                  postIds.push(post.id);
                }
              }
            },
          });

          if (postIds.length > 0) {
            await writeFile(
              `${categoryDir}/posts.json`,
              await formatAsJson(postIds),
            );
          }

          success("Done.", true);
        }
      }
    },
  });

  success("Done scraping categories.", true);
}

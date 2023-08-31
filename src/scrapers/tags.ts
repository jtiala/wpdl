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

export async function scrapeTags({
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
  info(`Scraping ${chalk.blue("tags")}...`, true);

  const tagsApiUrl = `${apiUrl}/tags`;
  const postsApiUrl = `${apiUrl}/posts`;
  const tagsDir = `${dataDir}/tags`;

  await mkdir(tagsDir, { recursive: true });

  await paginatedScrape({
    url: tagsApiUrl,
    order,
    limitItems,
    dataHandler: async (tags) => {
      if (!Array.isArray(tags) || tags.length === 0) {
        info("No tags found.");
        cleanDir(tagsDir, true);

        return;
      }

      for (const tag of tags) {
        if (typeof tag === "object" && "id" in tag && "slug" in tag) {
          const tagIdentifier = `${tag.id}-${tag.slug}`;
          const tagDir = `${tagsDir}/${tagIdentifier}`;

          info(`Scraping tag ${chalk.blue(tagIdentifier)}...`);

          await cleanDir(tagDir, true, true);

          await writeFile(`${tagDir}/full-data.json`, await formatAsJson(tag));

          await writeFile(
            `${tagDir}/meta-data.json`,
            await formatAsJson(getMetadata(tag, jsonFilters)),
          );

          await writeFile(
            `${tagDir}/links.json`,
            await formatAsJson(getLinks(tag)),
          );

          const postIds: number[] = [];

          info(
            `Scraping ${chalk.blue("posts")} for tag ${chalk.blue(
              tagIdentifier,
            )}...`,
          );

          await paginatedScrape({
            url: `${postsApiUrl}?tag=${tag.id}`,
            dataHandler: async (posts) => {
              if (!Array.isArray(posts) || posts.length === 0) {
                info("No posts found for the tag.");

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
              `${tagDir}/posts.json`,
              await formatAsJson(postIds),
            );
          }

          success("Done.", true);
        }
      }
    },
  });

  success("Done scraping tags.", true);
}

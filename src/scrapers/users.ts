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

export async function scrapeUsers({
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
  info(`Scraping ${chalk.blue("users")}...`, true);

  const usersApiUrl = `${apiUrl}/users`;
  const postsApiUrl = `${apiUrl}/posts`;
  const usersDir = `${dataDir}/users`;

  await mkdir(usersDir, { recursive: true });

  await paginatedScrape({
    url: usersApiUrl,
    order,
    limitItems,
    dataHandler: async (users) => {
      if (!Array.isArray(users) || users.length === 0) {
        info("No users found.");
        cleanDir(usersDir, true);

        return;
      }

      for (const user of users) {
        if (typeof user === "object" && "id" in user && "slug" in user) {
          const userIdentifier = `${user.id}-${user.slug}`;
          const userDir = `${usersDir}/${userIdentifier}`;

          info(`Scraping user ${chalk.blue(userIdentifier)}...`);

          await cleanDir(userDir, true, true);

          await writeFile(
            `${userDir}/full-data.json`,
            await formatAsJson(user),
          );

          await writeFile(
            `${userDir}/meta-data.json`,
            await formatAsJson(getMetadata(user, jsonFilters)),
          );

          await writeFile(
            `${userDir}/links.json`,
            await formatAsJson(getLinks(user)),
          );

          const postIds: number[] = [];

          info(
            `Scraping ${chalk.blue("posts")} for user ${chalk.blue(
              userIdentifier,
            )}...`,
          );

          await paginatedScrape({
            url: `${postsApiUrl}?author=${user.id}`,
            dataHandler: async (posts) => {
              if (!Array.isArray(posts) || posts.length === 0) {
                info("No posts found for the user.");

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
              `${userDir}/posts.json`,
              await formatAsJson(postIds),
            );
          }

          success("Done.", true);
        }
      }
    },
  });

  success("Done scraping users.", true);
}

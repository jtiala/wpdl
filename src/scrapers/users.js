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

export async function scrapeUsers({
  apiUrl,
  dataDir,
  jsonFilters,
  limitPages,
}) {
  info(`Scraping ${chalk.blue("users")}...`, true);

  const usersApiUrl = `${apiUrl}/users`;
  const postsApiUrl = `${apiUrl}/posts`;
  const usersDir = `${dataDir}/users`;

  await mkdir(usersDir, { recursive: true });

  await paginatedScrape(usersApiUrl, limitPages, async (users) => {
    if (!Array.isArray(users) || users.length === 0) {
      info("No users found.");
      cleanDir(usersDir, true);

      return;
    }

    for (const user of users) {
      const userIdentifier = `${user.id}-${user.slug}`;
      const userDir = `${usersDir}/${userIdentifier}`;

      info(`Scraping user ${chalk.blue(userIdentifier)}...`);

      await cleanDir(userDir, true, true);

      await writeFile(`${userDir}/full-data.json`, formatObjectAsJson(user));

      await writeFile(
        `${userDir}/meta-data.json`,
        formatObjectAsJson(getMetadata(user, jsonFilters))
      );

      await writeFile(
        `${userDir}/links.json`,
        formatObjectAsJson(getLinks(user))
      );

      let postIds = [];

      info(
        `Scraping ${chalk.blue("posts")} for user ${chalk.blue(
          userIdentifier
        )}...`
      );

      await paginatedScrape(
        `${postsApiUrl}?author=${user.id}`,
        limitPages,
        async (posts) => {
          if (!Array.isArray(posts) || posts.length === 0) {
            info("No posts found for the user.");

            return;
          }

          for (const post of posts) {
            postIds = [...postIds, post.id];
          }
        }
      );

      if (postIds.length > 0) {
        await writeFile(`${userDir}/posts.json`, formatObjectAsJson(postIds));
      }

      success("Done.", true);
    }
  });

  success("Done scraping users.", true);
}

import chalk from "chalk";
import { mkdir, writeFile } from "fs/promises";
import {
  cleanDir,
  filterHtml,
  filterJSON,
  formatObjectAsJson,
  formatStringAsHtml,
  info,
  paginatedScrape,
  success,
} from "./utils.js";

function getPostMetadata(post, jsonFilters) {
  const defaultRemoveKeys = ["content", "excerpt", "_links"];

  return filterJSON(post, [...defaultRemoveKeys, ...jsonFilters]);
}

export async function scrapePosts({
  apiUrl,
  dataDir,
  classFilters,
  idFilters,
  elementFilters,
  jsonFilters,
  removeAttributes,
  removeAllAttributes,
  removeEmptyElements,
  limitPages,
}) {
  info("--- posts ---");

  const postsApiUrl = `${apiUrl}/posts`;
  const postsDir = `${dataDir}/posts`;

  await mkdir(postsDir, { recursive: true });

  const saveUnmodifiedHtml =
    !!classFilters ||
    !!idFilters ||
    !!elementFilters ||
    !!removeAttributes ||
    removeAllAttributes ||
    removeEmptyElements;

  await paginatedScrape(postsApiUrl, limitPages, async (posts) => {
    if (!Array.isArray(posts) || posts.length === 0) {
      info("No posts found.");
      cleanDir(postsDir, true);

      return;
    }

    for (const post of posts) {
      const postIdentifier = `${post.id}-${post.slug}`;
      const postDir = `${postsDir}/${postIdentifier}`;

      await cleanDir(postDir, true, true);

      await writeFile(`${postDir}/full-data.json`, formatObjectAsJson(post));

      await writeFile(
        `${postDir}/meta-data.json`,
        formatObjectAsJson(getPostMetadata(post, jsonFilters))
      );

      await writeFile(
        `${postDir}/rendered-content.html`,
        formatStringAsHtml(
          filterHtml(post.content.rendered, {
            classFilters,
            idFilters,
            elementFilters,
            removeAttributes,
            removeAllAttributes,
            removeEmptyElements,
          })
        )
      );

      await writeFile(
        `${postDir}/rendered-excerpt.html`,
        formatStringAsHtml(
          filterHtml(post.excerpt.rendered, {
            classFilters,
            idFilters,
            elementFilters,
            removeAttributes,
            removeAllAttributes,
            removeEmptyElements,
          })
        )
      );

      if (saveUnmodifiedHtml) {
        await writeFile(
          `${postDir}/rendered-content-unmodified.html`,
          formatStringAsHtml(post.content.rendered)
        );

        await writeFile(
          `${postDir}/rendered-excerpt-unmodified.html`,
          formatStringAsHtml(post.excerpt.rendered)
        );
      }

      info(`Scraped post ${chalk.blue(postIdentifier)}`);
    }
  });

  success("Done.");
}

import chalk from "chalk";
import { mkdir, writeFile } from "fs/promises";
import prettier from "prettier";
import {
  cleanDir,
  filterHtml,
  filterJSON,
  formatObjectAsJson,
  formatStringAsHtml,
  info,
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
  jsonFilters,
}) {
  const postsApiUrl = `${apiUrl}/posts`;
  const postsDir = `${dataDir}/posts`;

  info("--- posts ---");
  info(`Scraping posts from ${chalk.blue(postsApiUrl)} ...`);

  await mkdir(postsDir, { recursive: true });

  const posts = await (await fetch(postsApiUrl)).json();

  if (!Array.isArray(posts) || posts.length === 0) {
    info("No posts found.");
    clean(postsDir, true);

    return;
  }

  await writeFile(`${postsDir}/all-posts.json`, formatObjectAsJson(posts));

  for (const post of posts) {
    const postIdentifier = `${post.id}-${post.slug}`;
    const postDir = `${postsDir}/${postIdentifier}`;

    await cleanDir(postDir, true, true);

    await writeFile(
      `${postDir}/full-data.json`,
      prettier.format(JSON.stringify(post), { parser: "json" })
    );

    await writeFile(
      `${postDir}/meta-data.json`,
      formatObjectAsJson(getPostMetadata(post, jsonFilters))
    );

    await writeFile(
      `${postDir}/rendered-content.html`,
      formatStringAsHtml(
        filterHtml(post.content.rendered, { classFilters, idFilters })
      )
    );

    await writeFile(
      `${postDir}/rendered-excerpt.html`,
      formatStringAsHtml(
        filterHtml(post.excerpt.rendered, { classFilters, idFilters })
      )
    );

    info(`Scraped post ${chalk.blue(postIdentifier)}`);
  }

  success("Done.");
}

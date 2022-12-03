import chalk from "chalk";
import { mkdir, writeFile } from "fs/promises";
import prettier from "prettier";
import {
  cleanDir,
  formatObjectAsJson,
  formatStringAsHtml,
  info,
  success,
} from "./utils.js";

function getPostMetadata(post) {
  return { ...post, content: undefined };
}

export async function scrapePosts(apiUrl, dataDir) {
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
      formatObjectAsJson(getPostMetadata(post))
    );

    await writeFile(
      `${postDir}/rendered-content.html`,
      formatStringAsHtml(post.content.rendered)
    );

    info(`Scraped post ${chalk.blue(postIdentifier)}`);
  }

  success("Done.");
}

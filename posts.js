import chalk from "chalk";
import { mkdir, writeFile } from "fs/promises";
import prettier from "prettier";
import {
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

  await mkdir(postsDir);

  const posts = await (await fetch(postsApiUrl)).json();

  await writeFile(`${postsDir}/all-posts.json`, formatObjectAsJson(posts));

  if (!Array.isArray(posts) || posts.length === 0) {
    info("No posts found.");
    clean(postsDir, true);

    return;
  }

  posts.map(async (post) => {
    const postDir = `${postsDir}/${post.id}-${post.slug}`;

    await mkdir(postDir);

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
  });

  success("Done.");
}

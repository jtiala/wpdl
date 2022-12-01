#!/usr/bin/env node
import chalk from "chalk";
import { access, mkdir, rm, writeFile } from "fs/promises";
import prettier from "prettier";
import { hideBin } from "yargs/helpers";
import yargs from "yargs/yargs";

const argv = yargs(hideBin(process.argv))
  .usage("Usage: $0 --url https://your-wp-instance.com [options]")
  .option("url", {
    type: "string",
    description: "Root URL of the WordPress instance to scrape",
  })
  .option("targetDir", {
    type: "string",
    description: "Directory where scraped data is saved to",
    default: "./",
  })
  .demandOption(["url"])
  .parse();

const isValidUrl = (string) => {
  try {
    new URL(string);
    return true;
  } catch (e) {
    return false;
  }
};

const info = (message) => console.log(chalk.cyan(message) + "\n");
const success = (message) => console.log(chalk.green(message) + "\n");
const error = (message) => console.log(chalk.red(message) + "\n");

function formatObjectAsJson(object) {
  return prettier.format(JSON.stringify(object), { parser: "json" });
}

function formatStringAsHtml(string) {
  return prettier.format(string, { parser: "html" });
}

function getPostMetadata(post) {
  return { ...post, content: undefined };
}

async function clean(dir, recreate = true) {
  info(`Cleaning ${chalk.blue(dir)} ...`);

  await rm(dir, { recursive: true, force: true });

  if (recreate) {
    await mkdir(dir);
  }

  success("Done.");
}

async function scrapePosts() {
  info("--- posts ---");
  info(`Scraping posts from ${chalk.blue(POSTS_API_URL)} ...`);

  await mkdir(POSTS_DIR);

  const posts = await (await fetch(POSTS_API_URL)).json();

  await writeFile(`${POSTS_DIR}/all-posts.json`, formatObjectAsJson(posts));

  if (!Array.isArray(posts) || posts.length === 0) {
    info("No posts found.");
    clean(POSTS_DIR, true);

    return;
  }

  posts.map(async (post) => {
    const postDir = `${POSTS_DIR}/${post.id}-${post.slug}`;

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

if (!isValidUrl(argv.url)) {
  error(`${chalk.blue(argv.url)} is not a valid URL`);
  process.exit(1);
}

const targetDiv = String(
  argv.targetDir.substring(argv.targetDir.length - 1) === "/"
    ? argv.targetDir.slice(0, -1)
    : argv.targetDir
);

try {
  await access(targetDiv);
} catch (e) {
  error(
    `Target directory ${chalk.blue(
      targetDiv
    )} doesn't exist or you don't have access to it.`
  );
  process.exit(1);
}

const API_URL = `${argv.url}/wp-json/wp/v2`;
const POSTS_API_URL = `${API_URL}/posts`;

const DATA_DIR = `${targetDiv}/data`;
const POSTS_DIR = `${DATA_DIR}/posts`;

info("--- wpdl ---");
info(`Starting to scrape ${chalk.blue(argv.url)}`);

await clean(DATA_DIR);
await scrapePosts();

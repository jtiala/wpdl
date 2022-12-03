#!/usr/bin/env node
import chalk from "chalk";
import { access } from "fs/promises";
import { hideBin } from "yargs/helpers";
import yargs from "yargs/yargs";
import { scrapePosts } from "./posts.js";
import { cleanDir, error, info, isValidUrl } from "./utils.js";

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

export const apiUrl = `${argv.url}/wp-json/wp/v2`;
export const dataDir = `${targetDiv}/data`;

info("--- wpdl ---");
info(`Starting to scrape ${chalk.blue(argv.url)}`);

await cleanDir(dataDir);
await scrapePosts(apiUrl, dataDir);

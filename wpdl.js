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
    alias: "u",
    type: "string",
    description: "Root URL of the WordPress instance to scrape",
  })
  .option("targetDir", {
    alias: "t",
    type: "string",
    description: "Directory where scraped data is saved to",
    default: "./",
  })
  .option("classFilter", {
    type: "string",
    description: "Filter out HTML elements with the given class",
  })
  .option("idFilter", {
    type: "string",
    description: "Filter out HTML elements with the given ID",
  })
  .option("elementFilter", {
    type: "string",
    description: "Filter out the given HTML elements",
  })
  .option("jsonFilter", {
    type: "string",
    description:
      "Filter out properties from JSONs with the given key. If the key ends with *, it's considered as a wildcard.",
  })
  .option("clean", {
    alias: "c",
    type: "boolean",
    description: "Clean target directory before scraping",
    default: false,
  })
  .demandOption(["url"])
  .alias("h", "help")
  .alias("v", "version")
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

const classFilters = Array.isArray(argv.classFilter)
  ? argv.classFilter
  : typeof argv.classFilter === "string"
  ? [argv.classFilter]
  : [];

const idFilters = Array.isArray(argv.idFilter)
  ? argv.idFilter
  : typeof argv.idFilter === "string"
  ? [argv.idFilter]
  : [];

const elementFilters = Array.isArray(argv.elementFilter)
  ? argv.elementFilter
  : typeof argv.elementFilter === "string"
  ? [argv.elementFilter]
  : [];

const jsonFilters = Array.isArray(argv.jsonFilter)
  ? argv.jsonFilter
  : typeof argv.jsonFilter === "string"
  ? [argv.jsonFilter]
  : [];

info("--- wpdl ---");
info(`Starting to scrape ${chalk.blue(argv.url)}`);

if (argv.clean) {
  await cleanDir(dataDir);
}

await scrapePosts({
  apiUrl,
  dataDir,
  classFilters,
  idFilters,
  elementFilters,
  jsonFilters,
});

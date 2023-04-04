#!/usr/bin/env node
import chalk from "chalk";
import process from "node:process";
import { hideBin } from "yargs/helpers";
import yargs from "yargs/yargs";
import { scrapeMedia } from "./scrapers/media.js";
import { scrapePages } from "./scrapers/pages.js";
import { scrapePosts } from "./scrapers/posts.js";
import { cleanDir, createDir } from "./utils/fs.js";
import { error, info } from "./utils/log.js";
import { getSiteNameFromUrl, isValidUrl } from "./utils/url.js";

const argv = yargs(hideBin(process.argv))
  .usage(
    "Usage: npm run scrape -- --url https://your-wp-instance.com [options]"
  )
  .option("url", {
    alias: "u",
    type: "string",
    description: "Root URL of the WordPress instance to scrape",
  })
  .option("pages", {
    type: "boolean",
    description: "Scrape pages",
  })
  .option("posts", {
    type: "boolean",
    description: "Scrape posts",
  })
  .option("media", {
    type: "boolean",
    description: "Scrape media",
  })
  .option("targetDir", {
    alias: "t",
    type: "string",
    description: "Directory where scraped data is saved to",
    default: "./data",
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
  .option("removeAttribute", {
    type: "string",
    description: "Remove given attribute from all HTML elements",
  })
  .option("removeAllAttributes", {
    type: "boolean",
    description: "Remove all attributes from all HTML elements",
  })
  .option("removeEmptyElements", {
    type: "boolean",
    description: "Remove HTML elements that doesn't have text content",
  })
  .option("limitPages", {
    type: "number",
    description: "Limit number of pages (per content type) to scrape",
  })
  .option("clean", {
    alias: "c",
    type: "boolean",
    description: "Clean target directory before scraping",
  })
  .demandOption(["url"])
  .alias("h", "help")
  .alias("v", "version")
  .parse();

if (!isValidUrl(argv.url)) {
  error(`${chalk.blue(argv.url)} is not a valid URL`);
  process.exit(1);
}

const apiUrl = `${argv.url}/wp-json/wp/v2`;

const siteName = getSiteNameFromUrl(argv.url);

const targetDir = String(
  argv.targetDir.substring(argv.targetDir.length - 1) === "/"
    ? argv.targetDir.slice(0, -1)
    : argv.targetDir
);

const dataDir = `${targetDir}/${siteName}`;

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

const removeAttributes = Array.isArray(argv.removeAttribute)
  ? argv.removeAttribute
  : typeof argv.removeAttribute === "string"
  ? [argv.removeAttribute]
  : [];

info("--- wpdl ---", true);
info(`Starting to scrape ${chalk.blue(argv.url)}`, true);

if (argv.clean) {
  await cleanDir(targetDir);
}

await createDir(dataDir);

if (argv.pages) {
  await scrapePages({
    apiUrl,
    dataDir,
    classFilters,
    idFilters,
    elementFilters,
    jsonFilters,
    removeAttributes,
    removeAllAttributes: argv.removeAllAttributes,
    removeEmptyElements: argv.removeEmptyElements,
    limitPages: argv.limitPages,
  });
}

if (argv.posts) {
  await scrapePosts({
    apiUrl,
    dataDir,
    classFilters,
    idFilters,
    elementFilters,
    jsonFilters,
    removeAttributes,
    removeAllAttributes: argv.removeAllAttributes,
    removeEmptyElements: argv.removeEmptyElements,
    limitPages: argv.limitPages,
  });
}

if (argv.media) {
  await scrapeMedia({
    apiUrl,
    dataDir,
    jsonFilters,
    limitPages: argv.limitPages,
  });
}
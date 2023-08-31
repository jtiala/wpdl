import chalk from "chalk";
import process from "node:process";
import { hideBin } from "yargs/helpers";
import yargs from "yargs/yargs";
import { scrapeCategories } from "./scrapers/categories";
import { scrapeComments } from "./scrapers/comments";
import { scrapeMedia } from "./scrapers/media";
import { scrapePages } from "./scrapers/pages";
import { scrapePosts } from "./scrapers/posts";
import { scrapeTags } from "./scrapers/tags";
import { scrapeUsers } from "./scrapers/users";
import { cleanDir, createDir } from "./utils/fs";
import { error, info } from "./utils/log";
import { getSiteNameFromUrl, isValidUrl } from "./utils/url";
import { isWpApiAccessible } from "./utils/wpapi";

const argv = yargs(hideBin(process.argv))
  .usage("Usage: npx wpdl --url https://your-wp-instance.com [options]")
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
  .option("comments", {
    type: "boolean",
    description: "Scrape comments",
  })
  .option("media", {
    type: "boolean",
    description: "Scrape media",
  })
  .option("tags", {
    type: "boolean",
    description: "Scrape tags",
  })
  .option("categories", {
    type: "boolean",
    description: "Scrape categories",
  })
  .option("users", {
    type: "boolean",
    description: "Scrape users",
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
  .option("order", {
    type: "string",
    choices: ["asc", "desc"],
    default: "desc",
    description:
      "Fetch items in ascending or descending order. The items are ordered by date (when available) or name.",
  })
  .option("limitItems", {
    type: "number",
    description: "Limit number of items (per content type) to scrape.",
  })
  .option("clean", {
    alias: "c",
    type: "boolean",
    description: "Clean target directory before scraping",
  })
  .demandOption(["url"])
  .alias("h", "help")
  .alias("v", "version")
  .parseSync();

if (!isValidUrl(argv.url)) {
  error(`${chalk.blue(argv.url)} is not a valid URL`);
  process.exit(1);
}

if (!(await isWpApiAccessible(argv.url))) {
  error(
    `${chalk.blue(
      argv.url,
    )} is not accessible, is not a WordPress instance or the WordPress Rest API v2 is not enabled.`,
  );
  process.exit(1);
}

const apiUrl = `${argv.url}/wp-json/wp/v2`;

const siteName = getSiteNameFromUrl(argv.url);

const targetDir = String(
  argv.targetDir.substring(argv.targetDir.length - 1) === "/"
    ? argv.targetDir.slice(0, -1)
    : argv.targetDir,
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
info(`Starting to scrape ${chalk.blue(argv.url)} ...`, true);

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
    order: argv.order,
    limitItems: argv.limitItems,
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
    order: argv.order,
    limitItems: argv.limitItems,
  });
}

if (argv.comments) {
  await scrapeComments({
    apiUrl,
    dataDir,
    classFilters,
    idFilters,
    elementFilters,
    jsonFilters,
    removeAttributes,
    removeAllAttributes: argv.removeAllAttributes,
    removeEmptyElements: argv.removeEmptyElements,
    order: argv.order,
    limitItems: argv.limitItems,
  });
}

if (argv.media) {
  await scrapeMedia({
    apiUrl,
    dataDir,
    jsonFilters,
    order: argv.order,
    limitItems: argv.limitItems,
  });
}

if (argv.tags) {
  await scrapeTags({
    apiUrl,
    dataDir,
    jsonFilters,
    order: argv.order,
    limitItems: argv.limitItems,
  });
}

if (argv.categories) {
  await scrapeCategories({
    apiUrl,
    dataDir,
    jsonFilters,
    order: argv.order,
    limitItems: argv.limitItems,
  });
}

if (argv.users) {
  await scrapeUsers({
    apiUrl,
    dataDir,
    jsonFilters,
    order: argv.order,
    limitItems: argv.limitItems,
  });
}

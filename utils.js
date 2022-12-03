import chalk from "chalk";
import { mkdir, rm } from "fs/promises";
import jsdom from "jsdom";
import prettier from "prettier";

export const info = (message) => console.log(chalk.cyan(message) + "\n");
export const success = (message) => console.log(chalk.green(message) + "\n");
export const error = (message) => console.log(chalk.red(message) + "\n");

export const isValidUrl = (string) => {
  try {
    new URL(string);
    return true;
  } catch (e) {
    return false;
  }
};

export function formatObjectAsJson(object) {
  return prettier.format(JSON.stringify(object), { parser: "json" });
}

export function formatStringAsHtml(string) {
  return prettier.format(string, { parser: "html" });
}

export function filterHtml(htmlString, { classFilters, idFilters }) {
  const dom = new jsdom.JSDOM(htmlString);

  for (const filter of classFilters) {
    dom.window.document
      .querySelectorAll(`.${filter}`)
      .forEach((e) => e.remove());
  }

  for (const filter of idFilters) {
    dom.window.document
      .querySelectorAll(`#${filter}`)
      .forEach((e) => e.remove());
  }

  return dom.serialize();
}

export function filterJSON(json, jsonFilters) {
  const removeKeys = jsonFilters.filter((filter) => !filter.endsWith("*"));
  const removeStartingWith = jsonFilters
    .filter((filter) => filter.endsWith("*"))
    .map((filter) => filter.slice(0, -1));

  return Object.keys(json)
    .filter(
      (key) =>
        !(
          removeKeys.includes(key) ||
          removeStartingWith.some((removeKey) => key.startsWith(removeKey))
        )
    )
    .reduce((filteredJson, key) => ({ ...filteredJson, [key]: json[key] }), {});
}

export async function cleanDir(dir, recreate = true, silent = false) {
  if (!silent) {
    info(`Cleaning ${chalk.blue(dir)} ...`);
  }

  await rm(dir, { recursive: true, force: true });

  if (recreate) {
    await mkdir(dir, { recursive: true });
  }

  if (!silent) {
    success("Done.");
  }
}

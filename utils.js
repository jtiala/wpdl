import chalk from "chalk";
import { mkdir, rm } from "fs/promises";
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

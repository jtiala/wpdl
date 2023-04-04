import chalk from "chalk";
import { mkdir, rm } from "fs/promises";
import { info, success } from "./log.js";

export async function cleanDir(dir, recreate = true, silent = false) {
  if (!silent) {
    info(`Cleaning directory ${chalk.blue(dir)} ...`);
  }

  await rm(dir, { recursive: true, force: true });

  if (recreate) {
    await mkdir(dir, { recursive: true });
  }

  if (!silent) {
    success("Done.", true);
  }
}

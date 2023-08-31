import chalk from "chalk";

function formatLogMessage(message: string, newLine = false) {
  return `${message}${newLine ? "\n" : ""}`;
}

export function info(message: string, newLine = false) {
  return console.log(formatLogMessage(chalk.cyan(message), newLine));
}

export function success(message: string, newLine = false) {
  return console.log(formatLogMessage(chalk.green(message), newLine));
}

export function error(message: string, newLine = false) {
  return console.log(formatLogMessage(chalk.red(message), newLine));
}

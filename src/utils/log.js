import chalk from "chalk";

function formatLogMessage(message, newLine = false) {
  return `${message}${newLine ? "\n" : ""}`;
}

export function info(message, newLine = false) {
  return console.log(formatLogMessage(chalk.cyan(message), newLine));
}

export function success(message, newLine = false) {
  return console.log(formatLogMessage(chalk.green(message), newLine));
}

export function error(message, newLine = false) {
  return console.log(formatLogMessage(chalk.red(message), newLine));
}

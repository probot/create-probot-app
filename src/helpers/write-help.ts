import chalk from "chalk";
import path from "path";

export const green = chalk.green;
export const blue = chalk.blue;
export const red = chalk.red;
export const yellow = chalk.yellow;
export const bold = chalk.bold;

const helpLines = [
  "",
  `Argument ${blue("<destination>")} is required.`,
  "",
  "Example:",
  `  ${green("create-probot-app")} ${blue("my-first-app")}`,
  "",
  `Run ${green("create-probot-app")} --help to see all options.`,
];

function writeHelp(): void {
  helpLines.forEach((line) => {
    console.log(`  ${line}`);
  });
}

export function printSuccess(appName: string, destination: string) {
  console.log(`
Successfully created ${blue(appName)}.

Begin using your app with:

  ${green("cd")} ${path.relative(process.cwd(), destination)}
  npm start

Refer to your app's README for more usage instructions.

Visit the Probot docs
  https://probot.github.io/docs/

Get help from the community:
  https://probot.github.io/community/

${green("Enjoy building your Probot app!")}`);
}

export function printHelpAndFail(): void {
  console.log(
    `${green("create-probot-app")} [options] ${blue("<destination>")} `
  );
  writeHelp();
  process.exit(1);
}

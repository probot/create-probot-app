#!/usr/bin/env node

// TODO: Sort imports
import fs from "fs-extra";
import path from "path";
import chalk from "chalk";
import commander from "commander";
import kebabCase from "lodash.kebabcase";
import inquirer, { Answers, Question, QuestionCollection } from "inquirer";
import validatePackageName from "validate-npm-package-name";
import { guessEmail, guessAuthor, guessGitHubUsername } from "conjecture";
import { generate } from "egad";
import { sync as spawnSync } from "cross-spawn";

import jsesc from "jsesc";
import camelCase from "lodash.camelcase";
import stringifyAuthor from "stringify-author";

import { initGit } from "./helpers/init-git";
import writeHelp from "./helpers/write-help";

// TSC mangles output directory when using normal import methods for
// package.json. See
// https://github.com/Microsoft/TypeScript/issues/24715#issuecomment-542490675
const pkg = require(require.resolve("../package.json"));

/**
 * Partially sanitizes keys by escaping double-quotes.
 *
 * @param {Object} object The object to mutate.
 * @param {String[]} keys The keys on `object` to sanitize.
 */
function sanitizeBy(
  object: {
    [key: string]: string;
  },
  keys: string[]
): void {
  keys.forEach((key) => {
    if (key in object) {
      object[key] = jsesc(object[key], {
        minimal: true,
        quotes: "double",
      });
    }
  });
}

/**
 * Main program logic:
 *
 * - parse CLI arguments
 * - prompt user for (missing) required data
 * - create scaffolding for new Probot app using Handlebars files under template/ as source
 * - initialize Git repo in new "destination" folder
 * - install Probot dependencies, build app if TypeScript based
 */
async function main(): Promise<void> {
  let destination = "";

  const templatePath = path.join(__dirname, "/../templates/");
  const templates = fs
    .readdirSync(templatePath)
    .filter((path) => path.substr(0, 2) !== "__");

  const program = new commander.Command("create-probot-app")
    .arguments("[destination]")
    .action((dest) => {
      if (dest) {
        destination = path.isAbsolute(dest)
          ? dest
          : path.resolve(process.cwd(), dest);
      }
    })
    .usage("[options] <destination>")
    .option("-n, --appName <app-name>", "App name")
    .option('-d, --desc "<description>"', "Description (contain in quotes)")
    .option('-a, --author "<full-name>"', "Author name (contain in quotes)")
    .option("-e, --email <email>", "Author email address")
    .option("-u, --user <username>", "GitHub username or org (repo owner)")
    .option("-r, --repo <repo-name>", "Repository name")
    .option("--overwrite", "Overwrite existing files", false)
    .option("-t, --template <template>", "Name of use case template")
    .option("--show-templates", "Print list of available templates and exit")
    .version(`Create Probot App v${pkg.version}`);

  program.parse(process.argv);

  if (program.showTemplates) {
    templates.forEach((template) => console.log(template));
    process.exit();
  }

  if (!destination) {
    console.log(
      `${chalk.green("create-probot-app")} [options] ${chalk.blue(
        "<destination>"
      )} `
    );
    writeHelp();
    process.exit(1);
  }

  type QuestionI =
    | (
        | {
            default?(answers: Answers): string | boolean;
          }
        | Question
      )
    | QuestionCollection;

  const questions: QuestionI[] = [
    {
      type: "input",
      name: "appName",
      default(answers): string {
        return answers.repo || kebabCase(path.basename(destination));
      },
      message: "App name:",
      when: !program.appName,
      validate(appName): true | string {
        const result = validatePackageName(appName);
        if (result.errors && result.errors.length > 0) {
          return result.errors.join(",");
        }

        return true;
      },
    },
    {
      type: "input",
      name: "description",
      default(): string {
        return "A Probot app";
      },
      message: "Description of app:",
      when: !program.desc,
    },
    {
      type: "input",
      name: "author",
      default(): string {
        return guessAuthor();
      },
      message: "Author's full name:",
      when: !program.author,
    },
    {
      type: "input",
      name: "email",
      default(): Promise<string | void> {
        return guessEmail();
      },
      message: "Author's email address:",
      when: !program.email,
    },
    {
      type: "input",
      name: "user",
      default(answers): Promise<string | void> {
        return guessGitHubUsername(answers.email);
      },
      message: "GitHub user or org name:",
      when: !program.user,
    },
    {
      type: "input",
      name: "repo",
      default(answers): string {
        return answers.appName || kebabCase(path.basename(destination));
      },
      message: "Repository name:",
      when: !program.repo,
    },
    {
      type: "list",
      name: "template",
      choices: templates,
      message: "Which template would you like to use?",
      when(): boolean {
        if (templates.includes(program.template)) {
          return false;
        }
        if (program.template) {
          console.log(
            chalk.red(
              `The template ${chalk.blue(program.template)} does not exist.`
            )
          );
        }
        return true;
      },
    },
  ];

  console.log(
    "\nLet's create a Probot app!\nHit enter to accept the suggestion.\n"
  );

  const answers = await inquirer.prompt(questions);
  answers.author = stringifyAuthor({
    name: program.author || answers.author,
    email: program.email || answers.email,
  });
  answers.template = answers.template || program.template;
  answers.toBuild = answers.template.slice(-3) === "-ts";
  answers.year = new Date().getFullYear();
  answers.camelCaseAppName = camelCase(program.appName || answers.appName);
  answers.appName = program.appName || answers.appName;
  answers.description = program.desc || answers.description;
  answers.user = answers.owner = program.user || answers.user;
  answers.repo = program.repo || answers.repo;
  // TODO: clean that up into nicer object combining

  sanitizeBy(answers, ["author", "description"]);

  // Prepare template folder Handlebars source content merging `templates/__common__` and `templates/<answers.template>`
  const tempDestPath = fs.mkdtempSync("__create_probot_app__");
  [
    path.join(templatePath, "__common__"),
    path.join(templatePath, answers.template),
  ].forEach((source) => fs.copySync(source, tempDestPath));

  const generateResult = await generate(tempDestPath, destination, answers, {
    overwrite: Boolean(program.overwrite),
  });

  fs.removeSync(tempDestPath);

  generateResult.forEach((fileInfo) => {
    // Edge case: Because create-probot-app is idempotent, if a file is named
    // gitignore in the initializing directory, no .gitignore file will be
    // created.
    if (
      fileInfo.skipped === false &&
      path.basename(fileInfo.path) === "gitignore"
    ) {
      try {
        const gitignorePath = path.join(
          path.dirname(fileInfo.path),
          ".gitignore"
        );

        if (fs.existsSync(gitignorePath)) {
          const data = fs.readFileSync(fileInfo.path, { encoding: "utf8" });
          fs.appendFileSync(gitignorePath, data);
          fs.unlinkSync(fileInfo.path);
        } else {
          fs.renameSync(fileInfo.path, gitignorePath);
        }
        fileInfo.path = gitignorePath;
      } catch (err) {
        throw err;
      }
    }

    console.log(
      `${
        fileInfo.skipped
          ? chalk.yellow("skipped existing file")
          : chalk.green("created file")
      }: ${fileInfo.path}`
    );
  });

  console.log("\nFinished scaffolding files!");

  if (await initGit(destination)) {
    console.log("\nInitialized a Git repository.");
  }

  console.log("\nInstalling dependencies. This may take a few minutes...\n");
  const install = spawnSync("npm", ["install"], {
    cwd: destination,
    stdio: "inherit",
  });

  if (install.status !== 0) {
    console.log(
      chalk.red(
        `Could not install npm dependencies. Try running ${chalk.bold(
          "npm install"
        )} yourself.`
      )
    );
    process.exit(install.status || 1);
  }

  if (answers.toBuild) {
    console.log("\nCompile application...\n");
    const install = spawnSync("npm", ["run", "build"], {
      cwd: destination,
      stdio: "inherit",
    });
  }

  console.log(`
Successfully created ${chalk.blue(answers.appName)}.

Begin using your app with:

  ${chalk.green("cd")} ${path.relative(process.cwd(), destination)}
  npm start

Refer to your app's README for more usage instructions.

Visit the Probot docs
  https://probot.github.io/docs/

Get help from the community:
  https://probot.github.io/community/

${chalk.green("Enjoy building your Probot app!")}`);
}

main();

import path from "path";

import { guessEmail, guessAuthor, guessGitHubUsername } from "conjecture";
import camelCase from "lodash.camelcase";
import commander from "commander";
import inquirer, { Answers, Question, QuestionCollection } from "inquirer";
import jsesc from "jsesc";
import kebabCase from "lodash.kebabcase";
import stringifyAuthor from "stringify-author";
import validatePackageName from "validate-npm-package-name";

import { blue, red, printHelpAndFail } from "./write-help";
import { getTemplates, ensureValidDestination } from "./filesystem";

const templateDelimiter = " => ";

type QuestionI =
  | (
      | {
          default?(answers: Answers): string | boolean;
        }
      | Question
    )
  | QuestionCollection;

interface CliConfig {
  destination: string;
  gitInit: boolean;
  overwrite: boolean;
  appName?: string;
  author?: string;
  description?: string;
  email?: string;
  repo?: string;
  template?: string;
  user?: string;
}

export interface Config extends CliConfig, Answers {
  appName: string;
  camelCaseAppName: string;
  description: string;
  template: string;
  toBuild: boolean;
  year: number;
  owner?: string;
}

/**
 * Partially sanitizes keys by escaping double-quotes.
 *
 * @param {Object} object The object to mutate.
 * @param {String[]} keys The keys on `object` to sanitize.
 */
function sanitizeBy(object: Config, keys: string[]): void {
  keys.forEach((key) => {
    if (key in object) {
      object[key] = jsesc(object[key], {
        minimal: true,
        quotes: "double",
      });
    }
  });
}

function getQuestions(config: CliConfig): QuestionI[] {
  const templates = getTemplates();

  const questions: QuestionI[] = [
    {
      type: "input",
      name: "appName",
      default(answers): string {
        return answers.repo || kebabCase(path.basename(config.destination));
      },
      message: "App name:",
      when: !config.appName,
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
      when: !config.description,
    },
    {
      type: "input",
      name: "author",
      default(): string {
        return guessAuthor();
      },
      message: "Author's full name:",
      when: !config.author,
    },
    {
      type: "input",
      name: "email",
      default(): Promise<string | void> {
        return guessEmail();
      },
      message: "Author's email address:",
      when: config.gitInit && !config.email,
    },
    {
      type: "input",
      name: "user",
      default(answers): Promise<string | void> {
        return guessGitHubUsername(answers.email);
      },
      message: "GitHub user or org name:",
      when: config.gitInit && !config.user,
    },
    {
      type: "input",
      name: "repo",
      default(answers): string {
        return answers.appName || kebabCase(path.basename(config.destination));
      },
      message: "Repository name:",
      when: config.gitInit && !config.repo,
    },
    {
      type: "list",
      name: "template",
      choices: templates.map(
        (template) =>
          `${template.name}${templateDelimiter}${template.description}`
      ),
      message: "Which template would you like to use?",
      when(): boolean {
        if (config.template) {
          if (templates.find((template) => template.name === config.template)) {
            return false;
          }
          console.log(
            red(`The template ${blue(config.template)} does not exist.`)
          );
        }
        return true;
      },
    },
  ];

  return questions;
}

/**
 * Prompt the user for mandatory options not set via CLI
 *
 * @param config Configuration data already set via CLI options
 *
 * @returns the merged configuration options from CLI and user prompt
 */
export async function askUser(config: CliConfig): Promise<Config> {
  console.log(
    "\nLet's create a Probot app!\nHit enter to accept the suggestion.\n"
  );

  const answers = {
    ...config,
    ...((await inquirer.prompt(getQuestions(config))) as Config),
  };

  // enrich with (meta)data + sanitize input
  answers.author = stringifyAuthor({
    name: answers.author,
    email: answers.email,
  });
  answers.toBuild = answers.template.slice(-3) === "-ts";
  answers.year = new Date().getFullYear();
  answers.camelCaseAppName = camelCase(config.appName || answers.appName);
  answers.owner = answers.user;
  answers.template = answers.template.split(templateDelimiter)[0]; // remove eventual description
  sanitizeBy(answers, ["author", "description"]);

  return answers;
}

/**
 * Run CLI manager to parse user provided options and arguments
 *
 * @returns resolves with the configuration options set via CLI
 */
export async function runCliManager(): Promise<CliConfig> {
  let destination: string = "";

  // TSC mangles output directory when using normal import methods for
  // package.json. See
  // https://github.com/Microsoft/TypeScript/issues/24715#issuecomment-542490675
  const pkg = require(require.resolve("../../package.json"));

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
    .option("--no-git-init", "Skip Git repository initialization", false)
    .version(`Create Probot App v${pkg.version}`);

  const options = program.parse(process.argv).opts();

  if (options.showTemplates) {
    getTemplates().forEach((template) => console.log(template.name));
    process.exit();
  }

  if (!destination) printHelpAndFail();
  ensureValidDestination(destination, options.overwrite);

  return {
    appName: options.appName,
    author: options.author,
    description: options.desc,
    destination: destination,
    email: options.email,
    gitInit: options.gitInit,
    overwrite: options.overwrite,
    repo: options.repo,
    template: options.template,
    user: options.user,
  };
}

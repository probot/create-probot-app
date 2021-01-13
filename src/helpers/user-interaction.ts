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
import { getTemplates, templatesSourcePath } from "./filesystem";

type QuestionI =
  | (
      | {
          default?(answers: Answers): string | boolean;
        }
      | Question
    )
  | QuestionCollection;

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

function getQuestions(
  program: commander.Command,
  destination: string
): QuestionI[] {
  const templates = getTemplates();

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
      when: program.gitInit && !program.email,
    },
    {
      type: "input",
      name: "user",
      default(answers): Promise<string | void> {
        return guessGitHubUsername(answers.email);
      },
      message: "GitHub user or org name:",
      when: program.gitInit && !program.user,
    },
    {
      type: "input",
      name: "repo",
      default(answers): string {
        return answers.appName || kebabCase(path.basename(destination));
      },
      message: "Repository name:",
      when: program.gitInit && !program.repo,
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
            red(`The template ${blue(program.template)} does not exist.`)
          );
        }
        return true;
      },
    },
  ];

  return questions;
}

export async function getAnswers(
  program: commander.Command,
  destination: string
): Promise<Answers> {
  console.log(
    "\nLet's create a Probot app!\nHit enter to accept the suggestion.\n"
  );

  const answers = await inquirer.prompt(getQuestions(program, destination));
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

  return answers;
}

export function getProgram(): commander.Command {
  let destination = "";

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

  program.parse(process.argv);

  if (!destination) printHelpAndFail();
  if (program.showTemplates) {
    getTemplates().forEach((template) => console.log(template));
    process.exit();
  }

  // XXX: most probably there's a better way to access [destination] Commander argument
  program.destination = destination;

  return program;
}

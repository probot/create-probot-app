#!/usr/bin/env node

// TODO: Sort imports
import fs from 'fs'
import path from 'path'
import chalk from 'chalk'
import commander from 'commander'
import kebabCase from 'lodash.kebabcase'
import inquirer, { Answers, Question, QuestionCollection } from 'inquirer'
import validatePackageName from 'validate-npm-package-name'
import { guessEmail, guessAuthor, guessGitHubUsername } from 'conjecture'
import { generate } from 'egad'
import { sync as spawnSync } from 'cross-spawn'

import jsesc from 'jsesc'
import camelCase from 'lodash.camelcase'
import stringifyAuthor from 'stringify-author'

/**
 * Partially sanitizes keys by escaping double-quotes.
 *
 * @param {Object} object The object to mutate.
 * @param {String[]} keys The keys on `object` to sanitize.
 */
function sanitizeBy(object: {
  [key: string]: string
}, keys: string[]) {
  keys.forEach(key => {
    if (key in object) {
      object[key] = jsesc(object[key], {
        quotes: 'double'
      })
    }
  })
}

// TODO: Remove `homepage` option. Since this doesn't have a generated default,
// I can't imagine anyone is supplying it through create-probot-app tool.

// TODO:BUG: appName handlebar not being set in template/package.json when
// supplied with --appName via CLI.

async function main() {
  // TODO: Update check with update-notifier or update-check
  const program = new commander.Command('create-probot-app')
    .usage('[options] [destination]')
    .option('-n, --appName <app-name>', 'App name')
    .option('-d, --desc "<description>"',
      'Description (contain in quotes)')
    .option('-a, --author "<full-name>"',
      'Author name (contain in quotes)')
    .option('-e, --email <email>', 'Author email address')
    .option('-h, --homepage <homepage>', 'Author\'s homepage')
    .option('-u, --user <username>', 'GitHub username or org (repo owner)')
    .option('-r, --repo <repo-name>', 'Repository name')
    .option('--overwrite', 'Overwrite existing files', false)
    .option('-t, --template <template>', 'Name of use case template')

  program.parse(process.argv)

  const destination = program.args.length
    ? path.resolve(process.cwd(), program.args.shift()!)
    : process.cwd()

  // TODO: Dynamically set this by getting folders names from templates directory.
  const templates = ['basic-js', 'checks-js', 'git-data-js', 'deploy-js', 'basic-ts']

  type QuestionI = ({
    default? (answers: Answers ): any;
  } | Question ) | QuestionCollection

  const questions: QuestionI[] = [
    {
      type: 'input',
      name: 'appName',
      default (answers) {
        return answers.repo || kebabCase(path.basename(destination))
      },
      message: 'App name:',
      when: !program.appName,
      validate (appName) {
        const result = validatePackageName(appName)
        if (result.errors && result.errors.length > 0) {
          return result.errors.join(',')
        }

        return true
      }
    },
    {
      type: 'input',
      name: 'description',
      default () {
        return 'A Probot app'
      },
      message: 'Description of app:',
      when: !program.desc
    },
    {
      type: 'input',
      name: 'author',
      default () {
        return guessAuthor()
      },
      message: 'Author\'s full name:',
      when: !program.author
    },
    {
      type: 'input',
      name: 'email',
      default () {
        return guessEmail()
      },
      message: 'Author\'s email address:',
      when: !program.email
    },
    {
      type: 'input',
      name: 'homepage',
      message: 'Homepage:',
      when: !program.homepage
    },
    {
      type: 'input',
      name: 'user',
      default (answers) {
        return guessGitHubUsername(answers.email)
      },
      message: 'GitHub user or org name:',
      when: !program.user
    },
    {
      type: 'input',
      name: 'repo',
      default (answers) {
        return answers.appName || kebabCase(path.basename(destination))
      },
      message: 'Repository name:',
      when: !program.repo
    },
    {
      type: 'list',
      name: 'template',
      choices: templates,
      message: 'Which template would you like to use?',
      when () {
        if (templates.includes(program.template)) {
          return false
        }
        if (program.template) {
          console.log(chalk.red(`The template ${chalk.blue(program.template)} does not exist.`))
        }
        return true
      }
    }
  ]

  console.log(chalk.blue('\nLet\'s create a Probot app!\nHit enter to accept the suggestion.\n'))

  const answers = await inquirer.prompt(questions)
  answers.author = stringifyAuthor({
    name: program.author || answers.author,
    email: program.email || answers.email,
    url: program.homepage || answers.homepage
  })

  answers.template = answers.template || program.template
  answers.year = new Date().getFullYear()
  answers.camelCaseAppName = camelCase(program.appName || answers.appName)
  answers.appName = program.appName || answers.appName
  answers.description = program.desc || answers.description
  answers.user = program.user || answers.user
  answers.repo = program.repo || answers.repo
  // TODO: clean that up into nicer object combining

  sanitizeBy(answers, ['author', 'description'])

  const relativePath = path.join(__dirname, '/../templates/', answers.template)
  const generateResult = await generate(relativePath, destination, answers, {
    overwrite: Boolean(program.overwrite)
  })

  generateResult.forEach(fileInfo => {
    // Edge case: Because create-probot-app is idempotent, if a file is named
    // gitignore in the initializing directory, no .gitignore file will be
    // created.
    if (fileInfo.skipped === false &&
      path.basename(fileInfo.path) === 'gitignore'
    ) {
      try {
        const gitignorePath = path.join(path.dirname(fileInfo.path), '.gitignore')

        if (fs.existsSync(gitignorePath)) {
          const data = fs.readFileSync(fileInfo.path, { encoding: 'utf8' })
          fs.appendFileSync(gitignorePath, data)
          fs.unlinkSync(fileInfo.path)
        } else {
          fs.renameSync(fileInfo.path, gitignorePath)
        }
        fileInfo.path = gitignorePath
      } catch (err) {
        throw err
      }
    }

    console.log(`${fileInfo.skipped ? chalk.yellow('skipped existing file')
      : chalk.green('created file')}: ${fileInfo.path}`)
  })

  // TODO: Merge #84

  console.log(chalk.blue('Finished scaffolding files!'))

  const install = spawnSync('npm', ['install'], {
    cwd: destination,
    stdio: 'inherit'
  })

  if (install.status !== 0) {
    console.log(chalk.red(`Could not install npm dependencies. Try running ${chalk.bold('npm install')} yourself.`))
    process.exit(install.status || 1)
  }

  console.log(chalk.blue('\nDone! Enjoy building your Probot app!'))
  // TODO: Include links to Probot documentation
}

main()

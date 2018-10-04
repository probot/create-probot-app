#!/usr/bin/env node

'use strict'

const path = require('path')
const inquirer = require('inquirer')
const program = require('commander')
const {generate} = require('egad')
const kebabCase = require('lodash.kebabcase')
const camelCase = require('lodash.camelcase')
const chalk = require('chalk')
const spawn = require('cross-spawn')
const stringifyAuthor = require('stringify-author')
const {guessEmail, guessAuthor, guessGitHubUsername} = require('conjecture')
const validatePackageName = require('validate-npm-package-name')

const DEFAULT_TEMPLATE = 'https://github.com/probot/template.git'

program
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
  .option('-b, --branch <branch-name>', 'Specify a branch', 'master')
  .option('--overwrite', 'Overwrite existing files', false)
  .option('--template <template>', 'Name of use case template', 'basic-js')
  .parse(process.argv)

const destination = program.args.length
  ? path.resolve(process.cwd(), program.args.shift())
  : process.cwd()

const prompts = [
  {
    type: 'input',
    name: 'name',
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
    name: 'owner',
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
    type: 'input',
    name: 'template',
    default (answers) {
      return 'basic-js'
    },
    message: 'Use Case Templates (basic-js, basic-ts, checks-js, git-data-js):',
    validate (template) {
      const acceptedTemplates = ['basic-js', 'checks-js', 'git-data-js', 'basic-ts']
      if (!acceptedTemplates.includes(template)) {
        return 'Please use an existing use case template.'
      }
      return true
    }
  }
]

console.log(chalk.blue('Let\'s create a Probot app!'))

inquirer.prompt(prompts)
  .then(answers => {
    answers.author = stringifyAuthor({
      name: answers.author,
      email: answers.email,
      url: answers.homepage
    })
    answers.year = new Date().getFullYear()
    answers.camelCaseAppName = camelCase(answers.appName)

    const relativePath = path.join(__dirname, '/../templates/', answers.template)
    return generate(relativePath, destination, answers, {
      overwrite: Boolean(program.overwrite)
    })
  })
  .then(results => {
    results.forEach(fileinfo => {
      console.log(`${fileinfo.skipped ? chalk.yellow('skipped existing file')
        : chalk.green('created file')}: ${fileinfo.path}`)
    })
    return console.log(chalk.blue('Finished scaffolding files!'))
  })
  .then(() => {
    console.log(chalk.blue('\nInstalling Node dependencies!'))
    const child = spawn('npm', ['install', '--prefix', destination], {stdio: 'inherit'})
    child.on('close', code => {
      if (code !== 0) {
        console.log(chalk.red(`Could not install npm dependencies. Try running ${chalk.bold('npm install')} yourself.`))
        return
      }
      console.log(chalk.blue('\nDone! Enjoy building your Probot app!'))
    })
  })

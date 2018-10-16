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
  .option('--overwrite', 'Overwrite existing files', false)
  .option('-t, --template <template>', 'Name of use case template')
  .parse(process.argv)

const destination = program.args.length
  ? path.resolve(process.cwd(), program.args.shift())
  : process.cwd()

const prompts = [
  {
    type: 'input',
    name: 'name',
    default (answers) {
      return program.appName || answers.repo || kebabCase(path.basename(destination))
    },
    message: 'App name:',
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
      return program.desc || 'A Probot app'
    },
    message: 'Description of app:'
  },
  {
    type: 'input',
    name: 'author',
    default () {
      return program.author || guessAuthor()
    },
    message: 'Author\'s full name:'
  },
  {
    type: 'input',
    name: 'email',
    default () {
      return program.email || guessEmail()
    },
    message: 'Author\'s email address:'
  },
  {
    type: 'input',
    name: 'homepage',
    default (answers) {
      return program.homepage
    },
    message: 'Homepage:'
  },
  {
    type: 'input',
    name: 'owner',
    default (answers) {
      return program.user || guessGitHubUsername(answers.email)
    },
    message: 'GitHub user or org name:'
  },
  {
    type: 'input',
    name: 'repo',
    default (answers) {
      return program.repo || answers.appName || kebabCase(path.basename(destination))
    },
    message: 'Repository name:'
  },
  {
    type: 'input',
    name: 'template',
    default (answers) {
      return program.template || answers.template || 'basic-js'
    },
    message: 'Use Case Templates (basic-js, basic-ts, checks-js, git-data-js, deploy-js):',
    validate (template) {
      const acceptedTemplates = ['basic-js', 'checks-js', 'git-data-js', 'deploy-js', 'basic-ts']
      if (!acceptedTemplates.includes(template)) {
        return 'Please use an existing use case template.'
      }
      return true
    }
  }
]

console.log(chalk.blue('\nLet\'s create a Probot app!\nHit enter to accept the suggestion.\n'))

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

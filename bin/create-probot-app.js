#!/usr/bin/env node

'use strict'

const fs = require('fs')
const path = require('path')
const inquirer = require('inquirer')
const program = require('commander')
const { generate } = require('egad')
const kebabCase = require('lodash.kebabcase')
const camelCase = require('lodash.camelcase')
const chalk = require('chalk')
const jsesc = require('jsesc')
const spawn = require('cross-spawn')
const stringifyAuthor = require('stringify-author')
const { guessEmail, guessAuthor, guessGitHubUsername } = require('conjecture')
const validatePackageName = require('validate-npm-package-name')

/**
 * Partially sanitizes keys by escaping double-quotes.
 * 
 * @param {Object} object The object to mutate.
 * @param {String[]} keys The keys on `object` to sanitize.
 */
function sanitizeBy(object, keys) {
  keys.forEach(key => {
    if (key in object) {
      object[key] = jsesc(object[key], {
        quotes: 'double'
      })
    }
  })
}

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

const templates = ['basic-js', 'checks-js', 'git-data-js', 'deploy-js', 'basic-ts']

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
    when: !program.template
  }
]

console.log(chalk.blue('\nLet\'s create a Probot app!\nHit enter to accept the suggestion.\n'))

inquirer.prompt(prompts)
  .then(answers => {
    answers.author = stringifyAuthor({
      name: program.author || answers.author,
      email: program.email || answers.email,
      url: program.homepage || answers.homepage
    })
    answers.year = new Date().getFullYear()
    answers.camelCaseAppName = camelCase(program.appName || answers.appName)
    answers.template = program.template || answers.template
    answers.appName = program.appName || answers.appName
    answers.desc = program.desc || answers.desc
    answers.user = program.user || answers.user
    answers.repo = program.repo || answers.repo
    answers.template = program.template || answers.template

    // TODO: clean that up into nicer object combinging
    
    sanitizeBy(answers, ['author', 'description'])

    if (!templates.includes(answers.template)) {
      console.log(chalk.red(`Please use an existing use case template: ${templates.join(', ')}`))
      process.exit(1)
    }

    const relativePath = path.join(__dirname, '/../templates/', answers.template)
    return generate(relativePath, destination, answers, {
      overwrite: Boolean(program.overwrite)
    })
  })
  .then(results => {
    results.forEach(fileinfo => {
      if (fileinfo.skipped === false &&
        path.basename(fileinfo.path) === 'gitignore'
      ) {
        try {
          const gitignorePath = path.join(path.dirname(fileinfo.path), '.gitignore')

          if (fs.existsSync(gitignorePath)) {
            const data = fs.readFileSync(fileinfo.path, { encoding: 'utf8' })
            fs.appendFileSync(gitignorePath, data)
            fs.unlinkSync(fileinfo.path)
          } else {
            fs.renameSync(fileinfo.path, gitignorePath)
          }

          fileinfo.path = gitignorePath
        } catch (err) {
          throw err
        }
      }

      console.log(`${fileinfo.skipped ? chalk.yellow('skipped existing file')
        : chalk.green('created file')}: ${fileinfo.path}`)
    })
    return console.log(chalk.blue('Finished scaffolding files!'))
  })
  .then(() => {
    console.log(chalk.blue('\nInstalling Node dependencies!'))
    const child = spawn('npm', ['install'], { 
      stdio: 'inherit',
      cwd: destination
    })
    child.on('close', code => {
      if (code !== 0) {
        console.log(chalk.red(`Could not install npm dependencies. Try running ${chalk.bold('npm install')} yourself.`))
        return
      }
      console.log(chalk.blue('\nDone! Enjoy building your Probot app!'))
    })
  })

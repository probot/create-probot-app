import chalk from 'chalk'

const helpLines = [
  '',
  `Argument ${chalk.blue('<destination>')} is required.`,
  '',
  'Example:',
  `  ${chalk.green('create-probot-app')} ${chalk.blue('my-first-app')}`,
  '',
  `Run ${chalk.green('create-probot-app')} --help to see all options.`,
]

function writeHelp(): void {
  helpLines.forEach((line) => {
    console.log(`  ${line}`)
  })
}

export default writeHelp

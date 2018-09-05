/**
 * This is the entry point for your Probot App.
 * @param {import('probot').Application} app - Probot's Application class.
*/

// Checks API example
// See: https://developer.github.com/v3/checks/ to learn more
module.exports = app => {
  app.on(['check_suite.requested', 'check_run.rerequested'], check)

  async function check (context) {
    // Do stuff
    // Probot API note: context.repo() => {username: 'hiimbex', repo: 'testing-things'}
    return context.github.checks.create(context.repo({
      name: 'My app!',
      head_branch: pr.head.ref,
      head_sha: pr.head.sha,
      status: 'completed',
      conclusion: 'success',
      completed_at: new Date(),
      output: {
        title: 'My Check',
        summary: 'The check has passed!'
      }
    }))
  }
}

  // For more information on building apps:
  // https://probot.github.io/docs/

  // To get your app running against GitHub, see:
  // https://probot.github.io/docs/development/
}

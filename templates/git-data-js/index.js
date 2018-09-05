/**
 * This is the entry point for your Probot App.
 * @param {import('probot').Application} app - Probot's Application class.
*/

// Git Data API example
// See: https://developer.github.com/v3/git/ to learn more
module.exports = app => {
  app.on('*', check)

  async function check (context) {
    // Probot API note: context.repo() => {username: 'hiimbex', repo: 'testing-things'}
    // Get current reference in Git
    const reference = await context.github.gitdata.getReference(context.repo({ ref: 'heads/master' }))
    // Create a brnach
    const getBranch = await context.github.gitdata.createReference(context.repo({
      ref: `refs/heads/new-branch`,
      sha: reference.data.object.sha // accesses the sha from the heads/master reference we got
    }))
    // create a cne wfile
    const file = await context.github.repos.createFile(context.repo({
      path: 'path/to/your/file.md', // the path to your config file
      message: 'adds config file', // a commit message
      content: 'My new file is awesome!', //the content of your file
      branch: 'new-branch' // the branch name we used when creating a Git reference
    }))
    return await context.github.pullRequests.create(context.repo({
      title: 'Adding my file!', // the title of the PR
      head: 'new-branch', // the branch our chances are on
      base: 'master', // the branch to which you want to merge your changes
      body: 'Adds my new file!', // the body of your PR,
      maintainer_can_modify: true // allows maintainers to edit your app's PR
    }))
  }
}

  // For more information on building apps:
  // https://probot.github.io/docs/

  // To get your app running against GitHub, see:
  // https://probot.github.io/docs/development/
}

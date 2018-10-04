// Git Data API example
// See: https://developer.github.com/v3/git/ to learn more
module.exports = app => {
  // Let's listen on every new team that gets created and add a file for them.
  app.on('team.created', check)
  async function check (context) {
    // Probot API note: context.repo() => {username: 'hiimbex', repo: 'testing-things'}
    // Get current reference in Git
    const reference = await context.github.gitdata.getReference(context.repo({ ref: 'heads/master' }))
    // Create a branch
    const getBranch = await context.github.gitdata.createReference(context.repo({
      ref: `refs/heads/new-team-${context.payload.team.name}`,
      sha: reference.data.object.sha // accesses the sha from the heads/master reference we got
    }))
    // create a new file
    const file = await context.github.repos.createFile(context.repo({
      path: 'path/to/your/file.md', // the path to your config file
      message: 'adds my team\'s file', // a commit message
      content: `New team incoming! Check out ${context.payload.team.name}!`, //the content of your file
      branch: `new-team-${context.payload.team.name}` // the branch name we used when creating a Git reference
    }))
    // create a PR from that branch with the new file
    return await context.github.pullRequests.create(context.repo({
      title: 'Adding my team\'s file!', // the title of the PR
      head: `new-team-${context.payload.team.name}`, // the branch our chances are on
      base: 'master', // the branch to which you want to merge your changes
      body: 'Adds my teams\'s new file!', // the body of your PR,
      maintainer_can_modify: true // allows maintainers to edit your app's PR
    }))
  }
}

  // For more information on building apps:
  // https://probot.github.io/docs/

  // To get your app running against GitHub, see:
  // https://probot.github.io/docs/development/
}

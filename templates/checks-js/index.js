// Checks API example
// See: https://developer.github.com/v3/checks/ to learn more

/**
 * This is the main entrypoint to your Probot app
 * @param {import('probot').Probot} app
 */
export default (app) => {
  app.on(["check_suite.requested", "check_run.rerequested"], check);

  async function check(context) {
    const startTime = new Date();

    // Do stuff
    const { head_branch: headBranch, head_sha: headSha } =
      context.payload.check_suite;
    // Probot API note: context.repo() => {username: 'hiimbex', repo: 'testing-things'}
    return context.octokit.checks.create(
      context.repo({
        name: "My app!",
        head_branch: headBranch,
        head_sha: headSha,
        status: "completed",
        started_at: startTime,
        conclusion: "success",
        completed_at: new Date(),
        output: {
          title: "Probot check!",
          summary: "The check has passed!",
        },
      }),
    );
  }

  // For more information on building apps:
  // https://probot.github.io/docs/

  // To get your app running against GitHub, see:
  // https://probot.github.io/docs/development/
};

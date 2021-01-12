#!/usr/bin/env node
import { getAnswers, getProgram } from "./helpers/user-interaction";
import { initGit } from "./helpers/init-git";
import { installAndBuild } from "./helpers/run-npm";
import { makeScaffolding } from "./helpers/filesystem";
import { printSuccess, red } from "./helpers/write-help";

function main(): void {
  const program = getProgram();

  const answers = await getAnswers(program, program.destination);
  makeScaffolding(program.destination, answers, program.overwrite)
    .then(async () => {
      if (program.gitInit) await initGit(program.destination);
    })
    .then(() => installAndBuild(program.destination, answers.toBuild))
    .then(() => printSuccess(answers.appName, program.destination))
    .catch((err) => {
      console.log(red(err));
      process.exit(1);
      });
  });
}

main();

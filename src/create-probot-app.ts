#!/usr/bin/env node
import { askUser, runCliManager } from "./helpers/user-interaction";
import { initGit } from "./helpers/init-git";
import { installAndBuild } from "./helpers/run-npm";
import { makeScaffolding } from "./helpers/filesystem";
import { printSuccess, red } from "./helpers/write-help";

async function main(): Promise<void> {
  const config = await askUser(runCliManager());

  makeScaffolding(config)
    .then(async () => {
      if (config.gitInit) await initGit(config.destination);
    })
    .then(() => installAndBuild(config.destination, config.toBuild))
    .then(() => printSuccess(config.appName, config.destination))
    .catch((err) => {
      console.log(red(err));
      process.exit(1);
    });
}

main();

#!/usr/bin/env node
import { askUser, runCliManager } from "./helpers/user-interaction.js";
import { initGit } from "./helpers/init-git.js";
import { installAndBuild } from "./helpers/run-npm.js";
import { makeScaffolding } from "./helpers/filesystem.js";
import { printSuccess, red } from "./helpers/write-help.js";

runCliManager()
  .then((cliConfig) => askUser(cliConfig))
  .then((config) => makeScaffolding(config))
  .then(async (config) => {
    if (config.gitInit) await initGit(config.destination);
    return config;
  })
  .then(async (config) => await installAndBuild(config))
  .then((config) => printSuccess(config.appName, config.destination))
  .catch((err) => {
    console.log(red(err));
    process.exit(1);
  });

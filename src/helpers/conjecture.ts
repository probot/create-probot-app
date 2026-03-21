import { exec } from "node:child_process";
import githubUsername from "github-username";
import { username } from "username";
import fullName from "fullname";

import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import parse from "parse-git-config";
import extend from "extend-shallow";



/*!
 * git-user-name <https://github.com/jonschlinkert/git-user-name>
 *
 * Copyright (c) 2014-2017, Jon Schlinkert.
 * Released under the MIT License.
 */
function gitUserName(options: { path?: string; gitconfig?: any }) {
  let gc = gitConfigPath(
    extend({ type: "global" }, options && options.gitconfig),
  );

  options = extend({ cwd: "/", path: gc }, options);

  let config = parse.sync(options) || {};

  return config.user ? config.user.name : null;
}

/*!
 * git-user-email <https://github.com/jonschlinkert/git-user-email>
 *
 * Copyright (c) 2014-2015, Jon Schlinkert.
 * Licensed under the MIT License.
 */
function gitEmail(opts: { path: string | null }) {
  opts = extend({ cwd: "/", path: gitConfigPath() }, opts);
  let config = parse.sync(opts);
  if (typeof config === "object" && config.hasOwnProperty("user")) {
    return config.user.email;
  }
  return null;
}

/*!

 * git-config-path <https://github.com/jonschlinkert/git-config-path>
 *
 * Copyright (c) 2015-present, Jon Schlinkert.
 * Licensed under the MIT License.
 */
function gitConfigPath(): string | null;
function gitConfigPath(type: string): string | null;
function gitConfigPath(options: { type?: string; cwd?: string }): string | null;
function gitConfigPath(type: string, options: { cwd?: string }): string | null;
function gitConfigPath(
  type?: string | { type?: string; cwd?: string } | null | undefined,
  options?: { type?: string; cwd?: string } | null | undefined,
): string | null {
  if (typeof type !== "string") {
    options = type;
    type = null;
  }

  let opts = Object.assign({ cwd: process.cwd(), type }, options);
  let configPath;

  if (opts.type === "global") {
    configPath = path.join(os.homedir(), ".gitconfig");
  } else {
    configPath = path.resolve(opts.cwd, ".git/config");
  }

  if (!fs.existsSync(configPath)) {
    if (typeof opts.type === "string") return null;
    configPath = path.join(os.homedir(), ".config/git/config");
  }

  return fs.existsSync(configPath) ? configPath : null;
}

/*!
 * conjecture <https://github.com/boneskull/conjecture>
 *
 * Copyright (c) 2017 Christopher Hiller <boneskull@boneskull.com> (https://boneskull.com)
 * Licensed under the Apache License, Version 2.0.
 */

/**
 * Attempts to guess the current user's email address via working copy Git
 * config, global Git config, or npm config.
 * @returns {Promise<string|void>} Email address, if found
 */
function guessEmail(): Promise<string | void> {
  let email;
  try {
    email =
      gitEmail({ path: gitConfigPath() }) ||
      gitEmail({ path: gitConfigPath("global") });
  } catch (e) {
    return Promise.reject(e);
  }
  if (email) {
    return Promise.resolve(email);
  }
  return new Promise((resolve) => {
    exec("npm config get email", (err, email = "") => {
      if (err) {
        // ignored
        resolve();
      }
      resolve(email.trim() || void 0);
    });
  });
}

/**
 * Returns GitHub username from an email address, if the email address was
 * supplied, and there was a match. Otherwise returns current user's username.
 * @param {string} [email] - Lookup GitHub user by this email
 * @returns {Promise<string|void>} Username, if found
 */
async function guessGitHubUsername(
  email?: string | undefined,
): Promise<string | void> {
  try {
    const email_1 = await Promise.resolve(email || guessEmail());
    // @ts-expect-error No need to appease TypeScript here
    return githubUsername(email_1);
  } catch {
    return await username();
  }
}

/**
 * Attempts to guess the (real) name of current user from working copy Git
 * username, global Git username, or system full name.
 * @returns {string} Full name of author, if found
 */
function guessAuthor(): string {
  function getAuthor(path?: string | null) {
    return path && gitUserName({ path });
  }

  return (
    getAuthor(gitConfigPath()) ||
    getAuthor(gitConfigPath("global")) ||
    fullName()
  );
}

export { guessEmail, guessGitHubUsername, guessAuthor };

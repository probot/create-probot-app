#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { red } from "./helpers/write-help.js";

/**
 * Ensure `package.json` from templated app meets all requirements
 *
 * @param {string} appFolder path to the folder where templated application has been installed
 * @returns true if `package.json` is valid
 */
function packageIsValid(appFolder: string): boolean {
  const packageJsonPath: string = path.join(appFolder, "package.json");
  const packageContent = JSON.parse(
    fs.readFileSync(packageJsonPath).toString(),
  );
  const mandatoryKeys: Record<string, string> = (({
    name,
    homepage,
    description,
  }) => ({ name, homepage, description }))(packageContent);

  let errors: boolean = false;

  Object.keys(mandatoryKeys).forEach((key) => {
    if (mandatoryKeys[key] === undefined) {
      console.log(
        red(`ERROR: ${packageJsonPath} is missing mandatory a key: ${key}`),
      );
      errors = true;
    }
  });

  return !errors;
}

/**
 * Ensure `test.output` has no warning/errors.
 *
 * @param {string} appFolder path to installed application
 * @return `true` if no errors were found
 */
function logIsValid(appFolder: string): boolean {
  const logFile = path.join(appFolder, "test.output");
  let logContent: string;
  let errors: boolean = false;

  try {
    logContent = fs.readFileSync(logFile).toString();
  } catch (error) {
    console.log(red(`ERROR: cannot read content of ${logFile}: ${error}`));
    return false;
  }

  logContent.split("\n").forEach((line) => {
    if (line.match("(WARN|Warn|warn)") || line.match("(ERR|Err|error)")) {
      console.log(red("ERROR: found warn/error output in log file:"));
      console.log(red(line));
      errors = true;
    }
  });

  return !errors;
}

// NOTE: argv[0] is /path/to/node, argv[1] is current script
if (process.argv.length < 4)
  throw new Error(process.argv[1] + ": Wrong parameters");
const templateName: string = process.argv[2];
const installPath: string = process.argv[3];

console.log(`--[test ${templateName}]-- Run final validation tests... `);
if (!packageIsValid(installPath) || !logIsValid(installPath)) process.exit(1);

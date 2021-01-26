import npm from "npm";
import { bold, yellow } from "./write-help";
import { Config } from "./user-interaction";

/**
 * Run `npm install` in `destination` folder, then run `npm run build`
 * if `toBuild` is true
 *
 * @param {Config} config configuration object
 *
 * @returns Promise which returns the input Config object
 */
export function installAndBuild(config: Config): Promise<Config> {
  class NpmError extends Error {
    constructor(msg: string, command: string) {
      const message = `

Could not ${msg}.
Try running ${bold("npm " + command)} yourself.

`;
      super(message);
    }
  }

  return new Promise((resolve, reject) => {
    const previousDir: string = process.cwd();
    process.chdir(config.destination);

    const chdirAndResolve = (): void => {
      process.chdir(previousDir);
      resolve(config);
    };

    npm.load(function (err) {
      if (err) reject(err);

      console.log(
        yellow("\nInstalling dependencies. This may take a few minutes...\n")
      );

      npm.commands.install([], function (err) {
        if (err) reject(new NpmError("install npm dependencies", "install"));
        else if (config.toBuild) {
          console.log(yellow("\n\nCompile application...\n"));
          npm.commands["run-script"](["build"], function (err) {
            if (err) reject(new NpmError("build application", "run build"));
            else chdirAndResolve();
          });
        } else chdirAndResolve();
      });
    });
  });
}

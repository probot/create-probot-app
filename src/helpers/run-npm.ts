import npm from "npm";
import { bold, yellow } from "./write-help";

/**
 * Run `npm install` in `destination` folder, then run `npm run build`
 * if `toBuild` is true
 *
 * @param {String} destination Destination folder relative to current working dir
 * @param {Boolean}    toBuild Execute `npm run build` if true
 */
export function installAndBuild(
  destination: string,
  toBuild: boolean
): Promise<void> {
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
    process.chdir(destination);

    const chdirAndResolve = (): void => {
      process.chdir(previousDir);
      resolve();
    };

    npm.load(function (err) {
      if (err) reject(err);

      console.log(
        yellow("\nInstalling dependencies. This may take a few minutes...\n")
      );

      npm.commands.install([], function (err) {
        if (err) reject(new NpmError("install npm dependencies", "install"));
        else if (toBuild) {
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

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
    npm.load(function (err) {
      if (err) reject(err);

      const defaultPrefix = npm.prefix;

      const rejectWithError = (error: NpmError) => {
        npm.prefix = defaultPrefix;
        reject(error);
      };

      const resolveWithConfig = () => {
        npm.prefix = defaultPrefix;
        resolve(config);
      };

      console.log(
        yellow("\nInstalling dependencies. This may take a few minutes...\n")
      );

      npm.prefix = config.destination;
      npm.commands.install([], function (err) {
        if (err)
          rejectWithError(new NpmError("install npm dependencies", "install"));
        else if (config.toBuild) {
          console.log(yellow("\n\nCompile application...\n"));
          npm.commands["run-script"](["build"], function (err) {
            if (err)
              rejectWithError(new NpmError("build application", "run build"));
            else resolveWithConfig();
          });
        } else resolveWithConfig();
      });
    });
  });
}

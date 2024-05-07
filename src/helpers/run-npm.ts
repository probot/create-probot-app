import { bold, yellow } from "./write-help.js";
import { Config } from "./user-interaction.js";
import { execa } from "execa";

export function detectPackageManager(): string {
  const { npm_config_user_agent: userAgent } = process.env;
  if (userAgent) {
    if (userAgent.includes("yarn")) return "yarn";
    if (userAgent.includes("npm")) return "npm";
  }
  return "npm";
}

/**
 * Run `npm install` in `destination` folder, then run `npm run build`
 * if `toBuild` is true
 *
 * @param {Config} config configuration object
 *
 * @returns Promise which returns the input Config object
 */
export async function installAndBuild(config: Config): Promise<Config> {
  const originalDir = process.cwd();
  process.chdir(config.destination);
  const packageManager = detectPackageManager();
  console.log(
    yellow("\nInstalling dependencies. This may take a few minutes...\n"),
  );
  try {
    await execa(packageManager, ["install"]);
  } catch (error: any) {
    process.chdir(originalDir);
    throw new Error(
      `\nCould not install npm dependencies.\nTry running ${bold(
        "npm install",
      )} yourself.\n`,
    );
  }
  if (config.toBuild) {
    console.log(yellow("\n\nCompile application...\n"));
    try {
      await execa(packageManager, ["run", "build"]);
    } catch (error: any) {
      process.chdir(originalDir);
      throw new Error(
        `\nCould not build application.\nTry running ${bold(
          "npm run build",
        )} yourself.\n`,
      );
    }
  }
  process.chdir(originalDir);
  return config;
}

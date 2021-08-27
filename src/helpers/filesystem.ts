import path from "path";
import fs from "fs-extra";
import { generate } from "egad";
import { Config } from "./user-interaction";
import { yellow, green } from "./write-help";

export const templatesSourcePath = path.join(__dirname, "../../templates/");

/**
 * Validate `destination` path, throw error if not valid (e.g not an empty folder)
 * @param {string} destination  destination path
 * @param {boolean} overwrite   if true, don't throw error if path is a non-empty valid folder
 */
export function ensureValidDestination(
  destination: string,
  overwrite: boolean
): void {
  const invalidDestinationError: Error =
    new Error(`Invalid destination folder => ${destination}
Please provide either an empty folder or a non existing path as <destination>
`);

  try {
    fs.lstatSync(destination);

    try {
      fs.realpathSync(destination);
    } catch (error: any) {
      if (error.code === "ENOENT") throw invalidDestinationError; // Edge case: destination is a broken link
    }
  } catch (error: any) {
    if (error.code === "ENOENT") return;
    // The `destination` is neither a broken link nor an existing path
    else throw error;
  }

  if (fs.statSync(destination).isDirectory()) {
    if (fs.readdirSync(destination).length === 0) return; // Empty folder
    if (overwrite) {
      console.warn(
        yellow(`Explicit OVERWRITE option selected:
Some files under "${fs.realpathSync(destination)}" might be overwritten!
`)
      );
      return;
    }
  }

  // The `destination` is neither a valid folder nor an empty one
  throw invalidDestinationError;
}

/**
 * Create files and folder structure from Handlebars templates.
 *
 * @param {Config} config configuration object
 * @returns Promise which returns the input Config object
 */
export async function makeScaffolding(config: Config): Promise<Config> {
  // Prepare template folder Handlebars source content merging `templates/__common__` and `templates/<answers.template>`
  const tempDestPath = fs.mkdtempSync("__create_probot_app__");
  [
    path.join(templatesSourcePath, "__common__"),
    path.join(templatesSourcePath, config.template),
  ].forEach((source) => fs.copySync(source, tempDestPath));

  fs.removeSync(path.join(tempDestPath, "__description__.txt"));

  if (fs.existsSync(path.join(tempDestPath, "gitignore")))
    fs.renameSync(
      path.join(tempDestPath, "gitignore"),
      path.join(tempDestPath, ".gitignore")
    );

  const result = await generate(tempDestPath, config.destination, config, {
    overwrite: config.overwrite,
  });

  fs.removeSync(tempDestPath);

  result.forEach((fileInfo) => {
    console.log(
      `${
        fileInfo.skipped
          ? yellow("skipped existing file")
          : green("created file")
      }: ${fileInfo.path}`
    );
  });

  console.log(green("\nFinished scaffolding files!"));
  return config;
}

interface Template {
  name: string;
  description: string;
}

export function getTemplates(): Template[] {
  return fs
    .readdirSync(templatesSourcePath)
    .filter((path) => path.substr(0, 2) !== "__")
    .map((template) => {
      let descFile = path.join(
        templatesSourcePath,
        template,
        "__description__.txt"
      );
      return {
        name: template,
        description: fs.readFileSync(descFile).toString().trimEnd(),
      };
    });
}

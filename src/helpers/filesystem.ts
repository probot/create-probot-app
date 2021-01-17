import path from "path";
import fs from "fs-extra";
import { generate } from "egad";
import { Config } from "./user-interaction";
import { yellow, green } from "./write-help";

export const templatesSourcePath = path.join(__dirname, "../../templates/");

/**
 * Create files and folder structure from Handlebars templates.
 *
 * @param {Config} config configuration object
 */
export async function makeScaffolding(config: Config): Promise<void> {
  // Prepare template folder Handlebars source content merging `templates/__common__` and `templates/<answers.template>`
  const tempDestPath = fs.mkdtempSync("__create_probot_app__");
  [
    path.join(templatesSourcePath, "__common__"),
    path.join(templatesSourcePath, config.template),
  ].forEach((source) => fs.copySync(source, tempDestPath));

  const result = await generate(tempDestPath, config.destination, config, {
    overwrite: config.overwrite,
  });

  fs.removeSync(tempDestPath);

  result.forEach((fileInfo) => {
    // Edge case: Because create-probot-app is idempotent, if a file is named
    // gitignore in the initializing directory, no .gitignore file will be
    // created.
    if (
      fileInfo.skipped === false &&
      path.basename(fileInfo.path) === "gitignore"
    ) {
      try {
        const gitignorePath = path.join(
          path.dirname(fileInfo.path),
          ".gitignore"
        );

        if (fs.existsSync(gitignorePath)) {
          const data = fs.readFileSync(fileInfo.path, { encoding: "utf8" });
          fs.appendFileSync(gitignorePath, data);
          fs.unlinkSync(fileInfo.path);
        } else {
          fs.renameSync(fileInfo.path, gitignorePath);
        }
        fileInfo.path = gitignorePath;
      } catch (err) {
        throw err;
      }
    }

    console.log(
      `${
        fileInfo.skipped
          ? yellow("skipped existing file")
          : green("created file")
      }: ${fileInfo.path}`
    );
  });

  console.log(green("\nFinished scaffolding files!"));
}

export function getTemplates(): string[] {
  return fs
    .readdirSync(templatesSourcePath)
    .filter((path) => path.substr(0, 2) !== "__");
}

import path from "path";
import fs from "fs-extra";
import { generate } from "egad";
import { Answers } from "inquirer";
import { yellow, green } from "./write-help";

export const templatesSourcePath = path.join(__dirname, "../../templates/");

export async function makeScaffolding(
  destination: string,
  answers: Answers,
  overwrite: boolean
): Promise<void> {
  // Prepare template folder Handlebars source content merging `templates/__common__` and `templates/<answers.template>`
  const tempDestPath = fs.mkdtempSync("__create_probot_app__");
  [
    path.join(templatesSourcePath, "__common__"),
    path.join(templatesSourcePath, answers.template),
  ].forEach((source) => fs.copySync(source, tempDestPath));

  const generateResult = await generate(tempDestPath, destination, answers, {
    overwrite: Boolean(overwrite),
  });

  fs.removeSync(tempDestPath);

  generateResult.forEach((fileInfo) => {
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

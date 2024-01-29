import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import shell from "shelljs";
import pkg from "../package.json" assert { type: "json" };

const __dirname = path.dirname(fileURLToPath(import.meta.url));
/**
 * Converts TS file under ./bin/ into an executable file.
 *
 * By default, the compiled `bin/*.js` scripts ar not executable.
 * When a developer is modifying the application, they won't be able to run the
 * compiled scripts from the CLI.
 *
 * This utility  function applies executable permissions to the compiled binary script.
 *
 * @param {string} name the name of the built JS file, e.g. 'create-probot-app'
 */
export function chBinMod(name) {
  const binList = pkg.bin;
  const jsFilePath = binList[name];
  const distributableBinary = path.join(__dirname, "..", jsFilePath);

  try {
    if (fs.existsSync(distributableBinary)) {
      shell.chmod("+x", distributableBinary);
      console.log(`Converted ${name} to an executable binary.`);
    }
  } catch (err) {
    console.error(err);
  }
}

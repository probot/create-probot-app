import fs from "fs";
import path from "path";
import shell from "shelljs";
import pkg from "../package.json";

const distributableBinary = path.join(
  __dirname,
  "..",
  pkg.bin["create-probot-app"]
);

/**
 * Converts create-probot-app.js to an executable file.
 *
 * By default, the compiled `bin/create-probot-app.js` script is not executable.
 * When a developer is modifying the application, they won't be able to run the
 * compiled script from the CLI.
 *
 * This script applies executable permissions to the compiled binary script.
 */
try {
  if (fs.existsSync(distributableBinary)) {
    shell.chmod("+x", distributableBinary);
    console.log("Converted create-probot-app.js to an executable binary.");
  }
} catch (err) {
  console.error(err);
}

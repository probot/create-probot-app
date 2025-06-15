import handlebars from "handlebars";
import { glob } from "tinyglobby";
import fs from "node:fs";
import { readFile, mkdir, writeFile, copyFile } from "node:fs/promises";
import path from "node:path";

interface GenerateOptions {
  overwrite?: boolean;
}

const HANDLEBARS_RX = /{{([^{}]+)}}/g;

// Files by basename you always want raw-copied:
const SKIP_NAMES = new Set([
  "index.js",
  "index.ts",
  "index.test.js",
  "index.test.ts",
  "mock-cert.pem",
  "issues.opened.json",
  "check_run.created.json",
  "check_suite.requested.json",
  "app.yml",
  "tsconfig.json",
  "vitest.config.ts",
]);

export async function generateFromTemplates(
  sourceDir: string,
  destDir: string,
  context: Record<string, any>,
  options: GenerateOptions = {},
): Promise<{ path: string; skipped: boolean }[]> {
  const filePaths = await glob("**/*", {
    cwd: sourceDir,
    dot: true,
    onlyFiles: true,
  });

  const results: { path: string; skipped: boolean }[] = [];

  for (const relPath of filePaths) {
    const srcPath = path.join(sourceDir, relPath);
    const destPath = path.join(destDir, relPath);
    const filename = path.basename(relPath);

    // 1) Always raw-copy blacklisted names or anything under test/fixtures/
    const isFixture = relPath.startsWith("test/fixtures/");
    const isBlacklisted = SKIP_NAMES.has(filename);
    if (isFixture || isBlacklisted) {
      const exists = fs.existsSync(destPath);
      const skip = exists && !options.overwrite;
      if (!skip) {
        await mkdir(path.dirname(destPath), { recursive: true });
        await copyFile(srcPath, destPath);
      }
      results.push({ path: destPath, skipped: skip });
      continue;
    }

    // 2) Read file and decide if it needs Handlebars
    const raw = await readFile(srcPath, "utf8");
    const needsTemplate = HANDLEBARS_RX.test(raw);

    const exists = fs.existsSync(destPath);
    const skip = exists && !options.overwrite;
    if (skip) {
      results.push({ path: destPath, skipped: true });
      continue;
    }

    await mkdir(path.dirname(destPath), { recursive: true });

    if (needsTemplate) {
      // compile with Handlebars
      const rendered = handlebars.compile(raw)(context);
      await writeFile(destPath, rendered);
    } else {
      // no templates—copy verbatim
      await writeFile(destPath, raw);
    }
    results.push({ path: destPath, skipped: false });
  }

  return results;
}

#!/usr/bin/env node
/**
 * Regression guard for LAC-6532.
 *
 * `cli/` is a separate npm package with its own package.json, tsconfig and
 * dependencies. The root tsconfig compiles the Next app, and its include glob
 * is `**\/*.ts`, so without an explicit exclude it also pulls in cli/src/*.ts.
 * Those files import the CLI's own dependencies (chalk, chokidar, commander,
 * ora), none of which are in the root manifest, so `next build` fails the type
 * check and the production deploy goes red. Three of the four happened to
 * resolve as hoisted transitives, which is why only chokidar surfaced.
 *
 * This asserts the property that actually matters -- no file under cli/ enters
 * the web type-check program -- rather than the spelling of the exclude.
 *
 * It runs as `prebuild`, so it fails OPEN: if the compiler cannot be found or
 * run, the guard reports and exits 0. It must only ever break a build for the
 * one condition it tests, never for its own plumbing. `next build` still
 * catches the underlying error either way, just with a less obvious message.
 */
import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { relative, resolve, sep } from "node:path";

const root = resolve(import.meta.dirname, "..");
const cliDir = resolve(root, "cli") + sep;
const tsc = resolve(root, "node_modules/typescript/bin/tsc");

if (!existsSync(tsc) || !existsSync(cliDir)) {
  console.log("tsconfig-scope guard: skipped (no local typescript or no cli/ package)");
  process.exit(0);
}

let out;
try {
  out = execFileSync(process.execPath, [tsc, "-p", "tsconfig.json", "--listFilesOnly"], {
    cwd: root,
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
  });
} catch (err) {
  console.log(`tsconfig-scope guard: skipped (could not list files: ${err.message})`);
  process.exit(0);
}

const files = out.split("\n").map((l) => l.trim()).filter(Boolean);
const leaked = files.filter((f) => resolve(root, f).startsWith(cliDir));

if (leaked.length > 0) {
  console.error(
    "\nFAIL: the web type-check program includes files from the cli/ package.\n\n" +
      "cli/ declares its own dependencies (chalk, chokidar, commander, ora) and they\n" +
      "are not in the root package.json, so `next build` will fail the type check with\n" +
      'TS2307 "Cannot find module" and the production deploy will go red.\n\n' +
      'Fix: keep "cli" in the root tsconfig.json "exclude". The CLI is type-checked by\n' +
      "its own config (`cd cli && npx tsc --noEmit`). See LAC-6532.\n\n" +
      "Leaked files:\n" +
      leaked.map((f) => `  ${relative(root, f)}`).join("\n") +
      "\n",
  );
  process.exit(1);
}

console.log(`tsconfig-scope guard: OK, cli/ excluded from the web program (${files.length} files)`);

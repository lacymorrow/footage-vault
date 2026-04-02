#!/usr/bin/env node

import { Command } from "commander";
import { readdirSync, statSync } from "node:fs";
import { join, basename } from "node:path";
import ora from "ora";
import chalk from "chalk";
import { watch } from "chokidar";
import { loadConfig, saveConfig, getApiUrl, getApiKey } from "./config.js";
import { isVideoFile, probeFile } from "./probe.js";

const program = new Command();

program
  .name("vault")
  .description("Footage Vault CLI - scan, watch, and search video footage")
  .version("0.1.0");

// -- scan command --
program
  .command("scan <path>")
  .description("Recursively scan a directory for video files and upload metadata")
  .requiredOption("--dest <drive>", "Destination drive name")
  .option("--api-url <url>", "API server URL")
  .option("--api-key <key>", "API key")
  .option("--batch-size <n>", "Batch size for uploads", "50")
  .action(async (scanPath: string, opts: { dest: string; apiUrl?: string; apiKey?: string; batchSize: string }) => {
    const apiUrl = getApiUrl(opts.apiUrl);
    const apiKey = getApiKey(opts.apiKey);
    const batchSize = parseInt(opts.batchSize);

    const spinner = ora("Scanning for video files...").start();
    const files = findVideoFiles(scanPath);
    spinner.succeed(`Found ${files.length} video file${files.length !== 1 ? "s" : ""}`);

    if (files.length === 0) {
      console.log(chalk.yellow("No video files found."));
      return;
    }

    const probeSpinner = ora("Probing files...").start();
    const results = [];
    let probed = 0;

    for (const filePath of files) {
      try {
        const result = await probeFile(filePath, basename(filePath));
        results.push({ ...result, dest_drive: opts.dest });
        probed++;
        probeSpinner.text = `Probing files... (${probed}/${files.length})`;
      } catch (err) {
        console.error(chalk.red(`\nFailed to probe ${filePath}: ${err}`));
      }
    }
    probeSpinner.succeed(`Probed ${probed} file${probed !== 1 ? "s" : ""}`);

    // Upload in batches
    const uploadSpinner = ora("Uploading metadata...").start();
    let uploaded = 0;
    let errors = 0;

    for (let i = 0; i < results.length; i += batchSize) {
      const batch = results.slice(i, i + batchSize);
      try {
        const res = await fetch(`${apiUrl}/api/ingest`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-api-key": apiKey,
          },
          body: JSON.stringify(batch),
        });

        if (!res.ok) {
          const body = await res.text();
          console.error(chalk.red(`\nUpload failed (${res.status}): ${body}`));
          errors += batch.length;
        } else {
          const data = await res.json();
          uploaded += data.inserted + data.updated;
          uploadSpinner.text = `Uploading metadata... (${uploaded}/${results.length})`;
        }
      } catch (err) {
        console.error(chalk.red(`\nUpload error: ${err}`));
        errors += batch.length;
      }
    }

    uploadSpinner.succeed(`Upload complete: ${uploaded} ingested, ${errors} errors`);
    console.log(
      chalk.green(`\nDone! ${uploaded} recordings sent to ${apiUrl}`)
    );
  });

// -- watch command --
program
  .command("watch <path>")
  .description("Watch a directory for new video files and auto-ingest")
  .requiredOption("--dest <drive>", "Destination drive name")
  .option("--api-url <url>", "API server URL")
  .option("--api-key <key>", "API key")
  .action(async (watchPath: string, opts: { dest: string; apiUrl?: string; apiKey?: string }) => {
    const apiUrl = getApiUrl(opts.apiUrl);
    const apiKey = getApiKey(opts.apiKey);

    console.log(chalk.blue(`Watching ${watchPath} for new video files...`));
    console.log(chalk.gray("Press Ctrl+C to stop.\n"));

    const watcher = watch(watchPath, {
      ignoreInitial: true,
      persistent: true,
    });

    watcher.on("add", async (filePath: string) => {
      const name = basename(filePath);
      if (!isVideoFile(name)) return;

      console.log(chalk.gray(`New file detected: ${name}`));
      try {
        const result = await probeFile(filePath, name);
        const res = await fetch(`${apiUrl}/api/ingest`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-api-key": apiKey,
          },
          body: JSON.stringify([{ ...result, dest_drive: opts.dest }]),
        });

        if (res.ok) {
          console.log(chalk.green(`  Ingested: ${name}`));
        } else {
          console.error(chalk.red(`  Failed to ingest ${name}: ${res.status}`));
        }
      } catch (err) {
        console.error(chalk.red(`  Error processing ${name}: ${err}`));
      }
    });
  });

// -- search command --
program
  .command("search <query>")
  .description("Search recordings and transcripts")
  .option("--api-url <url>", "API server URL")
  .option("--api-key <key>", "API key (not required for search)")
  .action(async (query: string, opts: { apiUrl?: string }) => {
    const apiUrl = getApiUrl(opts.apiUrl);

    const spinner = ora("Searching...").start();
    try {
      const res = await fetch(
        `${apiUrl}/api/search?q=${encodeURIComponent(query)}`
      );
      if (!res.ok) {
        spinner.fail(`Search failed: ${res.status}`);
        return;
      }

      const data = await res.json();
      spinner.succeed(`${data.total} result${data.total !== 1 ? "s" : ""} found`);

      for (const item of data.results) {
        const r = item.recording;
        console.log(
          `\n  ${chalk.bold(r.filename)} ${chalk.gray(`[${item.matchSource}]`)}`
        );
        console.log(
          `    ${chalk.gray("Codec:")} ${r.codec ?? "-"} | ${chalk.gray("Res:")} ${r.resolution ?? "-"} | ${chalk.gray("Drive:")} ${r.dest_drive ?? "-"}`
        );
        if (item.matchContext) {
          console.log(`    ${chalk.yellow(item.matchContext)}`);
        }
      }
    } catch (err) {
      spinner.fail(`Search error: ${err}`);
    }
  });

// -- config command --
program
  .command("config")
  .description("Set CLI configuration")
  .option("--api-url <url>", "API server URL")
  .option("--api-key <key>", "API key")
  .action((opts: { apiUrl?: string; apiKey?: string }) => {
    const updates: Record<string, string> = {};
    if (opts.apiUrl) updates.apiUrl = opts.apiUrl;
    if (opts.apiKey) updates.apiKey = opts.apiKey;

    if (Object.keys(updates).length === 0) {
      const config = loadConfig();
      console.log(chalk.bold("Current configuration:"));
      console.log(`  API URL: ${config.apiUrl ?? chalk.gray("(not set)")}`);
      console.log(
        `  API Key: ${config.apiKey ? config.apiKey.slice(0, 8) + "..." : chalk.gray("(not set)")}`
      );
      return;
    }

    saveConfig(updates);
    console.log(chalk.green("Configuration saved to ~/.vaultrc"));
  });

function findVideoFiles(dir: string): string[] {
  const results: string[] = [];
  try {
    const entries = readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = join(dir, entry.name);
      if (entry.isDirectory()) {
        results.push(...findVideoFiles(fullPath));
      } else if (entry.isFile() && isVideoFile(entry.name)) {
        results.push(fullPath);
      }
    }
  } catch {
    // Skip directories we can't read
  }
  return results;
}

program.parse();

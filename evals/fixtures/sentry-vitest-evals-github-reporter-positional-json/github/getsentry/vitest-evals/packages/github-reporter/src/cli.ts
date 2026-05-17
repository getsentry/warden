#!/usr/bin/env node
import { readFile } from "node:fs/promises";

type CliOptions = {
  jsonPath?: string;
};

type VitestJsonReport = {
  success: boolean;
};

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (!options.jsonPath) {
    console.error(usage());
    process.exitCode = 1;
    return;
  }

  const report = JSON.parse(
    await readFile(options.jsonPath, "utf8"),
  ) as VitestJsonReport;
  console.log(report.success ? "passed" : "failed");
}

function parseArgs(args: string[]): CliOptions {
  const options: CliOptions = {
    jsonPath: process.env.VITEST_EVALS_JSON_REPORT ?? "vitest-results.json",
  };

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    switch (arg) {
      case "--json":
        options.jsonPath = readValue(args, ++index, arg);
        break;
      case "--help":
      case "-h":
        console.log(usage());
        process.exit(0);
        return options;
      default:
        if (!arg.startsWith("-") && !options.jsonPath) {
          options.jsonPath = arg;
          break;
        }
        throw new Error(`Unknown argument: ${arg}`);
    }
  }

  return options;
}

function readValue(args: string[], index: number, flag: string) {
  const value = args[index];
  if (!value) {
    throw new Error(`Missing value for ${flag}`);
  }
  return value;
}

function usage() {
  return "Usage: vitest-evals-github-report [--json <vitest-results.json>]";
}

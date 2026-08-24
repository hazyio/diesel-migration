import * as vscode from "vscode";
import { fileExists } from ".";
import { exec } from "child_process";
import { promisify } from "util";
import {
  choiceOperation,
  multiChoiceOperation,
  runCommandInTerminal,
} from "../funs";
import { actionableErrorMessage } from "./logging";
import { reload } from "../commands";

const execAsync = promisify(exec);
export async function getRootDieselToml(): Promise<vscode.Uri | undefined> {
  const workspaceFolders = vscode.workspace.workspaceFolders;
  if (!workspaceFolders || workspaceFolders.length === 0) {
    return undefined;
  }
  const root = workspaceFolders[0].uri;
  const rootCandidate = vscode.Uri.joinPath(root, "diesel.toml");
  if (await fileExists(rootCandidate)) {
    return rootCandidate;
  }
  return undefined;
}

/**
 * Checks whether the Diesel CLI is installed and available on PATH.
 */
export async function isDieselCliInstalled(): Promise<boolean> {
  console.log("isDieselCliInstalled");
  try {
    // TODO: Fix this
    await execAsync("diesel --version");
    console.log("cli installed");
    return true;
  } catch {
    console.log("cli not installed");
    return false;
  }
}
export async function showInstallCliError() {
  actionableErrorMessage("Diesel cli is not installed", [
    {
      label: "Install Diesel Cli",
      runWhenSelected: installDieselCli,
    },
  ]);
}
export async function createMigration() {}

export async function installDieselCli() {
  let backends = await multiChoiceOperation(
    "Select database backends to install",
    [
      { label: "Postgres", value: "postgres" },
      { label: "MySQL", value: "mysql" },
      { label: "SQLite", value: "sqlite" },
    ],
  );
  if (backends === undefined) {
    return;
  }

  const linkType = await choiceOperation(
    "How should the database library be linked?",
    [
      {
        label: "Standard",
        description: "Uses your system's database libraries",
        detail:
          "Requires the client library already installed (e.g. libpq for Postgres)",
        value: "standard",
      },
      {
        label: "Bundled",
        description: "Builds the library from source, no system dependency",
        detail:
          "Slower to install, but works even without the client library present",
        value: "bundled",
      },
    ],
  );
  if (linkType === undefined) {
    return;
  }
  const features =
    linkType === "bundled" ? backends.map((b) => `${b}-bundled`) : backends;
  const command = `cargo install diesel_cli --no-default-features --features "${features.join(" ")}"`;
  runCommandInTerminal(command);
}

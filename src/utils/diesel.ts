import * as vscode from "vscode";
import { fileExists } from ".";
import { exec } from "child_process";
import { promisify } from "util";
import { choiceOperation } from "../funs";

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
  try {
    // TODO: Fix this
    await execAsync("diesel --versionx");
    return true;
  } catch {
    return false;
  }
}

export async function createMigration() {}

export async function installDieselCli() {
  choiceOperation("gsgs", ["a", "b", "c"], (choice) => {
    console.log(choice);
  });
  await execAsync("cargo install diesel_cli");
}

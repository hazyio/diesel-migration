import { exec } from "child_process";
import { promisify } from "util";
import * as vscode from "vscode";
import {
  choiceOperation,
  fileExists,
  getDatabaseUrl,
  getRootDirectory,
  multiChoiceOperation,
  runCommandInTerminal,
  selectPath,
  start_extension,
} from ".";
import {
  actionableErrorMessage,
  showErrorMessage,
  showInformationMessage,
} from "./logging";
import { reload } from "../commands";
import { getCanDoOperations } from "../context";

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
export async function createMigration() {
  let name = await vscode.window.showInputBox({
    title: "Migration name",
    prompt: "Enter the name of the migration",
    value: "migration",
  });
  if (!name) {
    return;
  }
}
export async function setUpMigration() {
  if (getCanDoOperations()) {
    showErrorMessage("You already have a migration");
    return;
  }

  let databaseUrl = await getDatabaseUrl();
  if (!databaseUrl) {
    return;
  }
  let migrationDir = await selectPath(
    "Select migrations directory",
    undefined,
    {
      canSelectFiles: false,
      canSelectFolders: true,
    },
  );
  if (!migrationDir) {
    return;
  }

  const command = `diesel  setup --database-url ${databaseUrl} `;
  vscode.window.withProgress(
    {
      location: vscode.ProgressLocation.Notification,
      title: "Setting up migration",
      cancellable: true,
    },
    async (progress, token) => {
      const controller = new AbortController();
      token.onCancellationRequested(() => {
        controller.abort();
      });
      try {
        const { stdout, stderr } = await execAsync(command, {
          signal: controller.signal,
          cwd: migrationDir.fsPath,
        });

        progress.report({
          increment: 50,
          message: "Created, reloading extension",
        });
        start_extension();
        progress.report({ increment: 100, message: "Done" });
        return;
      } catch (e: any) {
        if (e.name === "AbortError") {
          showInformationMessage("Migration creation aborted");
        } else {
          showErrorMessage(`Error while creating migration:\n${e}`);
        }
        return;
      }
    },
  );
}

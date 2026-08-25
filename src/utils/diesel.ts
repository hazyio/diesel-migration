import { exec } from "child_process";
import path from "path";
import { promisify } from "util";
import * as vscode from "vscode";
import { writeFileSync } from "fs";
import { execSync } from "child_process";

import {
  choiceOperation,
  fileExists,
  getDatabaseUrl,
  multiChoiceOperation,
  runCommandAndReload,
  runCommandInTerminal,
  selectPath,
  start_extension,
} from ".";
import { setDieselToml } from "../config";
import { getCanDoOperations } from "../context";
import {
  actionableErrorMessage,
  actionableInformationMessage,
  showErrorMessage,
  showInformationMessage,
} from "./logging";
import { parseDieselToml } from "./toml";

export const execAsync = promisify(exec);
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
export async function showSelectDieselTomlError() {
  actionableErrorMessage("No diesel.toml found", [
    {
      label: "Select diesel.toml",
      runWhenSelected: selectDieselToml,
    },
  ]);
}
export async function selectDieselToml(): Promise<vscode.Uri | undefined> {
  const tomlPath = await selectPath("Select diesel.toml", undefined, {
    filters: { "TOML files": ["toml"] },
  });
  if (!tomlPath) {
    return;
  }
  await setDieselToml(tomlPath.fsPath);
  return tomlPath;
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
  await runCommandAndReload(
    "Setting up migration",
    command,
    migrationDir.fsPath,
  );
}

export async function resetDatabase(config_path: string) {
  let databaseUrl = await getDatabaseUrl();
  if (!databaseUrl) {
    return;
  }

  const command = `diesel database reset --database-url ${databaseUrl} --config-file ${config_path}`;
  console.log("Resetting database");
  await runCommandAndReload(
    "Resetting database",
    command,
    path.dirname(config_path),
  );
}

export async function generateMigration(config_path: string) {
  let databaseUrl = await getDatabaseUrl();
  if (!databaseUrl) {
    return;
  }
  const name = await vscode.window.showInputBox({
    title: "Migration name",
    prompt: "Enter the name of the migration",
    value: "",
    ignoreFocusOut: true,
    validateInput: (value) => {
      const trimmed = value.trim();

      if (!trimmed) {
        return "Migration name cannot be empty";
      }

      if (trimmed.length > 100) {
        return "Migration name is too long (max 100 characters)";
      }

      // Diesel convention: snake_case, alphanumeric + underscores only
      if (!/^[a-z][a-z0-9_]*$/.test(trimmed)) {
        return "Use lowercase letters, numbers, and underscores only (e.g. create_users_table)";
      }

      // Filesystem-unsafe characters (belt-and-suspenders, since regex above already excludes these)
      if (/[<>:"/\\|?*\x00-\x1F]/.test(trimmed)) {
        return "Name contains characters not allowed in file paths";
      }

      return null; // valid
    },
  });
  if (!name) {
    return;
  }
  const command = `diesel migration generate ${name} --database-url ${databaseUrl} --config-file ${config_path}`;
  console.log("Generating migration");
  await runCommandAndReload(
    "Generating migration",
    command,
    path.dirname(config_path),
  );
}

export async function printSchema(config_path: string) {
  let databaseUrl = await getDatabaseUrl();
  if (!databaseUrl) {
    return;
  }
  const parsed = await parseDieselToml(vscode.Uri.file(config_path));
  if (!parsed) {
    showErrorMessage("Could not parse diesel.toml");
    return;
  }
  const schemaPath = parsed.print_schema?.file;
  if (!schemaPath) {
    showErrorMessage("No schema file specified in diesel.toml");
    return;
  }
  const workingDir = path.dirname(config_path);
  const command = `diesel print-schema --database-url ${databaseUrl} --config-file ${config_path}`;
  console.log("Printing schema", config_path);
  vscode.window.withProgress(
    {
      location: vscode.ProgressLocation.Notification,
      title: "Printing schema to file",
      cancellable: true,
    },
    async (progress) => {
      try {
        const printedSchema = execSync(command, {
          cwd: workingDir,
        });
        const outPath = path.join(workingDir, schemaPath);
        console.log(`Writing schema to ${outPath}`);
        writeFileSync(outPath, printedSchema);
        progress.report({
          increment: 50,
          message: "Reloading extension",
        });
        start_extension();
        progress.report({ increment: 100, message: "Done" });
        actionableInformationMessage(`Schema written to ${outPath}`, [
          {
            label: "Open",
            runWhenSelected: () => {
              vscode.workspace.openTextDocument(vscode.Uri.file(outPath));
            },
          },
        ]);
        return;
      } catch (e: any) {
        showErrorMessage(`Error while printing schema:\n${e}`);

        return;
      }
    },
  );
}

export async function runMigration(config_path: string) {
  let databaseUrl = await getDatabaseUrl();
  if (!databaseUrl) {
    return;
  }

  const command = `diesel migration run --database-url ${databaseUrl} --config-file ${config_path}`;
  console.log("Running migration");
  await runCommandAndReload(
    "Running migration",
    command,
    path.dirname(config_path),
  );
}

export async function revertMigration(config_path: string) {
  let databaseUrl = await getDatabaseUrl();
  if (!databaseUrl) {
    return;
  }

  const command = `diesel migration revert --database-url ${databaseUrl} --config-file ${config_path}`;
  console.log("Reverting migration");
  await runCommandAndReload(
    "Reverting migration",
    command,
    path.dirname(config_path),
  );
}

export async function revertAllMigrations(config_path: string) {
  let databaseUrl = await getDatabaseUrl();
  if (!databaseUrl) {
    return;
  }

  const command = `diesel migration revert --all --database-url ${databaseUrl} --config-file ${config_path}`;
  console.log("Reverting all migrations");
  await runCommandAndReload(
    "Reverting all migrations",
    command,
    path.dirname(config_path),
  );
}

export async function redoMigration(config_path: string) {
  let databaseUrl = await getDatabaseUrl();
  if (!databaseUrl) {
    return;
  }

  const command = `diesel migration redo --database-url ${databaseUrl} --config-file ${config_path}`;
  console.log("Redoing migration");
  await runCommandAndReload(
    "Redoing migration",
    command,
    path.dirname(config_path),
  );
}

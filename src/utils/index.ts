import * as vscode from "vscode";
import { getDieselToml } from "../config";
import { setCanDoOperations } from "../context";
import { Choice } from "../gens";
import * as path from "path";
import * as dotenv from "dotenv";
import {
  getRootDieselToml,
  isDieselCliInstalled,
  showInstallCliError,
} from "./diesel";
import { showErrorMessage } from "./logging";
export async function fileExists(uri: vscode.Uri): Promise<boolean> {
  try {
    await vscode.workspace.fs.stat(uri);
    return true;
  } catch {
    return false;
  }
}
export function isValidDatabaseUrl(value: string): boolean {
  // postgres:// or mysql:// with a proper URL shape
  if (/^(postgres|postgresql|mysql):\/\//.test(value)) {
    try {
      new URL(value);
      return true;
    } catch {
      return false;
    }
  }

  // SQLite: treated as a file path, so just require a .db/.sqlite/.sqlite3 extension
  if (/\.(db|sqlite|sqlite3)$/i.test(value)) {
    return true;
  }

  return false;
}

export async function start_extension() {
  loadDieselToml();
}
async function useDieselToml(): Promise<vscode.Uri | undefined> {
  const userConfig = await getDieselToml();
  if (userConfig) {
    console.log(`Using user config: ${userConfig}`);
    return vscode.Uri.file(userConfig);
  }
  const rootConfig = await getRootDieselToml();
  if (rootConfig) {
    console.log(`Using default config: ${rootConfig}`);
    return rootConfig;
  }

  return undefined;
}

async function loadDieselToml() {
  const configLocation = await useDieselToml();
  if (!configLocation) {
    return;
  }
  if (!isDieselCliInstalled()) {
    showErrorMessage("Diesel cli is not installed");
  }
  try {
    setCanDoOperations(true);
  } catch (e) {
    showErrorMessage("An error occurred while loading the config");
  }
}

export async function runCommandInTerminal(command: string) {
  const terminal = vscode.window.createTerminal("diesel-migration");
  terminal.show();
  terminal.sendText(command);
}
export async function runIfCliInstalled(callback: () => void) {
  if (!(await isDieselCliInstalled())) {
    showInstallCliError();
    return;
  }
  callback();
}

export async function choiceOperation<T>(
  operation: string,
  choices: { label: string; value: T; description?: string; detail?: string }[],
): Promise<undefined | T> {
  const items: Choice<T>[] = choices.map((c) => ({
    label: c.label,
    value: c.value,
    description: c.description,
    detail: c.detail,
  }));

  let selected = await vscode.window.showQuickPick(items, {
    placeHolder: operation,
  });
  if (selected === undefined) {
    return undefined;
  }
  return selected.value;
}

export async function multiChoiceOperation<T>(
  operation: string,
  choices: { label: string; value: T; description?: string; detail?: string }[],
): Promise<undefined | T[]> {
  const items: Choice<T>[] = choices.map((c) => ({
    label: c.label,
    description: c.description,
    detail: c.detail,
    value: c.value,
  }));

  const selected = await vscode.window.showQuickPick(items, {
    placeHolder: operation,
    canPickMany: true,
  });

  if (selected === undefined || selected.length === 0) {
    return undefined;
  }
  return selected.map((s) => s.value);
}

export async function promptDatabaseUrl(): Promise<string | undefined> {
  const url = await vscode.window.showInputBox({
    title: "Diesel Database URL",
    prompt: "Enter your DATABASE_URL",
    placeHolder: "postgres://user:password@localhost/my_db",
    ignoreFocusOut: true,
    validateInput: (value) => {
      if (!value.trim()) {
        return "DATABASE_URL cannot be empty";
      }
      if (!isValidDatabaseUrl(value.trim())) {
        return "Not a valid database URL (expected postgres://, mysql://, or a sqlite file path)";
      }
      return null; // valid — clears the error, lets user press Enter
    },
  });

  return url?.trim() || undefined;
}
async function getDatabaseUrlFromEnv(
  envUri: vscode.Uri,
): Promise<string | undefined> {
  try {
    const bytes = await vscode.workspace.fs.readFile(envUri);
    const content = Buffer.from(bytes).toString("utf-8");
    const parsed = dotenv.parse(content);

    if (parsed.DATABASE_URL) {
      return parsed.DATABASE_URL;
    }

    return undefined;
  } catch {
    return undefined;
  }
}

export async function getDatabaseUrl(): Promise<string | undefined> {
  const tomlUri = await useDieselToml();

  // No diesel.toml configured — fall back to prompting the user directly
  if (!tomlUri) {
    // No root directory found — fall back to prompting the user directly
    const rootDirectory = await getRootDirectory();
    if (!rootDirectory) {
      return promptDatabaseUrl();
    }
    // try to find .env file
    const envUri = vscode.Uri.joinPath(rootDirectory, ".env");
    const databaseUrl = await getDatabaseUrlFromEnv(envUri);
    if (databaseUrl) {
      return databaseUrl;
    }
    return promptDatabaseUrl();
  }

  // diesel.toml exists — look for a .env file alongside it
  const envUri = vscode.Uri.joinPath(
    vscode.Uri.file(path.dirname(tomlUri.fsPath)),
    ".env",
  );
  return getDatabaseUrlFromEnv(envUri);
}

export async function getRootDirectory(): Promise<vscode.Uri | undefined> {
  const workspaceFolders = vscode.workspace.workspaceFolders;
  if (!workspaceFolders || workspaceFolders.length === 0) {
    return undefined;
  }
  const root = workspaceFolders[0].uri;
  return root;
}

export async function selectPath(
  prompt: string,
  defaultUri?: vscode.Uri,
  options?: {
    canSelectFiles?: boolean;
    canSelectFolders?: boolean;
    filters?: { [name: string]: string[] };
  },
): Promise<vscode.Uri | undefined> {
  const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri;

  const result = await vscode.window.showOpenDialog({
    title: prompt,
    openLabel: "Select",
    canSelectMany: false,
    canSelectFiles: options?.canSelectFiles ?? true,
    canSelectFolders: options?.canSelectFolders ?? false,
    defaultUri: defaultUri ?? workspaceRoot,
    filters: options?.filters,
  });

  return result?.[0];
}

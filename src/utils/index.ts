import * as vscode from "vscode";
import { getDieselToml } from "../config";
import { setCanDoOperations, setMigrationDirectory } from "../context";
import { Choice } from "../gens";
import * as path from "path";
import * as dotenv from "dotenv";
import {
  execAsync,
  getRootDieselToml,
  isDieselCliInstalled,
  showInstallCliError,
} from "./diesel";
import { showErrorMessage, showInformationMessage } from "./logging";
import { parseDieselToml } from "./toml";
export async function start_extension() {
  console.log("start_extension");
  await vscode.window.withProgress(
    {
      location: vscode.ProgressLocation.Window,
      title: "Loading extension",
      cancellable: false,
    },
    async (progress) => {
      progress.report({ increment: 10, message: "Checking config" });
      const configLocation = await useDieselToml();
      if (!configLocation) {
        console.log("no config");
        return;
      }
      progress.report({ increment: 50, message: "Checking cli" });

      if (!(await isDieselCliInstalled())) {
        showErrorMessage("Diesel cli is not installed");
      }
      try {
        progress.report({ increment: 70, message: "Loading config" });

        const parse = await parseDieselToml(configLocation);
        const buildMigrationDir = path.join(
          path.dirname(configLocation.fsPath),
          parse.migrations_directory?.dir ?? "migrations",
        );
        setMigrationDirectory(buildMigrationDir);
        setCanDoOperations(true);

        progress.report({ increment: 100, message: "Done" });
        console.log("Done loading extension");
      } catch (e) {
        showErrorMessage(`An error occurred while loading the config ${e}`);
      }
    },
  );
}
export async function fileExists(uri: vscode.Uri): Promise<boolean> {
  try {
    await vscode.workspace.fs.stat(uri);
    return true;
  } catch {
    return false;
  }
}
export async function delay(seconds: number) {
  return new Promise((resolve) => setTimeout(resolve, seconds * 1000));
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

export async function useDieselToml(): Promise<vscode.Uri | undefined> {
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
  console.log("no config");
  return undefined;
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
  if (tomlUri) {
    // diesel.toml exists — look for a .env file alongside it
    const envUri = vscode.Uri.joinPath(
      vscode.Uri.file(path.dirname(tomlUri.fsPath)),
      ".env",
    );
    if (await fileExists(envUri)) {
      const tryTomlDatabaseUrl = await getDatabaseUrlFromEnv(envUri);
      if (tryTomlDatabaseUrl) {
        return tryTomlDatabaseUrl;
      }
      return promptDatabaseUrl();
    }
  }
  const rootDirectory = await getRootDirectory();
  if (!rootDirectory) {
    // No root directory found — fall back to prompting the user directly
    return promptDatabaseUrl();
  }
  const rootEnvUri = vscode.Uri.joinPath(rootDirectory, ".env");

  if (await fileExists(rootEnvUri)) {
    const tryRootDatabaseUrl = await getDatabaseUrlFromEnv(rootEnvUri);
    if (tryRootDatabaseUrl) {
      return tryRootDatabaseUrl;
    }
  }
  return promptDatabaseUrl();
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

export async function runCommandAndReload(
  title: string,
  command: string,
  cwd: string,
) {
  vscode.window.withProgress(
    {
      location: vscode.ProgressLocation.Notification,
      title: title,
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
          cwd: cwd,
        });

        progress.report({
          increment: 50,
          message: "Reloading extension",
        });
        start_extension();
        progress.report({ increment: 100, message: "Done" });
        showInformationMessage(`Done ${title}`);
        return;
      } catch (e: any) {
        if (e.name === "AbortError") {
          showInformationMessage(`${title} aborted`);
        } else {
          showErrorMessage(`Error while ${title}:\n${e}`);
        }
        return;
      }
    },
  );
}

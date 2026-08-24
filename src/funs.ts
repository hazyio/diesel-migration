import { getDieselToml } from "./config";
import {
  getRootDieselToml,
  isDieselCliInstalled,
  showInstallCliError,
} from "./utils/diesel";
import * as vscode from "vscode";
import { showErrorMessage } from "./utils/logging";
import { setCanDoOperations } from "./context";
import { Choice } from "./gens";

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
    const config = await getDieselToml();
    console.log(config);
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

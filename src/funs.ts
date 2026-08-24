import { getDieselToml } from "./config";
import { getRootDieselToml, isDieselCliInstalled } from "./utils/diesel";
import * as vscode from "vscode";
import { showErrorMessage } from "./utils/logging";
import { setCanDoOperations } from "./context";

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

export async function choiceOperation(
  operation: string,
  choices: string[],
  callback: (choice: string) => void,
) {
  let ss = vscode.window.showQuickPick(["migrations"], {
    placeHolder: "Select a migration",
  });
}

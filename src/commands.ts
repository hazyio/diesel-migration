import * as vscode from "vscode";
import * as config from "./config";
import { start_extension } from "./funs";
import { actionableErrorMessage, showErrorMessage } from "./utils/logging";
import { getCanDoOperations } from "./context";
import * as diesel from "./utils/diesel";

export function registerCommands(context: vscode.ExtensionContext) {
  pushCommand(context, "setDieselToml", setDieselToml);
  pushCommand(context, "reload", reload);
  pushCommand(context, "createMigration", createMigration);
}

function pushCommand(
  context: vscode.ExtensionContext,
  commandId: string,
  callback: (...args: any[]) => any,
) {
  context.subscriptions.push(
    vscode.commands.registerCommand(`diesel-migration.${commandId}`, callback),
  );
}

function setDieselToml() {
  vscode.window.showOpenDialog().then((value) => {
    if (value) {
      const path = value[0].fsPath;
      config.setDieselToml(path);
    }
  });
}

async function reload() {
  start_extension();
}

async function createMigration() {
  if (!diesel.isDieselCliInstalled()) {
    actionableErrorMessage("Diesel cli is not installed", [
      {
        label: "Install Diesel Cli",
        runWhenSelected: async () => {
          await diesel.installDieselCli();
          await reload();
        },
      },
    ]);
    return;
  }
  await diesel.createMigration();
}

import * as vscode from "vscode";
import * as config from "./config";
import { runIfCliInstalled, start_extension } from "./funs";
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
  runIfCliInstalled(() => {
    vscode.window.showOpenDialog().then((value) => {
      if (value) {
        const path = value[0].fsPath;
        config.setDieselToml(path);
      }
    });
  });
}

export async function reload() {
  runIfCliInstalled(() => {
    start_extension();
  });
}

async function createMigration() {
  runIfCliInstalled(async () => {
    await diesel.createMigration();
  });
}

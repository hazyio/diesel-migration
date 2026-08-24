import * as vscode from "vscode";
import * as config from "./config";
import { runIfCliInstalled, selectPath, start_extension } from "./utils";
import * as diesel from "./utils/diesel";

export function registerCommands(context: vscode.ExtensionContext) {
  pushCommand(context, "setDieselToml", setDieselToml);
  pushCommand(context, "reloadExtension", reload);
  pushCommand(context, "setupMigration", setupMigration);
  pushCommand(context, "setDieselTomlFromContext", setDieselTomlFromContext);
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
  runIfCliInstalled(async () => {
    let tomlPath = await selectPath("Select diesel.toml", undefined, {
      filters: { "TOML files": ["toml"] },
    });
    if (!tomlPath) {
      return;
    }
    config.setDieselToml(tomlPath.fsPath);
  });
}
function setDieselTomlFromContext(uri: vscode.Uri) {
  runIfCliInstalled(async () => {
    config.setDieselToml(uri.fsPath);
  });
}

export async function reload() {
  runIfCliInstalled(() => {
    start_extension();
  });
}

async function setupMigration() {
  runIfCliInstalled(async () => {
    await diesel.setUpMigration();
  });
}

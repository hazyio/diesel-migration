import * as vscode from "vscode";
import * as config from "./config";
import {
  runIfCliInstalled,
  selectPath,
  start_extension,
  useDieselToml,
} from "./utils";
import * as diesel from "./utils/diesel";

export function registerCommands(context: vscode.ExtensionContext) {
  pushCommand(context, "setDieselToml", setDieselToml);
  pushCommand(context, "reloadExtension", reload);
  pushCommand(context, "setupMigration", setupMigration);
  pushCommand(context, "setDieselTomlFromContext", setDieselTomlFromContext);
  pushCommand(context, "resetDatabase", resetDatabase);
  pushCommand(context, "resetDatabaseFromContext", resetDatabaseFromContext);
  pushCommand(context, "generateMigration", generateMigration);
  pushCommand(
    context,
    "generateMigrationFromContext",
    generateMigrationFromContext,
  );
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
    let tomlPath = await diesel.selectDieselToml();
    if (!tomlPath) {
      return;
    }
    await config.setDieselToml(tomlPath.fsPath);
  });
}
function setDieselTomlFromContext(uri: vscode.Uri) {
  runIfCliInstalled(async () => {
    await config.setDieselToml(uri.fsPath);
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

async function resetDatabase() {
  runIfCliInstalled(async () => {
    const dieselToml = await useDieselToml();
    if (!dieselToml) {
      await diesel.showSelectDieselTomlError();
      return;
    }
    await diesel.resetDatabase(dieselToml.fsPath);
  });
}
async function resetDatabaseFromContext(uri: vscode.Uri) {
  runIfCliInstalled(async () => {
    await diesel.resetDatabase(uri.fsPath);
  });
}

async function generateMigration() {
  runIfCliInstalled(async () => {
    const dieselToml = await useDieselToml();
    if (!dieselToml) {
      await diesel.showSelectDieselTomlError();
      return;
    }
    await diesel.generateMigration(dieselToml.fsPath);
  });
}
async function generateMigrationFromContext(uri: vscode.Uri) {
  runIfCliInstalled(async () => {
    await diesel.generateMigration(uri.fsPath);
  });
}

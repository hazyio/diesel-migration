import * as vscode from "vscode";
import * as config from "./config";
import {
  runIfCliInstalled,
  start_extension,
  useDieselToml
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
  pushCommand(context, "printSchema", printSchema);
  pushCommand(context, "printSchemaFromContext", printSchemaFromContext);
  pushCommand(context, "runMigration", runMigration);
  pushCommand(context, "revertMigration", revertMigration);
  pushCommand(context, "revertAllMigrations", revertAllMigrations);
  pushCommand(context, "redoMigration", redoMigration);
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
async function runIfToml(callback: (toml: string) => void) {
  const dieselToml = await useDieselToml();
  if (!dieselToml) {
    await diesel.showSelectDieselTomlError();
    return;
  }
  callback(dieselToml.fsPath);
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
    await runIfToml(async (dieselToml) => {
      await diesel.resetDatabase(dieselToml);
    });
  });
}
async function resetDatabaseFromContext(uri: vscode.Uri) {
  runIfCliInstalled(async () => {
    await diesel.resetDatabase(uri.fsPath);
  });
}

async function generateMigration() {
  runIfCliInstalled(async () => {
    await runIfToml(async (dieselToml) => {
      await diesel.generateMigration(dieselToml);
    });
  });
}
async function generateMigrationFromContext(uri: vscode.Uri) {
  runIfCliInstalled(async () => {
    await diesel.generateMigration(uri.fsPath);
  });
}

async function printSchema(uri?: vscode.Uri) {
  runIfCliInstalled(async () => {
    await runIfToml(async (dieselToml) => {
      await diesel.printSchema(dieselToml);
    });
  });
}
async function printSchemaFromContext(uri: vscode.Uri) {
  runIfCliInstalled(async () => {
    await diesel.printSchema(uri.fsPath);
  });
}

async function runMigration(uri?: vscode.Uri) {
  runIfCliInstalled(async () => {
    await runIfToml(async (dieselToml) => {
      await diesel.runMigration(dieselToml);
    });
  });
}
async function revertMigration(uri?: vscode.Uri) {
  runIfCliInstalled(async () => {
    await runIfToml(async (dieselToml) => {
      await diesel.revertMigration(dieselToml);
    });
  });
}
async function revertAllMigrations(uri?: vscode.Uri) {
  runIfCliInstalled(async () => {
    await runIfToml(async (dieselToml) => {
      await diesel.revertAllMigrations(dieselToml);
    });
  });
}
async function redoMigration(uri?: vscode.Uri) {
  runIfCliInstalled(async () => {
    await runIfToml(async (dieselToml) => {
      await diesel.redoMigration(dieselToml);
    });
  });
}

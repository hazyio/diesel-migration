import * as vscode from "vscode";
let migrationsDirectoryName = "";
let migrations: string[] = [];
let canDoOperations = false;
export function setCanDoOperations(value: boolean) {
  canDoOperations = value;
  setContext("canDoOperations", canDoOperations);
}
export function getCanDoOperations(): boolean {
  return canDoOperations;
}
export async function setMigrationDirectory(directory: string) {
  await setContext("migrationsDirectoryName", directory);
  migrationsDirectoryName = directory;
  console.log("setMigrationDirectory", directory);
}
export function getMigrationDirectory(): string {
  return migrationsDirectoryName;
}

export async function addMigration(migration: string) {
  migrations.push(migration);
  await setContext("migrations", migrations);
}
export function getMigrations(): string[] {
  return migrations;
}

async function setContext(id: string, value: any) {
  await vscode.commands.executeCommand(
    "setContext",
    `diesel-migration.${id}`,
    value,
  );
}

import * as vscode from "vscode";
let migrationsDirectory = "";
let migrations: string[] = [];
let canDoOperations = false;
export function setCanDoOperations(value: boolean) {
  canDoOperations = value;
}
export function getCanDoOperations(): boolean {
  return canDoOperations;
}
export async function setMigrationDirectory(directory: string) {
  await setContext("migrationDirectory", directory);
  migrationsDirectory = directory;
}
export function getMigrationDirectory(): string {
  return migrationsDirectory;
}

export async function addMigration(migration: string) {
  migrations.push(migration);
  await setContext("migrations", migrations);
}
export function getMigrations(): string[] {
  return migrations;
}

async function setContext(id: string, value: any) {
  await vscode.commands.executeCommand("setContext", `rust-buddy.${id}`, value);
}

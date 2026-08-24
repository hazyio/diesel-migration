import * as vscode from "vscode";
export async function getDieselToml(): Promise<string | undefined> {
  const config = vscode.workspace.getConfiguration("diesel-migration");
  return config.get("dieselToml");
}

export async function setDieselToml(value: string): Promise<void> {
  const config = vscode.workspace.getConfiguration("diesel-migration");
  return config.update("dieselToml", value);
}

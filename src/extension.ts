import * as vscode from "vscode";
import { registerCommands } from "./commands";
import { start_extension } from "./utils";

export async function activate(context: vscode.ExtensionContext) {
  registerCommands(context);
  await start_extension();
}

export function deactivate() {}

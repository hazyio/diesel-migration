import * as vscode from "vscode";
import { registerCommands } from "./commands";
import { start_extension } from "./funs";

export function activate(context: vscode.ExtensionContext) {
  registerCommands(context);
  start_extension();
}

export function deactivate() {}

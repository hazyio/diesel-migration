import * as vscode from "vscode";
export interface Choice<T> extends vscode.QuickPickItem {
  value: T;
}

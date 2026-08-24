import * as TOML from "@iarna/toml";
import * as vscode from "vscode";

interface DieselTomlConfig {
  print_schema?: {
    file?: string;
    [key: string]: unknown;
  };
  migrations_directory?: {
    dir?: string;
  };
  [key: string]: unknown;
}

export async function parseDieselToml(
  uri: vscode.Uri,
): Promise<DieselTomlConfig> {
  const bytes = await vscode.workspace.fs.readFile(uri);
  const content = Buffer.from(bytes).toString("utf-8");
  return TOML.parse(content) as unknown as DieselTomlConfig;
}

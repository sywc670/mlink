import * as vscode from "vscode";
import { MarkdownLinkIndex } from "./markdownIndex";

export function registerFileSystemWatcher(
    index: MarkdownLinkIndex,
    refresh: () => void,
): vscode.Disposable {
    const watcher = vscode.workspace.createFileSystemWatcher("**/*.md");

    watcher.onDidChange(async (uri) => {
        await index.updateFileIndex(uri.fsPath);
        refresh();
    });

    watcher.onDidCreate(async (uri) => {
        await index.updateFileIndex(uri.fsPath);
        refresh();
    });

    watcher.onDidDelete((uri) => {
        index.removeFile(uri.fsPath);
        refresh();
    });

    return watcher;
}

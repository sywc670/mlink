import * as vscode from "vscode";
import { LinkMetadata } from "./type";
import { LinkIndexManager, MarkdownLinksProvider } from "./link";
import path from "path";
import * as fs from "fs";

export async function activate(context: vscode.ExtensionContext) {
    const workspaceRoot = vscode.workspace.workspaceFolders?.[0].uri.fsPath;
    if (!workspaceRoot) {
        return;
    }

    const indexManager = new LinkIndexManager(workspaceRoot);

    vscode.window.withProgress(
        {
            location: vscode.ProgressLocation.Window,
            title: "MLink: Indexing...",
        },
        async () => {
            await indexManager.indexWorkspace();
            refreshAll();
        },
    );

    const linksProvider = new MarkdownLinksProvider(indexManager, "links");
    const backlinksProvider = new MarkdownLinksProvider(
        indexManager,
        "backlinks",
    );

    vscode.window.registerTreeDataProvider("mlink-links", linksProvider);
    vscode.window.registerTreeDataProvider(
        "mlink-backlinks",
        backlinksProvider,
    );

    function refreshAll() {
        linksProvider.refresh();
        backlinksProvider.refresh();
    }

    const watcher = vscode.workspace.createFileSystemWatcher("**/*.md");
    watcher.onDidChange(async (uri) => {
        await indexManager.updateFileIndex(uri.fsPath);
        refreshAll();
    });
    watcher.onDidCreate((uri) => indexManager.updateFileIndex(uri.fsPath));
    watcher.onDidDelete((uri) => indexManager.removeFile(uri.fsPath));

    context.subscriptions.push(
        watcher,
        vscode.window.onDidChangeActiveTextEditor(refreshAll),
        vscode.commands.registerCommand(
            "mlink.gotoLocation",
            async (meta: LinkMetadata) => {
                const absPath = path.join(workspaceRoot, meta.relPath);
                if (!fs.existsSync(absPath)) {
                    vscode.window.showErrorMessage(
                        `Path not found: ${meta.relPath}`,
                    );
                    return;
                }

                if (meta.isDir) {
                    // 如果是目录，在资源管理器中揭示
                    vscode.commands.executeCommand(
                        "revealInExplorer",
                        vscode.Uri.file(absPath),
                    );
                } else {
                    const doc = await vscode.workspace.openTextDocument(
                        vscode.Uri.file(absPath),
                    );
                    await vscode.window.showTextDocument(doc);
                }
            },
        ),
    );
}

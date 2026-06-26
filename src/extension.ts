import * as vscode from "vscode";
import { indexWorkspace, registerCommands } from "./commands";
import { isMarkdownEditor } from "./editorContext";
import { MarkdownLinkIndex } from "./markdownIndex";
import { MarkdownLinksProvider } from "./treeProvider";
import { registerFileSystemWatcher } from "./watchers";

export async function activate(context: vscode.ExtensionContext) {
    const workspaceRoot = vscode.workspace.workspaceFolders?.[0].uri.fsPath;
    if (!workspaceRoot) {
        return;
    }

    const indexManager = new MarkdownLinkIndex(workspaceRoot);
    const linksProvider = new MarkdownLinksProvider(indexManager);

    const refreshAll = (): void => {
        linksProvider.refresh();
    };
    const updateEditorContext = async (): Promise<void> => {
        await vscode.commands.executeCommand(
            "setContext",
            "mlink.isMarkdownEditor",
            isMarkdownEditor(vscode.window.activeTextEditor),
        );
        refreshAll();
    };

    initWorkspaceIndex(indexManager, refreshAll);
    await updateEditorContext();

    context.subscriptions.push(
        registerTreeView(linksProvider),
        registerCommands(indexManager, workspaceRoot, refreshAll),
        registerFileSystemWatcher(indexManager, refreshAll),
        vscode.window.onDidChangeActiveTextEditor(() => {
            void updateEditorContext();
        }),
    );
}

/**
 * Starts the initial workspace scan without blocking extension activation.
 */
function initWorkspaceIndex(
    indexManager: MarkdownLinkIndex,
    refresh: () => void,
): void {
    vscode.window.withProgress(
        {
            location: vscode.ProgressLocation.Window,
            title: "MLink: Indexing...",
        },
        async () => {
            await indexWorkspace(indexManager);
            refresh();
        },
    );
}

/**
 * Registers the unified links tree view.
 */
function registerTreeView(provider: MarkdownLinksProvider): vscode.Disposable {
    return vscode.window.registerTreeDataProvider("mlink-links", provider);
}

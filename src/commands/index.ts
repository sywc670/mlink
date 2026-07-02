import * as fs from "fs";
import * as path from "path";
import * as vscode from "vscode";
import { MarkdownLinkIndex } from "../services/markdown-index/MarkdownLinkIndex";
import { LinkMetadata } from "../shared/treeItems";

export function registerCommands(
    index: MarkdownLinkIndex,
    workspaceRoot: string,
    refresh: () => void,
): vscode.Disposable {
    const gotoCommand = vscode.commands.registerCommand(
        "mlink.gotoLocation",
        async (meta: LinkMetadata) => {
            await openLinkTarget(workspaceRoot, meta);
        },
    );

    const refreshCommand = vscode.commands.registerCommand(
        "mlink.refreshIndex",
        async () => {
            await vscode.window.withProgress(
                {
                    location: vscode.ProgressLocation.Window,
                    title: "MLink: Refreshing...",
                },
                async () => {
                    index.clear();
                    await indexWorkspace(index);
                    refresh();
                },
            );
        },
    );

    return vscode.Disposable.from(gotoCommand, refreshCommand);
}

export async function indexWorkspace(index: MarkdownLinkIndex): Promise<void> {
    const files = await vscode.workspace.findFiles(
        "**/*.md",
        "{**/node_modules/**,**/.git/**}",
    );
    await index.indexFiles(files.map((file) => file.fsPath));
}

async function openLinkTarget(
    workspaceRoot: string,
    meta: LinkMetadata,
): Promise<void> {
    const absPath = path.join(workspaceRoot, meta.relPath);
    if (!fs.existsSync(absPath)) {
        vscode.window.showErrorMessage(`Path does not exist: ${meta.relPath}`);
        return;
    }

    if (meta.isDir) {
        await vscode.commands.executeCommand(
            "revealInExplorer",
            vscode.Uri.file(absPath),
        );
        return;
    }

    const doc = await vscode.workspace.openTextDocument(vscode.Uri.file(absPath));
    const editor = await vscode.window.showTextDocument(doc);
    const line = Math.min(Math.max(meta.line, 0), doc.lineCount - 1);
    const position = new vscode.Position(line, 0);
    editor.selection = new vscode.Selection(position, position);
    editor.revealRange(
        new vscode.Range(position, position),
        vscode.TextEditorRevealType.InCenter,
    );
}

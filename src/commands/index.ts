import * as vscode from "vscode";
import { MarkdownLinkIndex } from "../services/markdown-index/MarkdownLinkIndex";
import { openLinkSource, openLinkTarget } from "./linkNavigation";
import { LinkCommandMetadata, resolveLinkCommandMetadata } from "./navigationTarget";

export function registerCommands(
    index: MarkdownLinkIndex,
    workspaceRoot: string,
    refresh: () => void,
): vscode.Disposable {
    const gotoCommand = vscode.commands.registerCommand(
        "mlink.gotoLocation",
        async (argument: unknown) => {
            const meta = getCommandMetadata(argument);
            if (!meta) {
                return;
            }

            await openLinkTarget(workspaceRoot, meta);
        },
    );

    const openSourceCommand = vscode.commands.registerCommand(
        "mlink.openLinkSource",
        async (argument: unknown) => {
            const meta = getCommandMetadata(argument);
            if (!meta) {
                return;
            }

            await openLinkSource(workspaceRoot, meta);
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

    return vscode.Disposable.from(gotoCommand, openSourceCommand, refreshCommand);
}

export async function indexWorkspace(index: MarkdownLinkIndex): Promise<void> {
    const files = await vscode.workspace.findFiles(
        "**/*.md",
        "{**/node_modules/**,**/.git/**}",
    );
    await index.indexFiles(files.map((file) => file.fsPath));
}

function getCommandMetadata(argument: unknown): LinkCommandMetadata | undefined {
    const meta = resolveLinkCommandMetadata(argument);
    if (!meta) {
        vscode.window.showErrorMessage("MLink: Missing link metadata.");
    }

    return meta;
}

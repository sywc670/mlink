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

    // 1. 初始化核心管理器
    const indexManager = new LinkIndexManager(workspaceRoot);

    // 2. 初始化视图提供者
    const linksProvider = new MarkdownLinksProvider(indexManager, "links");
    const backlinksProvider = new MarkdownLinksProvider(
        indexManager,
        "backlinks",
    );

    const refreshAll = () => {
        linksProvider.refresh();
        backlinksProvider.refresh();
    };

    // 3. 执行初次扫描（不阻塞激活过程）
    initWorkspaceIndex(indexManager, refreshAll);

    // 4. 注册所有组件
    context.subscriptions.push(
        registerTreeView(linksProvider, backlinksProvider),
        registerCommands(indexManager, workspaceRoot, refreshAll),
        registerFileSystemWatcher(indexManager, refreshAll),
        vscode.window.onDidChangeActiveTextEditor(refreshAll),
    );
}

/**
 * 逻辑拆分：初次全局扫描
 */
function initWorkspaceIndex(
    indexManager: LinkIndexManager,
    refresh: () => void,
) {
    vscode.window.withProgress(
        {
            location: vscode.ProgressLocation.Window,
            title: "MLink: Indexing...",
        },
        async () => {
            await indexManager.indexWorkspace();
            refresh();
        },
    );
}

/**
 * 逻辑拆分：注册 UI 视图
 */
function registerTreeView(
    lp: MarkdownLinksProvider,
    bp: MarkdownLinksProvider,
): vscode.Disposable {
    return vscode.Disposable.from(
        vscode.window.registerTreeDataProvider("mlink-links", lp),
        vscode.window.registerTreeDataProvider("mlink-backlinks", bp),
    );
}

/**
 * 逻辑拆分：注册命令集
 */
function registerCommands(
    indexManager: LinkIndexManager,
    workspaceRoot: string,
    refresh: () => void,
): vscode.Disposable {
    const gotoCommand = vscode.commands.registerCommand(
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
                    await indexManager.reloadAll();
                    refresh();
                },
            );
        },
    );

    return vscode.Disposable.from(gotoCommand, refreshCommand);
}

/**
 * 逻辑拆分：注册文件系统监听
 */
function registerFileSystemWatcher(
    indexManager: LinkIndexManager,
    refresh: () => void,
): vscode.Disposable {
    const watcher = vscode.workspace.createFileSystemWatcher("**/*.md");

    watcher.onDidChange(async (uri) => {
        await indexManager.updateFileIndex(uri.fsPath);
        refresh();
    });

    watcher.onDidCreate(async (uri) => {
        await indexManager.updateFileIndex(uri.fsPath);
        refresh();
    });

    watcher.onDidDelete((uri) => {
        indexManager.removeFile(uri.fsPath);
        refresh();
    });

    return watcher;
}

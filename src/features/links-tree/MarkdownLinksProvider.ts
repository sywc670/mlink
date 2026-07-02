import * as path from "path";
import * as vscode from "vscode";
import { MarkdownLinkIndex } from "../../services/markdown-index/MarkdownLinkIndex";
import { isMarkdownEditor } from "../../shared/editorContext";
import { LinkItem, SectionItem } from "../../shared/treeItems";

type TreeNode = LinkItem | SectionItem;

export class MarkdownLinksProvider implements vscode.TreeDataProvider<TreeNode> {
    private readonly onDidChangeTreeDataEmitter = new vscode.EventEmitter<
        TreeNode | undefined | void
    >();
    readonly onDidChangeTreeData = this.onDidChangeTreeDataEmitter.event;

    constructor(private readonly index: MarkdownLinkIndex) {}

    refresh(): void {
        this.onDidChangeTreeDataEmitter.fire();
    }

    getTreeItem(element: TreeNode): vscode.TreeItem {
        return element;
    }

    async getChildren(element?: TreeNode): Promise<TreeNode[]> {
        const editor = vscode.window.activeTextEditor;
        if (!isMarkdownEditor(editor)) {
            return [];
        }

        if (!element) {
            return [
                new SectionItem("links", "Links"),
                new SectionItem("backlinks", "Backlinks"),
            ];
        }

        if (!(element instanceof SectionItem)) {
            return [];
        }

        const currentAbs = editor.document.uri.fsPath;
        if (element.type === "links") {
            return this.index.getOutgoing(currentAbs).map(
                (info) =>
                    new LinkItem({
                        label: path.basename(info.relPath),
                        description: info.relPath,
                        relPath: info.relPath,
                        line: info.line,
                        type: "links",
                        isDir: info.isDir,
                    }),
            );
        }

        return this.index.getBacklinks(currentAbs).map(
            (info) =>
                new LinkItem({
                    label: path.basename(info.relPath),
                    description: `${info.relPath}:${info.line + 1}`,
                    relPath: info.relPath,
                    line: info.line,
                    type: "backlinks",
                    isDir: info.isDir,
                }),
        );
    }
}

import * as vscode from "vscode";

export interface LinkMetadata {
    label: string;
    description: string;
    relPath: string;
    line: number;
    type: "links" | "backlinks";
    isDir: boolean; // 新增：标记是否为目录
}

export class LinkItem extends vscode.TreeItem {
    constructor(public readonly meta: LinkMetadata) {
        super(meta.label, vscode.TreeItemCollapsibleState.None);
        this.description = meta.description;
        // 根据是否为目录显示不同图标
        this.iconPath = meta.isDir
            ? new vscode.ThemeIcon("folder")
            : new vscode.ThemeIcon(
                  meta.type === "links" ? "link" : "link-external",
              );

        this.contextValue = meta.isDir ? "directory" : "file";
        this.command = {
            command: "mlink.gotoLocation",
            title: "Open",
            arguments: [meta],
        };
    }
}

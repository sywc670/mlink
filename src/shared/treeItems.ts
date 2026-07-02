import * as vscode from "vscode";

export interface LinkMetadata {
    label: string;
    description: string;
    relPath: string;
    sourceRelPath: string;
    line: number;
    type: "links" | "backlinks";
    isDir: boolean;
    slug?: string;
}

/**
 * Represents a collapsible group in the links tree.
 */
export class SectionItem extends vscode.TreeItem {
    constructor(
        public readonly type: "links" | "backlinks",
        label: string,
    ) {
        super(label, vscode.TreeItemCollapsibleState.Expanded);
        this.contextValue = "section";
        this.iconPath = new vscode.ThemeIcon(
            type === "links" ? "link" : "references",
        );
    }
}

export class LinkItem extends vscode.TreeItem {
    constructor(public readonly meta: LinkMetadata) {
        super(meta.label, vscode.TreeItemCollapsibleState.None);
        this.description = meta.description;
        // Use a directory icon when the link target is a folder.
        this.iconPath = meta.isDir
            ? new vscode.ThemeIcon("folder")
            : new vscode.ThemeIcon(
                  meta.type === "links" ? "link" : "link-external",
              );

        this.contextValue = `${meta.type}-${meta.isDir ? "directory" : "file"}`;
        this.command = {
            command: "mlink.gotoLocation",
            title: "Open",
            arguments: [meta],
        };
    }
}

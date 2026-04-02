import * as vscode from "vscode";
import { LinkItem } from "./type";
import * as path from "path";
import * as fs from "fs";

export class LinkIndexManager {
    private forwardLinks = new Map<
        string,
        Set<{ relPath: string; isDir: boolean }>
    >();
    private readonly EXCLUDED_EXTS = [
        ".png",
        ".jpg",
        ".jpeg",
        ".gif",
        ".svg",
        ".webp",
        ".pdf",
        ".zip",
    ];

    constructor(private root: string) {}

    private toRel(fsPath: string): string {
        return path.relative(this.root, fsPath).replace(/\\/g, "/");
    }

    /**
     * 核心逻辑：验证路径并确定类型
     */
    private resolveAndVerify(
        currentFileAbs: string,
        targetRaw: string,
    ): { relPath: string; isDir: boolean } | null {
        const targetClean = targetRaw.split("#")[0].split("?")[0].trim();
        if (
            !targetClean ||
            targetClean === "/" ||
            targetClean.startsWith("http")
        ) {
            return null;
        }

        const ext = path.extname(targetClean).toLowerCase();
        if (this.EXCLUDED_EXTS.includes(ext)) {
            return null;
        }

        let absTarget = targetClean.startsWith("/")
            ? path.join(this.root, targetClean)
            : path.resolve(path.dirname(currentFileAbs), targetClean);

        // 尝试多种可能性进行匹配
        let finalPath = absTarget;

        // 1. 直接检查原始路径是否存在
        if (fs.existsSync(finalPath)) {
            return {
                relPath: this.toRel(finalPath),
                isDir: fs.statSync(finalPath).isDirectory(),
            };
        }

        // 2. 如果不存在且没有扩展名，尝试补全 .md
        if (ext === "") {
            const withMd = finalPath + ".md";
            if (fs.existsSync(withMd)) {
                return { relPath: this.toRel(withMd), isDir: false };
            }
        }

        // 3. 如果依然不存在，则不显示该链接
        return null;
    }

    async indexWorkspace() {
        const files = await vscode.workspace.findFiles(
            "**/*.md",
            "**/node_modules/**",
        );
        for (const file of files) {
            await this.updateFileIndex(file.fsPath);
        }
    }

    async updateFileIndex(filePath: string) {
        try {
            const content = await fs.promises.readFile(filePath, "utf-8");
            const sourceRel = this.toRel(filePath);
            const links = new Set<{ relPath: string; isDir: boolean }>();

            // 排除图片语法 ![]()
            const linkPattern = /(?<!\!)\[\[(.*?)\]\]|(?<!\!)\[.*?\]\((.*?)\)/g;
            let match;

            while ((match = linkPattern.exec(content)) !== null) {
                const raw = match[1] || match[2];
                const verified = this.resolveAndVerify(filePath, raw);
                if (verified) {
                    // 检查是否重复添加（Set 需要处理对象引用，这里手动检查或转 string）
                    if (
                        !Array.from(links).some(
                            (l) => l.relPath === verified.relPath,
                        )
                    ) {
                        links.add(verified);
                    }
                }
            }
            this.forwardLinks.set(sourceRel, links);
        } catch {
            this.forwardLinks.delete(this.toRel(filePath));
        }
    }

    removeFile(filePath: string) {
        this.forwardLinks.delete(this.toRel(filePath));
    }

    getOutgoing(sourceAbs: string) {
        return Array.from(this.forwardLinks.get(this.toRel(sourceAbs)) || []);
    }

    getBacklinks(targetAbs: string) {
        const targetRel = this.toRel(targetAbs);
        const backers: string[] = [];
        this.forwardLinks.forEach((links, source) => {
            if (Array.from(links).some((l) => l.relPath === targetRel)) {
                backers.push(source);
            }
        });
        return backers;
    }
}

export class MarkdownLinksProvider implements vscode.TreeDataProvider<LinkItem> {
    private _onDidChangeTreeData = new vscode.EventEmitter<
        LinkItem | undefined | void
    >();
    readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

    constructor(
        private index: LinkIndexManager,
        private type: "links" | "backlinks",
    ) {}

    refresh() {
        this._onDidChangeTreeData.fire();
    }
    getTreeItem(element: LinkItem) {
        return element;
    }

    async getChildren(): Promise<LinkItem[]> {
        const editor = vscode.window.activeTextEditor;
        if (!editor || editor.document.languageId !== "markdown") {
            return [];
        }

        const currentAbs = editor.document.uri.fsPath;
        if (this.type === "links") {
            return this.index.getOutgoing(currentAbs).map(
                (info) =>
                    new LinkItem({
                        label: path.basename(info.relPath),
                        description: info.relPath,
                        relPath: info.relPath,
                        line: 0,
                        type: "links",
                        isDir: info.isDir,
                    }),
            );
        } else {
            return this.index.getBacklinks(currentAbs).map(
                (rel) =>
                    new LinkItem({
                        label: path.basename(rel),
                        description: rel,
                        relPath: rel,
                        line: 0,
                        type: "backlinks",
                        isDir: false, // Backlinks 来源必然是 .md 文件
                    }),
            );
        }
    }
}

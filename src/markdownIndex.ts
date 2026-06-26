import * as fs from "fs";
import * as path from "path";

export interface LinkEntry {
    relPath: string;
    isDir: boolean;
    line: number;
}

const excludedExtensions = new Set([
    ".png",
    ".jpg",
    ".jpeg",
    ".gif",
    ".svg",
    ".webp",
]);

/**
 * Maintains an in-memory index of local Markdown links for a workspace.
 */
export class MarkdownLinkIndex {
    private forwardLinks = new Map<string, LinkEntry[]>();

    constructor(private readonly root: string) {}

    async indexFiles(filePaths: readonly string[]): Promise<void> {
        for (const filePath of filePaths) {
            await this.updateFileIndex(filePath);
        }
    }

    async updateFileIndex(filePath: string): Promise<void> {
        try {
            const content = await fs.promises.readFile(filePath, "utf-8");
            const sourceRel = this.toRootRel(filePath);
            const links: LinkEntry[] = [];

            for (const match of content.matchAll(/(?<!\!)\[.*?\]\((.*?)\)/g)) {
                const rawTarget = match[1];
                const verified = this.resolveAndVerify(filePath, rawTarget);

                if (
                    verified &&
                    !links.some((link) => link.relPath === verified.relPath)
                ) {
                    links.push({
                        ...verified,
                        line: getLineNumber(content, match.index ?? 0),
                    });
                }
            }

            this.forwardLinks.set(sourceRel, links);
        } catch {
            this.removeFile(filePath);
        }
    }

    removeFile(filePath: string): void {
        this.forwardLinks.delete(this.toRootRel(filePath));
    }

    clear(): void {
        this.forwardLinks.clear();
    }

    getOutgoing(sourceAbs: string): LinkEntry[] {
        return this.forwardLinks.get(this.toRootRel(sourceAbs)) ?? [];
    }

    getBacklinks(targetAbs: string): LinkEntry[] {
        const targetRel = this.toRootRel(targetAbs);
        const backers: LinkEntry[] = [];

        this.forwardLinks.forEach((links, source) => {
            const link = links.find((entry) => entry.relPath === targetRel);
            if (link) {
                backers.push({
                    relPath: source,
                    isDir: false,
                    line: link.line,
                });
            }
        });

        return backers;
    }

    private toRootRel(fsPath: string): string {
        return path.relative(this.root, fsPath).replace(/\\/g, "/");
    }

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
        if (excludedExtensions.has(ext)) {
            return null;
        }

        const absTarget = targetClean.startsWith("/")
            ? path.join(this.root, targetClean)
            : path.resolve(path.dirname(currentFileAbs), targetClean);

        if (fs.existsSync(absTarget)) {
            return {
                relPath: this.toRootRel(absTarget),
                isDir: fs.statSync(absTarget).isDirectory(),
            };
        }

        if (ext === "") {
            const withMd = `${absTarget}.md`;
            if (fs.existsSync(withMd)) {
                return { relPath: this.toRootRel(withMd), isDir: false };
            }
        }

        return null;
    }
}

function getLineNumber(content: string, offset: number): number {
    return content.slice(0, offset).split(/\r\n|\r|\n/).length - 1;
}

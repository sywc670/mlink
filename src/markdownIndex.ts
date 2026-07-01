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
    private backwardLinks = new Map<string, LinkEntry[]>();

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

            this.removeSourceBacklinks(sourceRel);
            this.forwardLinks.set(sourceRel, links);
            this.addSourceBacklinks(sourceRel, links);
        } catch {
            this.removeFile(filePath);
        }
    }

    removeFile(filePath: string): void {
        const sourceRel = this.toRootRel(filePath);
        this.removeSourceBacklinks(sourceRel);
        this.forwardLinks.delete(sourceRel);
    }

    clear(): void {
        this.forwardLinks.clear();
        this.backwardLinks.clear();
    }

    getOutgoing(sourceAbs: string): LinkEntry[] {
        return this.forwardLinks.get(this.toRootRel(sourceAbs)) ?? [];
    }

    getBacklinks(targetAbs: string): LinkEntry[] {
        const targetRel = this.toRootRel(targetAbs);
        return this.backwardLinks.get(targetRel) ?? [];
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

    /**
     * Adds reverse lookup entries so backlink reads do not scan every file.
     */
    private addSourceBacklinks(sourceRel: string, links: readonly LinkEntry[]): void {
        for (const link of links) {
            const backers = this.backwardLinks.get(link.relPath) ?? [];
            backers.push({
                relPath: sourceRel,
                isDir: false,
                line: link.line,
            });
            this.backwardLinks.set(link.relPath, backers);
        }
    }

    /**
     * Removes stale reverse lookup entries before a source file is re-indexed.
     */
    private removeSourceBacklinks(sourceRel: string): void {
        const links = this.forwardLinks.get(sourceRel) ?? [];

        for (const link of links) {
            const nextBackers = (this.backwardLinks.get(link.relPath) ?? []).filter(
                (backer) => backer.relPath !== sourceRel,
            );

            if (nextBackers.length === 0) {
                this.backwardLinks.delete(link.relPath);
                continue;
            }

            this.backwardLinks.set(link.relPath, nextBackers);
        }
    }
}

function getLineNumber(content: string, offset: number): number {
    return content.slice(0, offset).split(/\r\n|\r|\n/).length - 1;
}

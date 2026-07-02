import * as fs from "fs";
import * as path from "path";
import { normalizeHeadingFragment } from "../markdown-parser/markdownHeadings";

/**
 * Describes a verified local Markdown link found in a source file.
 *
 * Heading example: `[Usage](docs/guide.md#usage-guide)` in `README.md`
 * becomes
 * `{ relPath: "docs/guide.md", isDir: false, line: 8, slug: "usage-guide" }`.
 *
 * Backlink example: when `README.md` links to `docs/guide.md#usage-guide`,
 * the backlink entry for `docs/guide.md` becomes
 * `{ relPath: "README.md", isDir: false, line: 8, slug: "usage-guide" }`.
 * The `slug` still describes the target heading in `docs/guide.md`, not a
 * heading inside `README.md`.
 */
export interface LinkEntry {
    /**
     * Workspace-relative path.
     * For outgoing links this is the target path; for backlinks this is the
     * source path that contains the link.
     */
    relPath: string;
    /** Whether the resolved target path points to a directory. */
    isDir: boolean;
    /** Zero-based line number where the link appears in the source file. */
    line: number;
    /** Normalized target heading anchor when the link contains a fragment. */
    slug?: string;
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
                const line = getLineNumber(content, match.index ?? 0);

                if (
                    verified &&
                    !links.some((link) => linkKey(link) === linkKey(verified))
                ) {
                    links.push({
                        relPath: verified.relPath,
                        isDir: verified.isDir,
                        line,
                        ...(verified.slug ? { slug: verified.slug } : {}),
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

    /**
     * Converts an absolute workspace path to the normalized path used by index entries.
     */
    toWorkspaceRelative(fsPath: string): string {
        return this.toRootRel(fsPath);
    }

    getBacklinks(targetAbs: string): LinkEntry[] {
        const targetRel = this.toRootRel(targetAbs);
        return this.backwardLinks.get(targetRel) ?? [];
    }

    getReferencedHeadingSlugs(targetAbs: string): string[] {
        const targetRel = this.toRootRel(targetAbs);
        const slugs = new Set<string>();

        (this.backwardLinks.get(targetRel) ?? []).forEach((backlink) => {
            if (backlink.slug) {
                slugs.add(backlink.slug);
            }
        });

        return [...slugs];
    }

    private toRootRel(fsPath: string): string {
        return path.relative(this.root, fsPath).replace(/\\/g, "/");
    }

    private resolveAndVerify(
        currentFileAbs: string,
        targetRaw: string,
    ): { relPath: string; isDir: boolean; slug?: string } | null {
        const { pathPart, fragment } = splitMarkdownTarget(targetRaw);
        const targetClean = pathPart.split("?")[0].trim();
        if (!targetClean && !fragment) {
            return null;
        }

        if (targetClean === "/" || targetClean.startsWith("http")) {
            return null;
        }

        const ext = path.extname(targetClean).toLowerCase();
        if (excludedExtensions.has(ext)) {
            return null;
        }

        const absTarget = !targetClean
            ? currentFileAbs
            : targetClean.startsWith("/")
              ? path.join(this.root, targetClean)
              : path.resolve(path.dirname(currentFileAbs), targetClean);

        if (fs.existsSync(absTarget)) {
            return {
                relPath: this.toRootRel(absTarget),
                isDir: fs.statSync(absTarget).isDirectory(),
                slug: fragment ? normalizeHeadingFragment(fragment) : undefined,
            };
        }

        if (ext === "") {
            const withMd = `${absTarget}.md`;
            if (fs.existsSync(withMd)) {
                return {
                    relPath: this.toRootRel(withMd),
                    isDir: false,
                    slug: fragment
                        ? normalizeHeadingFragment(fragment)
                        : undefined,
                };
            }
        }

        return null;
    }

    /**
     * Adds reverse lookup entries so backlink reads do not scan every file.
     */
    private addSourceBacklinks(
        sourceRel: string,
        links: readonly LinkEntry[],
    ): void {
        for (const link of links) {
            const backers = this.backwardLinks.get(link.relPath) ?? [];
            backers.push({
                relPath: sourceRel,
                isDir: false,
                line: link.line,
                ...(link.slug ? { slug: link.slug } : {}),
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
            const nextBackers = (
                this.backwardLinks.get(link.relPath) ?? []
            ).filter((backer) => backer.relPath !== sourceRel);

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

function linkKey(link: Pick<LinkEntry, "relPath" | "slug">): string {
    return `${link.relPath}#${link.slug ?? ""}`;
}

function splitMarkdownTarget(targetRaw: string): {
    pathPart: string;
    fragment: string | null;
} {
    const hashIndex = targetRaw.indexOf("#");
    if (hashIndex === -1) {
        return { pathPart: targetRaw, fragment: null };
    }

    return {
        pathPart: targetRaw.slice(0, hashIndex),
        fragment: targetRaw
            .slice(hashIndex + 1)
            .split("?")[0]
            .trim(),
    };
}

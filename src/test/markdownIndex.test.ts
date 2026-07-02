import * as assert from "assert";
import * as fs from "fs/promises";
import * as os from "os";
import * as path from "path";
import test from "node:test";
import { MarkdownLinkIndex } from "../services/markdown-index/MarkdownLinkIndex";

test("indexes local links, backlinks, and inferred markdown extensions", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "mlink-"));
    try {
        const noteA = path.join(root, "a.md");
        const noteB = path.join(root, "folder", "b.md");
        const assets = path.join(root, "assets");

        await fs.mkdir(path.dirname(noteB), { recursive: true });
        await fs.mkdir(assets);
        await fs.writeFile(
            noteA,
            [
                "# A",
                "[B without extension](folder/b)",
                "[Assets directory](assets)",
                "![Image](image.png)",
                "[External](https://example.com)",
            ].join("\n"),
        );
        await fs.writeFile(noteB, "[A](/a.md)\n");

        const index = new MarkdownLinkIndex(root);
        await index.indexFiles([noteA, noteB]);

        assert.deepStrictEqual(index.getOutgoing(noteA), [
            { relPath: "folder/b.md", isDir: false, line: 1 },
            { relPath: "assets", isDir: true, line: 2 },
        ]);
        assert.deepStrictEqual(index.getBacklinks(noteB), [
            { relPath: "a.md", isDir: false, line: 1 },
        ]);
        assert.deepStrictEqual(index.getBacklinks(noteA), [
            { relPath: "folder/b.md", isDir: false, line: 0 },
        ]);
    } finally {
        await fs.rm(root, { recursive: true, force: true });
    }
});

test("removes a file from the in-memory index", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "mlink-"));
    try {
        const source = path.join(root, "source.md");
        const target = path.join(root, "target.md");

        await fs.writeFile(source, "[Target](target.md)");
        await fs.writeFile(target, "# Target");

        const index = new MarkdownLinkIndex(root);
        await index.indexFiles([source, target]);
        index.removeFile(source);

        assert.deepStrictEqual(index.getOutgoing(source), []);
        assert.deepStrictEqual(index.getBacklinks(target), []);
    } finally {
        await fs.rm(root, { recursive: true, force: true });
    }
});

test("updates cached backlinks when a file is re-indexed", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "mlink-"));
    try {
        const source = path.join(root, "source.md");
        const firstTarget = path.join(root, "first.md");
        const secondTarget = path.join(root, "second.md");

        await fs.writeFile(source, "[First](first.md)");
        await fs.writeFile(firstTarget, "# First");
        await fs.writeFile(secondTarget, "# Second");

        const index = new MarkdownLinkIndex(root);
        await index.indexFiles([source, firstTarget, secondTarget]);

        assert.deepStrictEqual(index.getBacklinks(firstTarget), [
            { relPath: "source.md", isDir: false, line: 0 },
        ]);

        await fs.writeFile(source, "[Second](second.md)");
        await index.updateFileIndex(source);

        assert.deepStrictEqual(index.getBacklinks(firstTarget), []);
        assert.deepStrictEqual(index.getBacklinks(secondTarget), [
            { relPath: "source.md", isDir: false, line: 0 },
        ]);
    } finally {
        await fs.rm(root, { recursive: true, force: true });
    }
});

test("indexes heading references for local and cross-file links", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "mlink-"));
    try {
        const source = path.join(root, "source.md");
        const target = path.join(root, "target.md");

        await fs.writeFile(
            source,
            [
                "# Source",
                "[Local](#Source)",
                "[Target heading](target.md#Usage%20Guide)",
            ].join("\n"),
        );
        await fs.writeFile(target, ["# Target", "## Usage Guide"].join("\n"));

        const index = new MarkdownLinkIndex(root);
        await index.indexFiles([source, target]);

        assert.deepStrictEqual(index.getReferencedHeadingSlugs(source), ["source"]);
        assert.deepStrictEqual(index.getReferencedHeadingSlugs(target), [
            "usage-guide",
        ]);
    } finally {
        await fs.rm(root, { recursive: true, force: true });
    }
});

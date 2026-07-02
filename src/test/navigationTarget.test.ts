import * as assert from "assert";
import test from "node:test";
import {
    getSourceNavigationTarget,
    resolveLinkCommandMetadata,
} from "../commands/navigationTarget";

test("resolves outgoing link source lines", () => {
    assert.deepStrictEqual(
        getSourceNavigationTarget({
            relPath: "target.md",
            sourceRelPath: "source.md",
            line: 4,
            type: "links",
            isDir: false,
        }),
        { relPath: "source.md", line: 4 },
    );
});

test("resolves backlink source lines", () => {
    assert.deepStrictEqual(
        getSourceNavigationTarget({
            relPath: "source.md",
            sourceRelPath: "source.md",
            line: 7,
            type: "backlinks",
            isDir: false,
        }),
        { relPath: "source.md", line: 7 },
    );
});

test("resolves link metadata passed directly from a tree item command", () => {
    assert.deepStrictEqual(
        resolveLinkCommandMetadata({
            relPath: "target.md",
            sourceRelPath: "source.md",
            line: 2,
            type: "links",
            isDir: false,
            slug: "usage",
        }),
        {
            relPath: "target.md",
            sourceRelPath: "source.md",
            line: 2,
            type: "links",
            isDir: false,
            slug: "usage",
        },
    );
});

test("resolves link metadata wrapped by tree context menu arguments", () => {
    assert.deepStrictEqual(
        resolveLinkCommandMetadata({
            meta: {
                relPath: "target.md",
                sourceRelPath: "source.md",
                line: 3,
                type: "links",
                isDir: true,
            },
        }),
        {
            relPath: "target.md",
            sourceRelPath: "source.md",
            line: 3,
            type: "links",
            isDir: true,
        },
    );
});

test("rejects invalid link command arguments", () => {
    assert.equal(resolveLinkCommandMetadata(undefined), undefined);
    assert.equal(resolveLinkCommandMetadata({ relPath: "target.md" }), undefined);
});

import * as assert from "assert";
import test from "node:test";
import {
    getReferencedHeadingMarks,
    normalizeHeadingFragment,
    parseMarkdownHeadings,
} from "../services/markdown-parser/markdownHeadings";

test("parses markdown headings and ignores fenced code blocks", () => {
    const content = [
        "# Intro",
        "```",
        "# Ignored",
        "```",
        "## Usage Guide ##",
        "## Usage Guide",
    ].join("\n");

    assert.deepStrictEqual(parseMarkdownHeadings(content), [
        { line: 0, level: 1, text: "Intro", slug: "intro" },
        { line: 4, level: 2, text: "Usage Guide", slug: "usage-guide" },
        { line: 5, level: 2, text: "Usage Guide", slug: "usage-guide-1" },
    ]);
});

test("normalizes encoded heading fragments", () => {
    assert.equal(normalizeHeadingFragment("#Usage%20Guide"), "usage-guide");
});

test("finds heading hash marks for referenced slugs", () => {
    const content = ["# Intro", "## Usage", "## Details"].join("\n");

    assert.deepStrictEqual(getReferencedHeadingMarks(content, ["usage"]), [
        { line: 1, hashLength: 2 },
    ]);
});

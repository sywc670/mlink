import { strict as assert } from "assert";
import { test } from "node:test";
import type * as vscode from "vscode";
import { isMarkdownEditor } from "./editorContext";

function editorWithLanguage(languageId: string): Pick<vscode.TextEditor, "document"> {
    return {
        document: { languageId } as vscode.TextDocument,
    };
}

test("detects markdown editors for link UI visibility", () => {
    assert.equal(isMarkdownEditor(editorWithLanguage("markdown")), true);
    assert.equal(isMarkdownEditor(editorWithLanguage("typescript")), false);
    assert.equal(isMarkdownEditor(undefined), false);
});

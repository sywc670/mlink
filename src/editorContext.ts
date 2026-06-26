import type * as vscode from "vscode";

type EditorLike = Pick<vscode.TextEditor, "document"> | undefined;

/**
 * Checks whether the current editor should drive Markdown link UI.
 */
export function isMarkdownEditor(
    editor: EditorLike,
): editor is Pick<vscode.TextEditor, "document"> {
    return editor?.document.languageId === "markdown";
}

import * as vscode from "vscode";
import { MarkdownLinkIndex } from "../../services/markdown-index/MarkdownLinkIndex";
import { getReferencedHeadingMarks } from "../../services/markdown-parser/markdownHeadings";
import { isMarkdownEditor } from "../../shared/editorContext";
import { referencedHeadingDecorationOptions } from "./headingDecorationStyle";

/**
 * Highlights heading markers when the heading is referenced by Markdown links.
 */
export class HeadingReferenceDecorator implements vscode.Disposable {
    private readonly decorationType =
        vscode.window.createTextEditorDecorationType(referencedHeadingDecorationOptions);

    private readonly disposables: vscode.Disposable[] = [];

    constructor(private readonly index: MarkdownLinkIndex) {
        this.disposables.push(
            this.decorationType,
            vscode.window.onDidChangeActiveTextEditor((editor) => {
                this.refresh(editor);
            }),
            vscode.workspace.onDidChangeTextDocument((event) => {
                const editor = vscode.window.activeTextEditor;
                if (editor?.document === event.document) {
                    this.refresh(editor);
                }
            }),
        );
    }

    refresh(editor = vscode.window.activeTextEditor): void {
        if (!isMarkdownEditor(editor)) {
            return;
        }

        const slugs = this.index.getReferencedHeadingSlugs(editor.document.uri.fsPath);
        const marks = getReferencedHeadingMarks(editor.document.getText(), slugs);
        const options = marks.map((mark) => ({
            range: new vscode.Range(mark.line, 0, mark.line, mark.hashLength),
            hoverMessage: "Referenced by Markdown link",
        }));

        editor.setDecorations(this.decorationType, options);
    }

    dispose(): void {
        this.disposables.forEach((disposable) => {
            disposable.dispose();
        });
    }
}

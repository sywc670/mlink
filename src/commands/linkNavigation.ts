import * as fs from "fs";
import * as path from "path";
import * as vscode from "vscode";
import { findHeadingLine } from "../services/markdown-parser/markdownHeadings";
import {
    getSourceNavigationTarget,
    LinkCommandMetadata,
} from "./navigationTarget";

/**
 * Opens the resolved target of a Markdown link tree item.
 */
export async function openLinkTarget(
    workspaceRoot: string,
    meta: LinkCommandMetadata,
): Promise<void> {
    const absPath = path.join(workspaceRoot, meta.relPath);
    if (!fs.existsSync(absPath)) {
        vscode.window.showErrorMessage(`Path does not exist: ${meta.relPath}`);
        return;
    }

    if (meta.isDir) {
        await vscode.commands.executeCommand(
            "revealInExplorer",
            vscode.Uri.file(absPath),
        );
        return;
    }

    const doc = await vscode.workspace.openTextDocument(vscode.Uri.file(absPath));
    const editor = await vscode.window.showTextDocument(doc);
    revealLine(editor, getTargetLine(doc, meta));
}

/**
 * Opens the source line where the Markdown link is written.
 */
export async function openLinkSource(
    workspaceRoot: string,
    meta: LinkCommandMetadata,
): Promise<void> {
    const target = getSourceNavigationTarget(meta);
    await openFileAtLine(workspaceRoot, target.relPath, target.line);
}

async function openFileAtLine(
    workspaceRoot: string,
    relPath: string,
    line: number,
): Promise<void> {
    const absPath = path.join(workspaceRoot, relPath);
    if (!fs.existsSync(absPath)) {
        vscode.window.showErrorMessage(`Path does not exist: ${relPath}`);
        return;
    }

    const doc = await vscode.workspace.openTextDocument(vscode.Uri.file(absPath));
    const editor = await vscode.window.showTextDocument(doc);
    revealLine(editor, clampLine(line, doc.lineCount));
}

function getTargetLine(
    doc: vscode.TextDocument,
    meta: LinkCommandMetadata,
): number {
    if (meta.slug) {
        const headingLine = findHeadingLine(doc.getText(), meta.slug);
        if (headingLine !== undefined) {
            return headingLine;
        }
    }

    return clampLine(meta.line, doc.lineCount);
}

function revealLine(editor: vscode.TextEditor, line: number): void {
    const position = new vscode.Position(line, 0);
    editor.selection = new vscode.Selection(position, position);
    editor.revealRange(
        new vscode.Range(position, position),
        vscode.TextEditorRevealType.InCenter,
    );
}

function clampLine(line: number, lineCount: number): number {
    return Math.min(Math.max(line, 0), lineCount - 1);
}

import type * as vscode from "vscode";

/**
 * Keeps referenced heading markers visible without forcing high-contrast colors.
 */
export const referencedHeadingDecorationOptions: vscode.DecorationRenderOptions = {
    backgroundColor: "rgba(128, 128, 128, 0.18)",
    border: "1px solid rgba(128, 128, 128, 0.28)",
    borderRadius: "2px",
};

# MLink - Markdown Links and Backlinks

**MLink** is a VS Code extension designed for Markdown creators and knowledge base managers (like Obsidian or Logseq users). It automatically analyzes **Outgoing Links** and **Backlinks** for your current document, providing a seamless navigation experience within your workspace.

## Key Features

* **Bi-directional Link Analysis**:
    * **Outgoing Links**: Real-time extraction of all local files, headers, and directory references within the current document.
    * **Backlinks**: Instant discovery of which documents across your entire workspace reference the current file.
* **Smart Path Resolution**:
    * Supports standard Markdown syntax `[text](path)` and Wiki-link syntax `[[path]]`.
    * Handles both absolute paths (relative to the workspace root) and relative paths.
    * **Auto-completion**: Automatically identifies and jumps to files even if the `.md` extension is missing in the link.
* **Directory & File Recognition**:
    * Distinguishes between files and folders, displaying distinct icons for each.
    * Clicking a directory link reveals the folder directly in the VS Code Explorer.
* **High-Performance Memory Indexing**:
    * Optimized for large knowledge bases using an in-memory indexing strategy to avoid redundant disk scanning.
    * Real-time updates via a file system watcher—your links stay in sync as you type.
* **Context-Aware UI**:
    * The sidebar views automatically hide when you are not editing a `.md` file, keeping your workspace clean and focused.

---

If you find this tool helpful, please consider leaving a review or a ⭐ on GitHub.
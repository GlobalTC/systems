# Antigravity Markdown Viewer Enforcement: Configuration Reference

## Overview

Antigravity (Google's AI-native coding environment, built on VS Code) is configured to open all Markdown files (`.md`) directly in the **rendered preview renderer** rather than the raw text editor. This behavior is enforced through a single setting in the global user settings file and is consistent across all workspaces and projects opened in Antigravity.

---

## Configuration File

**Path:**

```
/Users/billfrench/Library/Application Support/Antigravity/User/settings.json
```

This is the **global user-level** settings file for Antigravity — equivalent to VS Code's user settings. Settings here apply to every workspace unless explicitly overridden by workspace-level or folder-level settings.

---

## The Setting

```json
{
    "workbench.editorAssociations": {
        "*.md": "vscode.markdown.preview.editor"
    }
}
```

| Property | Value |
|---|---|
| **Setting key** | `workbench.editorAssociations` |
| **File glob** | `*.md` |
| **Editor ID** | `vscode.markdown.preview.editor` |
| **Scope** | Global user settings |
| **File** | `settings.json` (Antigravity User) |

---

## How It Works

### The `workbench.editorAssociations` Mechanism

`workbench.editorAssociations` is a VS Code (and Antigravity) workspace configuration key that maps **file glob patterns** to **editor provider IDs**. When a file matching the glob is opened — by clicking in Explorer, following a link, or running any "open file" command — Antigravity routes it to the specified editor instead of the default text editor.

The mapping `"*.md": "vscode.markdown.preview.editor"` tells Antigravity:

> For any file whose name ends in `.md`, open it using the built-in Markdown Preview editor (`vscode.markdown.preview.editor`), not the default plaintext/code editor.

### The `vscode.markdown.preview.editor` Provider

`vscode.markdown.preview.editor` is the editor ID registered by VS Code's built-in **Markdown Language Features** extension. When invoked, it renders the Markdown file as styled HTML inside the editor pane — including:

- Heading hierarchy rendering
- Bold, italic, inline code, blockquotes
- Fenced code blocks with syntax highlighting
- Tables (GFM)
- Relative and absolute links
- Embedded images
- Mermaid diagrams (if a Mermaid extension is active)

This is the same renderer used when you press `Cmd+Shift+V` in a standard VS Code text editor to "Open Preview."

### The Effect: Preview as the Default

Because this association is set globally, the preview is the **primary editor** for `.md` files — not a side panel. Opening any `.md` file shows the rendered output immediately. There is no raw text pane unless you explicitly override it.

---

## Full settings.json Context

The complete Antigravity user settings file at the time of this documentation:

```json
{
    "editor.accessibilitySupport": "on",
    "json.schemaDownload.enable": true,
    "explorer.confirmDragAndDrop": false,
    "mcpServers": {
        "pieces": {
            "url": "http://localhost:39300/model_context_protocol/2024-11-05/sse"
        }
    },
    "explorer.confirmDelete": false,
    "workbench.editor.closeOnFileDelete": true,
    "workbench.editorAssociations": {
        "*.md": "vscode.markdown.preview.editor"
    },
    "security.workspace.trust.untrustedFiles": "open",
    "workbench.editor.enablePreview": false,
    "workbench.colorTheme": "Solarized Dark",
    "kilo-code.debug": false,
    "kilo-code.allowedCommands": [
        "git log",
        "git diff",
        "git show"
    ],
    "kilo-code.deniedCommands": [],
    "python.languageServer": "Default"
}
```

---

## Related Settings in the Same File

Two other settings in this file interact meaningfully with the markdown viewer enforcement:

### `workbench.editor.enablePreview: false`

By default, VS Code opens files in a **preview tab** (shown in italics), which is replaced when the next file is opened. Setting `enablePreview` to `false` forces every file to open in a **permanent tab** rather than a transient one.

Combined with the `editorAssociations` setting, this means: `.md` files open in the Markdown Preview editor **and** persist as real tabs that are not discarded when another file is clicked.

### `workbench.editor.closeOnFileDelete: true`

When a file is deleted from the filesystem, its open editor tab is automatically closed. This is standard housekeeping behavior and does not affect how `.md` files are rendered — but it ensures the editor tab list stays consistent with the filesystem.

---

## Editing Markdown Files Despite the Preview Setting

Since `.md` files open in the renderer by default, you need to explicitly request the raw text editor when you want to write or edit a file. Options:

| Method | How to Access |
|---|---|
| Right-click in Explorer | **Open With → Text Editor** |
| Command Palette | `Reopen Editor With...` → select Text Editor |
| Keyboard shortcut | `Cmd+K` then `Enter` (in some configs triggers "Reopen With") |
| Antigravity agent | The agent edits `.md` files using file system tools and does not use the editor UI |

Antigravity's AI agent (this system) always edits markdown files via `write_to_file`, `replace_file_content`, and similar tools that operate directly on the filesystem — the editor association setting has no effect on agent-driven edits.

---

## Why This Configuration Exists

This configuration is deliberate and optimized for the use case of **reading documentation, meeting notes, OPM content, and knowledge artifacts** — which is the primary reason `.md` files are opened in Antigravity. The rendered view:

1. Makes long-form documents more readable (headings, tables, lists render cleanly)
2. Prevents accidental edits to documents opened for reference
3. Provides a consistent reading experience aligned with how QMD and Obsidian present the same content

---

## Modifying the Setting

To revert to raw text editing as the default for `.md` files, open the settings file and remove or change the association:

```json
// Remove the .md association entirely (reverts to default text editor):
"workbench.editorAssociations": {}

// OR: explicitly set to the default text editor:
"workbench.editorAssociations": {
    "*.md": "default"
}
```

To apply the change, reload the Antigravity window (`Cmd+Shift+P` → `Developer: Reload Window`).

---

## Summary

| Item | Detail |
|---|---|
| **Config file** | `~/Library/Application Support/Antigravity/User/settings.json` |
| **Setting key** | `workbench.editorAssociations` |
| **Glob pattern** | `*.md` |
| **Editor ID** | `vscode.markdown.preview.editor` |
| **Scope** | All workspaces (global user level) |
| **Effect** | All `.md` files open as rendered HTML preview |
| **Override** | Right-click → "Open With → Text Editor" |
| **Agent impact** | None — agent edits via filesystem tools, not the editor UI |

---

*Documented: 2026-03-21 | Collection: pers.qmd*

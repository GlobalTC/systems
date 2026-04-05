# Claude Configuration Reference

> **Last updated:** 2026-04-04
> **Machine:** macOS (darwin arm64), zsh
> **Node:** v22.11.0 (via nvm)

---

## Architecture Overview

The local Claude setup consists of two applications that share some infrastructure:

| Component | App | Version | Path |
|---|---|---|---|
| Claude Desktop | Electron app | v1.569.0 | `/Applications/Claude.app` |
| Claude Code CLI | Subprocess | v2.1.87 | `~/Library/Application Support/Claude/claude-code/2.1.87/claude.app/Contents/MacOS/claude` |

Claude Desktop embeds Claude Code as a subprocess. When running inside Claude Desktop, Claude Code inherits the Electron shell but reads its own config files. They are **not** the same config.

---

## Configuration File Map

| File | Used By | Purpose |
|---|---|---|
| `~/.claude/mcp.json` | Claude Code | MCP server definitions |
| `~/.claude/settings.json` | Claude Code | Permissions, plugins, marketplaces |
| `~/.claude/CLAUDE.md` | Claude Code | Global system instructions |
| `~/Library/Application Support/Claude/claude_desktop_config.json` | Claude Desktop | MCP servers + app preferences |
| `~/.claude/projects/<sanitized-cwd>/memory/` | Claude Code | Per-project auto-memory |

Settings are **local to the OS user**, not tied to a Claude account. Switching between Claude Pro/Max and Console/API billing does not change any configuration.

---

## MCP Servers

### Shared Across Both Apps

All servers use **stdio transport** (the only reliable transport for Claude Desktop due to a known HTTP transport crash bug in v1.1.3770+).

#### QMD (Local Knowledge Index)

| Property | Value |
|---|---|
| Purpose | Keyword, vector, and deep search over 2224 indexed markdown documents |
| Binary | `/Users/billfrench/.nvm/versions/node/v22.11.0/bin/qmd` |
| Transport | stdio |
| Index | `~/.cache/qmd/index.sqlite` (~26 MB) |
| Daemon | HTTP on `localhost:8181/mcp` (optional); stdio via `qmd mcp` |
| Models | `embeddinggemma-300M-Q8_0.gguf`, `qwen3-reranker-0.6b-q8_0.gguf`, `qmd-query-expansion-1.7B-q4_k_m.gguf` |
| Plugin | Also registered as plugin `qmd@qmd` (source: `github:tobi/qmd`) |

```json
"qmd": {
  "command": "/Users/billfrench/.nvm/versions/node/v22.11.0/bin/qmd",
  "args": ["mcp"]
}
```

**Important:** Use the full path to the binary, not just `qmd`. The Electron app does not inherit nvm's PATH, causing silent MCP server startup failures when using bare command names.

**Tools (6):** `search` (~30ms keyword), `vector_search` (~2s semantic), `deep_search` (~10s auto-expand + rerank), `get`, `multi_get`, `status`

**Collections** are prefixed by context:
- `work.*` — work documents (`~/Documents/phase-change/`)
- `pers.*` — personal documents (Obsidian/iCloud)

---

#### Pieces (Long-Term Memory + Search)

| Property | Value |
|---|---|
| Purpose | Full-text search, vector search, LTM queries, workstream events |
| Binary | `/opt/homebrew/bin/pieces` |
| CLI version | v1.20.1 (runs `pieces-stdio-mcp v0.2.0`) |
| Transport | stdio |
| Dependency | PiecesOS must be running on `localhost:39300` |
| Tools | 39 tools (16 batch_snapshot, 14 full_text_search, 5 vector_search, 4 utility) |

```json
"Pieces": {
  "command": "/opt/homebrew/bin/pieces",
  "args": ["--ignore-onboarding", "mcp", "start"]
}
```

**LTM startup order:** The MCP server checks "LTM Enabled" at startup only. Always run `pieces open --ltm` **before** launching Claude Code. Enabling LTM after launch has no effect on the running server process.

**Why stdio, not HTTP:** PiecesOS exposes an HTTP MCP endpoint (`localhost:39300/model_context_protocol/2025-03-26/mcp`), but stdio via the CLI is more reliable — it abstracts endpoint URL changes, transport protocol evolution, and client bugs. See the [Pieces MCP Postmortem](#pieces-mcp-postmortem) section for the full failure history.

---

#### Coda

| Property | Value |
|---|---|
| Purpose | Coda document API access via MCP |
| Transport | stdio (via `mcp-remote` bridge to HTTP) |
| Auth | Bearer token in args |

```json
"coda": {
  "command": "npx",
  "args": [
    "mcp-remote",
    "https://coda.io/apis/mcp/vbeta",
    "--header",
    "Authorization: Bearer 7c87a00c-cc78-42ca-80da-6e203c9f64f4"
  ]
}
```

**Note:** Uses `npx` which may have PATH resolution issues in the Electron app. Consider using the full path to npx (`/Users/billfrench/.nvm/versions/node/v22.11.0/bin/npx`) if the server fails to start from Claude Desktop. Also contains an API token in the args — treat as sensitive.

---

#### Apple Mail

| Property | Value |
|---|---|
| Purpose | Read, search, compose, and manage Apple Mail |
| Binary | `/Users/billfrench/.local/bin/mcp-apple-mail` |
| Transport | stdio |

```json
"apple-mail": {
  "command": "/Users/billfrench/.local/bin/mcp-apple-mail",
  "args": []
}
```

**Tools include:** `list_inbox_emails`, `search_emails`, `compose_email`, `reply_to_email`, `get_email_thread`, `get_mailbox_unread_counts`, `inbox_dashboard`, and more.

---

#### Google Workspace

| Property | Value |
|---|---|
| Purpose | Google Workspace integration (originally a Gemini extension) |
| Transport | stdio (node) |
| Working dir | `~/.gemini/extensions/google-workspace` |

```json
"google-workspace": {
  "command": "node",
  "args": ["--experimental-require-module", "dist/index.js", "--use-dot-names"],
  "cwd": "/Users/billfrench/.gemini/extensions/google-workspace"
}
```

**Note:** Uses bare `node` command. May need full path for Electron reliability.

---

#### Claude in Chrome

| Property | Value |
|---|---|
| Purpose | Browser integration for Claude Code |
| Transport | stdio (npx) |

```json
"Claude in Chrome": {
  "command": "npx",
  "args": ["@anthropic-ai/claude-code-mcp-chrome@latest"]
}
```

**Note:** Designed specifically for Claude Code. May not function in Claude Desktop chat mode.

---

### Atlassian (Cloud-Hosted)

| Property | Value |
|---|---|
| Purpose | Jira and Confluence integration |
| Transport | Cloud-hosted (Anthropic-managed, via `claude_ai_Atlassian`) |

This server is not defined in local config files — it's a cloud-hosted MCP integration managed by Anthropic. Tools are prefixed `mcp__claude_ai_Atlassian__*`.

**Tools include:** `searchJiraIssuesUsingJql`, `getJiraIssue`, `createJiraIssue`, `editJiraIssue`, `getConfluencePage`, `searchConfluenceUsingCql`, and more.

---

## Permissions (Claude Code)

**File:** `~/.claude/settings.json`

Pre-allowed tools (no permission prompt):

```json
{
  "permissions": {
    "allow": [
      "mcp__plugin_qmd_qmd__*",
      "mcp__apple-mail__*",
      "mcp__Pieces__*",
      "mcp__claude_ai_Atlassian__*",
      "Read",
      "Edit",
      "Write",
      "Glob",
      "Grep",
      "Bash(git:*)",
      "Bash(ls:*)",
      "Bash(cat:*)"
    ]
  }
}
```

**Permission rule syntax:**
- Exact match: `"Bash(npm run test)"`
- Prefix wildcard: `"Bash(git:*)"` — matches `git status`, `git commit`, etc.
- Tool only: `"Read"` — allows all Read operations
- MCP wildcard: `"mcp__Pieces__*"` — allows all tools from that server

**Permission modes** (set via `permissions.defaultMode`):
- `default` — prompt for unallowed tools
- `auto` — Claude decides what's safe
- `acceptEdits` — auto-allow file edits, prompt for others
- `bypassPermissions` — skip all prompts (least safe)

---

## Plugins (Claude Code)

**File:** `~/.claude/settings.json`

```json
{
  "enabledPlugins": {
    "qmd@qmd": true
  },
  "extraKnownMarketplaces": {
    "qmd": {
      "source": {
        "source": "github",
        "repo": "tobi/qmd"
      }
    }
  }
}
```

QMD is registered both as an MCP server (in `mcp.json`) and as a plugin (in `settings.json`). The plugin provides the `/qmd` skill for search, while the MCP server provides the `mcp__plugin_qmd_qmd__*` tools.

---

## Global Instructions (CLAUDE.md)

**File:** `~/.claude/CLAUDE.md`

Defines two critical behaviors:

1. **QMD Mandate** — Claude must always use QMD MCP tools as the first approach for searching documents. OS-level search (`grep`, `find`, etc.) is forbidden unless QMD tools have been exhausted.

2. **Collection Policy** — `work.*` collections for work tasks, `pers.*` for personal. Never mix them in a single agentic task unless explicitly instructed.

---

## Claude Desktop Preferences

**File:** `~/Library/Application Support/Claude/claude_desktop_config.json`

```json
{
  "preferences": {
    "allowAllBrowserActions": true,
    "coworkScheduledTasksEnabled": true,
    "ccdScheduledTasksEnabled": true,
    "sidebarMode": "code",
    "coworkWebSearchEnabled": true,
    "keepAwakeEnabled": true
  }
}
```

---

## Known Issues and Gotchas

### PATH Resolution in Electron

The Electron shell does not inherit nvm or shell profile PATH entries. MCP servers configured with bare command names (`qmd`, `node`, `npx`) may fail to start silently. **Always use full paths** for binaries:

| Command | Full Path |
|---|---|
| `qmd` | `/Users/billfrench/.nvm/versions/node/v22.11.0/bin/qmd` |
| `npx` | `/Users/billfrench/.nvm/versions/node/v22.11.0/bin/npx` |
| `node` | `/Users/billfrench/.nvm/versions/node/v22.11.0/bin/node` |
| `pieces` | `/opt/homebrew/bin/pieces` |

### Claude Desktop HTTP Transport Crash

Claude Desktop v1.1.3770 crashes on startup when any MCP server uses HTTP transport properties (`type`, `url`, `headers`, `serverUrl`). Only stdio transport (`command` + `args`) works. Workaround: use `mcp-remote` to bridge stdio to HTTP.

| Config property | Crashes? |
|---|---|
| `"type": "http"` + `"url"` | Yes |
| `"type": "http"` + headers | Yes |
| `"url"` only (no type) | Yes |
| `"serverUrl"` + `"headers"` | Yes |
| `"command"` + `"args"` | No |

### Pieces LTM Startup Order

The Pieces MCP server reads the LTM flag at startup only. Run `pieces open --ltm` **before** launching Claude Code. If LTM tools fail mid-session, quit Claude Code, enable LTM, and relaunch.

### MCP Subprocess Staleness (Pieces + Apple Mail)

Long-running stdio MCP subprocesses lose state that was valid at launch — network connections (Pieces) or OS permissions (Apple Mail). The subprocess stays alive but becomes non-functional. Session restart is the only fix. `claude mcp` CLI has no `restart` command.

**Pieces — stale PiecesOS connection:**
- `ask_pieces_ltm` calls hang forever. PiecesOS is up, subprocess is alive, internal connection is dead.
- The Pieces CLI (v0.2.0) has no reconnection or keepalive logic.
- Affects all clients: Claude Code, Claude Desktop, Antigravity IDE.

**Apple Mail — stale TCC authorization:**
- `reply_to_email` fails with permission errors on Exchange. `compose_email` (plain text) still works.
- The reply path uses four TCC surfaces (AppKit/NSPasteboard, System Events keystroke, Mail automation, Accessibility). After sleep/wake or Electron refresh, macOS revokes inherited TCC authorization on the subprocess.
- The compose path only uses Mail automation (one surface), so it survives longer.
- All permissions are correctly configured — the code works perfectly on a fresh session.

### Silent MCP Failures

When an MCP server fails to start, Claude Code does not report an error — the tools simply don't appear in the deferred tools list. If expected tools are missing, check:
1. Is the binary path correct and absolute?
2. Is the dependency running (e.g., PiecesOS for Pieces)?
3. Does the command work when run manually in the terminal?

---

## Pieces MCP Postmortem

**Date:** 2026-03-07 | **Status:** Resolved

### Timeline of Failures

1. **HTTP Transport Trap** — Direct HTTP/SSE to PiecesOS (`localhost:39300/.../sse`) crashed Claude Desktop due to the HTTP transport bug.
2. **mcp-remote Bridge** — `npx mcp-remote` bridged stdio to HTTP but added a fragile dependency chain.
3. **Endpoint Migration** — Pieces dropped the `2024-11-05/sse` endpoint. New endpoint: `2025-03-26/mcp` (Streamable HTTP). All existing configs broke silently.
4. **Misdirected Advice** — Documentation and AI assistants suggested the HTTP approach. The CLI stdio approach was not the commonly suggested path.

### Resolution

Use the Pieces CLI stdio mode. It abstracts endpoint URLs, transport protocols, and version changes:

```json
"Pieces": {
  "command": "/opt/homebrew/bin/pieces",
  "args": ["--ignore-onboarding", "mcp", "start"]
}
```

### Lesson

**stdio > HTTP for local MCP servers.** HTTP adds failure surface (URLs change, protocols evolve, clients have bugs). If the server offers a CLI with stdio mode, use it.

---

## Auto-Memory System

Claude Code maintains per-project memory in:
```
~/.claude/projects/<sanitized-cwd>/memory/
```

Memory types: `user`, `feedback`, `project`, `reference`

Index file: `MEMORY.md` (loaded into every conversation context, max 200 lines)

Memory is read-only to other tools — Claude Code reads and writes it. It persists across conversations but is scoped to the working directory.

---

## Quick Reference: Startup Checklist

1. Ensure PiecesOS is running (`localhost:39300`)
2. Enable LTM: `pieces open --ltm`
3. Ensure QMD daemon is running (optional for HTTP): `qmd mcp --http --port 8181 --daemon`
4. Launch Claude Desktop or Claude Code
5. Verify MCP tools appear in the deferred tools list

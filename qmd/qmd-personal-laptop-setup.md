# QMD Setup Reference: Personal MacBook Pro

> Reference document for replicating the QMD environment on a second macOS machine.
> Last updated: 2026-03-18

---

## Overview

QMD (Query Markup Documents) is a local hybrid search engine over markdown files. It serves as the backbone of the context-engineering system — providing BM25 keyword search, semantic vector search, and LLM reranking over markdown document collections.

It runs as an MCP server, consumed by Claude Code and Antigravity (via KiloCode).

---

## Package & Installation

| Field | Value |
|---|---|
| **Package** | `@tobilu/qmd` |
| **Version** | `1.0.7` |
| **Author** | Tobi Lütke |
| **GitHub** | https://github.com/tobi/qmd |
| **License** | MIT |
| **Runtime** | Node.js >= 22.0.0 |
| **Install** | `npm install -g @tobilu/qmd` |

### Node.js Environment (this machine)

- Managed via **nvm** (Node Version Manager)
- Active version: **Node v22.11.0**
- Package location: `~/.nvm/versions/node/v22.11.0/lib/node_modules/@tobilu/qmd/`
- Binary symlink: `qmd` (in PATH when nvm v22.11.0 is active)

### Key Dependencies

| Dependency | Purpose |
|---|---|
| `better-sqlite3` | SQLite database engine |
| `sqlite-vec` | Vector similarity search extension |
| `node-llama-cpp` | Local LLM for reranking |
| `fast-glob` | File discovery |
| `yaml` | Config file parsing |

---

## File Locations

| Purpose | Path |
|---|---|
| Collections config | `~/.config/qmd/index.yml` |
| SQLite index/database | `~/.cache/qmd/index.sqlite` |
| Claude Code MCP config | `~/.claude/mcp.json` |
| Antigravity KiloCode MCP config | `~/Library/Application Support/Antigravity/User/globalStorage/kilocode.kilo-code/settings/mcp_settings.json` |
| Antigravity user settings | `~/Library/Application Support/Antigravity/User/settings.json` |

The database path can be overridden with the `INDEX_PATH` environment variable.

---

## Collections Configuration

**File**: `~/.config/qmd/index.yml`

Collections are prefixed `work.` (work documents) or `pers.` (personal/iCloud documents).
For the work machine, only `work.*` collections are needed.

### Full config (this machine)

```yaml
collections:
  work.opm:
    path: /Users/billfrench/Documents/phase-change/office-of-pm
    pattern: "**/*.md"
  work.leap-ai-org:
    path: /Users/billfrench/Documents/phase-change/leap-ai-org
    pattern: "**/*.md"
  work.leap-project:
    path: /Users/billfrench/Documents/phase-change/leap-project
    pattern: "**/*.md"
  work.luma-project:
    path: /Users/billfrench/Documents/phase-change/luma-project
    pattern: "**/*.md"
  work.leap-mcp:
    path: /Users/billfrench/Documents/phase-change/leap-mcp
    pattern: "**/*.md"
  work.pc-email:
    path: /Users/billfrench/Documents/phase-change/pc-email
    pattern: "**/*.md"
  pers.agy:
    path: /Users/billfrench/Library/Mobile Documents/iCloud~md~obsidian/Documents/agy
    pattern: "**/*.md"
  pers.eight-three-two:
    path: /Users/billfrench/Library/Mobile Documents/iCloud~md~obsidian/Documents/eight-three-two
    pattern: "**/*.md"
  pers.jitr:
    path: /Users/billfrench/Library/Mobile Documents/iCloud~md~obsidian/Documents/jitr
    pattern: "**/*.md"
  pers.mcpOS:
    path: /Users/billfrench/Library/Mobile Documents/iCloud~md~obsidian/Documents/mcpOS
    pattern: "**/*.md"
  pers.pi5-ubuntu:
    path: /Users/billfrench/Library/Mobile Documents/iCloud~md~obsidian/Documents/pi5-ubuntu
    pattern: "**/*.md"
  pers.chroma:
    path: /Users/billfrench/Library/Mobile Documents/iCloud~md~obsidian/Documents/chroma
    pattern: "**/*.md"
  pers.orbit:
    path: /Users/billfrench/Library/Mobile Documents/iCloud~md~obsidian/Documents/orbit
    pattern: "**/*.md"
  pers.cyberlandr:
    path: /Users/billfrench/Library/Mobile Documents/iCloud~md~obsidian/Documents/cyberlandr
    pattern: "**/*.md"
  pers.echo-wake:
    path: /Users/billfrench/Library/Mobile Documents/iCloud~md~obsidian/Documents/echo-wake
    pattern: "**/*.md"
  pers.desktop:
    path: /Users/billfrench/Desktop
    pattern: "**/*.md"
  pers.qmd:
    path: /Users/billfrench/Library/Mobile Documents/iCloud~md~obsidian/Documents/qmd
    pattern: "**/*.md"
```

---

## Work Collections

All work collections live under `~/Documents/phase-change/`. Each is a git repository synced via GitHub.

| Collection | Local Path | Docs (as of 2026-03-18) |
|---|---|---|
| `work.opm` | `~/Documents/phase-change/office-of-pm` | 202 |
| `work.pc-email` | `~/Documents/phase-change/pc-email` | 1112 |
| `work.luma-project` | `~/Documents/phase-change/luma-project` | 198 |
| `work.leap-ai-org` | `~/Documents/phase-change/leap-ai-org` | 62 |
| `work.leap-project` | `~/Documents/phase-change/leap-project` | 60 |
| `work.leap-mcp` | `~/Documents/phase-change/leap-mcp` | 55 |

---

## MCP Configuration

QMD runs as an MCP server using the command: `qmd mcp`

### Claude Code

**File**: `~/.claude/mcp.json`

```json
{
  "mcpServers": {
    "Claude in Chrome": {
      "command": "npx",
      "args": ["@anthropic-ai/claude-code-mcp-chrome@latest"]
    },
    "Pieces": {
      "command": "/opt/homebrew/bin/pieces",
      "args": ["--ignore-onboarding", "mcp", "start"]
    },
    "google-workspace": {
      "command": "node",
      "args": ["--experimental-require-module", "dist/index.js", "--use-dot-names"],
      "cwd": "/Users/billfrench/.gemini/extensions/google-workspace"
    },
    "qmd": {
      "command": "qmd",
      "args": ["mcp"]
    }
  }
}
```

The QMD entry is minimal — just `qmd mcp`. Claude Code loads this config at startup.

### Antigravity (KiloCode extension)

Antigravity is a VSCode-based IDE. QMD MCP is configured via KiloCode's dedicated MCP settings file.

**File**: `~/Library/Application Support/Antigravity/User/globalStorage/kilocode.kilo-code/settings/mcp_settings.json`

**Current state on this machine**: QMD is **not yet configured** — the file is empty (`{}`).

To add QMD, set the file to:
```json
{
  "mcpServers": {
    "qmd": {
      "command": "qmd",
      "args": ["mcp"]
    }
  }
}
```

Note: Antigravity's `settings.json` also has a top-level `mcpServers` key, but it currently only contains Pieces (via HTTP/SSE). KiloCode's file is the right place for QMD.

---

## Work Machine Setup Checklist

Steps to replicate the work-collection QMD setup on a second macOS machine (same username: `billfrench`).

### Step 1 — Install nvm and Node.js

```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.0/install.sh | bash
# Reload shell, then:
nvm install 22
nvm use 22
nvm alias default 22
```

### Step 2 — Install QMD

```bash
npm install -g @tobilu/qmd
qmd --version   # should show 1.0.7 or later
```

### Step 3 — Clone work repositories

```bash
mkdir -p ~/Documents/phase-change
cd ~/Documents/phase-change

# Clone each work collection (use your actual remote URLs)
git clone <remote-url> office-of-pm
git clone <remote-url> pc-email
git clone <remote-url> leap-mcp
git clone <remote-url> luma-project
git clone <remote-url> leap-project
git clone <remote-url> leap-ai-org
```

### Step 4 — Create QMD config

```bash
mkdir -p ~/.config/qmd
```

Create `~/.config/qmd/index.yml` with only the work collections (copy from the block above, omitting all `pers.*` entries).

Work-only `index.yml`:
```yaml
collections:
  work.opm:
    path: /Users/billfrench/Documents/phase-change/office-of-pm
    pattern: "**/*.md"
  work.leap-ai-org:
    path: /Users/billfrench/Documents/phase-change/leap-ai-org
    pattern: "**/*.md"
  work.leap-project:
    path: /Users/billfrench/Documents/phase-change/leap-project
    pattern: "**/*.md"
  work.luma-project:
    path: /Users/billfrench/Documents/phase-change/luma-project
    pattern: "**/*.md"
  work.leap-mcp:
    path: /Users/billfrench/Documents/phase-change/leap-mcp
    pattern: "**/*.md"
  work.pc-email:
    path: /Users/billfrench/Documents/phase-change/pc-email
    pattern: "**/*.md"
```

### Step 5 — Build the index

```bash
qmd index
```

This scans all configured collections and builds the BM25 + vector index. On first run, `node-llama-cpp` will download a local embedding model (may take a few minutes). Subsequent runs are incremental.

Verify with:
```bash
qmd status
```

Expected output: all work collections with document counts, `hasVectorIndex: true`.

### Step 6 — Configure Claude Code MCP

Create or edit `~/.claude/mcp.json`. At minimum, add the `qmd` entry:

```json
{
  "mcpServers": {
    "qmd": {
      "command": "qmd",
      "args": ["mcp"]
    }
  }
}
```

Restart Claude Code for the change to take effect.

### Step 7 — Configure Antigravity KiloCode MCP (optional)

Edit (or create):
```
~/Library/Application Support/Antigravity/User/globalStorage/kilocode.kilo-code/settings/mcp_settings.json
```

```json
{
  "mcpServers": {
    "qmd": {
      "command": "qmd",
      "args": ["mcp"]
    }
  }
}
```

Restart Antigravity.

---

## Keeping the Index Current

After pulling updates to any work repository:

```bash
qmd index
```

QMD performs an incremental update — only re-indexes changed files. No full rebuild needed.

To re-index a specific collection only:

```bash
qmd index --collection work.opm
```

---

## Maintenance Notes

- The `INDEX_PATH` env var overrides the default database path (`~/.cache/qmd/index.sqlite`). Useful if you want to maintain separate indexes (e.g., work vs. personal).
- The CLAUDE.md global config enforces that `work.*` collections are only used for work tasks and `pers.*` for personal tasks — never mixed in a single agentic task.
- If the index gets stale or corrupted: `rm ~/.cache/qmd/index.sqlite && qmd index` will do a full rebuild.

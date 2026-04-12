# MemPalace Integration Guide

This document captures the architectural insights regarding how MemPalace is integrated across three primary AI agent environments: Antigravity, Claude Code, and Claude Desktop. 

## 1. Antigravity Integration

At its core, Antigravity integrates MemPalace via a configuration entry in `~/.gemini/antigravity/mcp_config.json`. The setup relies on a standard Model Context Protocol (MCP) server that operates completely reactively.

### Configuration
```json
{
  "mcpServers": {
    "mempalace": {
      "command": "/Users/billfrench/.gemini/mempalace-env/bin/python",
      "args": [
        "-m",
        "mempalace.mcp_server"
      ]
    }
  }
}
```
**Architecture Pattern: Reactive Prompting**
Antigravity utilizes the standard 19 MemPalace tools purely as-needed. The knowledge base is updated explicitly when the agent determines it's necessary or when explicitly prompted by a user to "file" a specific piece of context into the graph. There are no background background scripts forcing saves.

---

## 2. Claude Code Integration

Integrating MemPalace with Claude Code involves two distinct phases: adding the standard MCP server plugin for querying, and configuring shell script hooks to enable powerful auto-save behaviors.

### Phase A: Installation
Claude Code uses a native MCP plugin marketplace:
```bash
claude plugin marketplace add milla-jovovich/mempalace
claude plugin install --scope user mempalace
```

### Phase B: Advanced Script Hooking
Claude Code can trigger shell scripts during specific lifecycle events. MemPalace is hooked to intercept workflow stops and memory compactions.

Inside `.claude/settings.local.json`:
```json
{
  "hooks": {
    "Stop": [{
      "matcher": "*",
      "hooks": [{
        "type": "command",
        "command": "/absolute/path/to/mempalace/hooks/mempal_save_hook.sh",
        "timeout": 30
      }]
    }],
    "PreCompact": [{
      "hooks": [{
        "type": "command",
        "command": "/absolute/path/to/mempalace/hooks/mempal_precompact_hook.sh",
        "timeout": 30
      }]
    }]
  }
}
```

**Architecture Pattern: Proactive Ingestion**
*   **Save Hook (`Stop`)**: Pauses Claude Code from exiting its process at preset intervals, ensuring recent decisions or context are explicitly pushed into ChromaDB via MCP before relinquishing control.
*   **PreCompact Hook**: Prevents catastrophic forgetting. When Claude's context window fills up, this hook triggers right before compaction, forcing an emergency flush of all short-term context into long-term MemPalace storage.

---

## 3. Claude Desktop Integration

Claude Desktop mirrors the Antigravity pattern. Because Desktop does not support shell script lifecycle hooking, it operates purely as an on-demand active tool.

1.  Configuration is added directly to `claude_desktop_config.json`:
    *   **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
    *   **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`

2.  The configuration block matches Antigravity exactly:
```json
{
  "mcpServers": {
    "mempalace": {
      "command": "/absolute/path/to/your/python/env/bin/python",
      "args": [
        "-m",
        "mempalace.mcp_server"
      ]
    }
  }
}
```
*Note: Make sure to point the `command` vector directly at the dedicated Python virtual environment interpreter that has `mempalace` pip-installed.*

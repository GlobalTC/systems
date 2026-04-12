# MemPalace Integration Guide for Claude Code and Claude Desktop

This guide details the process of integrating MemPalace into Claude Code and Claude Desktop. While integrating MemPalace into Antigravity relies on basic MCP tool declarations, Claude integrations require a distinct set of steps, particularly to enable the powerful auto-save hook system in Claude Code.

---

## 1. Claude Code Integration

Integrating MemPalace with Claude Code involves two distinct phases: adding the MCP server for querying, and configuring hooks to automate saving.

### Phase A: Installing the MCP Server

You can install MemPalace seamlessly using the Claude plugin marketplace.

1. Open your terminal and run the following command to add MemPalace as an available plugin:
   ```bash
   claude plugin marketplace add milla-jovovich/mempalace
   ```
2. Install the plugin globally for your user profile:
   ```bash
   claude plugin install --scope user mempalace
   ```
3. Restart your Claude Code sessions. When you type `/skills`, `mempalace` will now appear as an available plugin, granting the agent access to all 19 MemPalace tools.

*(Alternatively, if you prefer manual configuration, you can use `claude mcp add mempalace -- python -m mempalace.mcp_server`)*

### Phase B: Configuring Auto-Save Hooks (Crucial Difference from Antigravity)

Unlike Antigravity which lacks this specific native script hook paradigm, Claude Code can trigger shell scripts during specific lifecycle events. MemPalace leverages this to automatically enforce context saves.

1. Locate or create the file `.claude/settings.local.json` in your project or global configuration directory.
2. Add the following hook configuration, ensuring you replace `/absolute/path/to/` with the actual path to your MemPalace installation (e.g. `~/Library/Mobile Documents/iCloud~md~obsidian/Documents/mem-palace/mempalace`):

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

3. Ensure the shell scripts are executable:
   ```bash
   chmod +x /absolute/path/to/mempalace/hooks/mempal_save_hook.sh
   chmod +x /absolute/path/to/mempalace/hooks/mempal_precompact_hook.sh
   ```

**How the Hooks Work:**
* **Save Hook (Stop):** Counts the human exchanges. Every 15 messages (configurable via `SAVE_INTERVAL` inside the script), it temporarily blocks Claude Code from stopping and tells it: *"Block: please save recent decisions and context to the palace before continuing."* Claude saves via MCP, and the hook lets it proceed.
* **PreCompact Hook:** Triggers right before Claude Code's context window fills up and compacts. It forces an emergency flush of all relevant short-term context into MemPalace, preventing information loss.

---

## 2. Claude Desktop Integration

Integrating with Claude Desktop is simpler because the Desktop app relies purely on standard MCP server connections without the advanced background scripting hooks of Claude Code.

1. Open the Claude Desktop configuration file:
   - **macOS:** `~/Library/Application Support/Claude/claude_desktop_config.json`
   - **Windows:** `%APPDATA%\Claude\claude_desktop_config.json`
2. Add MemPalace to your `mcpServers` object, directing it to the Python environment where MemPalace was installed:

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
*(Make sure to use the absolute path to the python interpreter that has the `mempalace` package installed, just as we did in the Antigravity configuration `mcp_config.json`)*
3. Restart Claude Desktop. The agent will automatically detect the 19 tools.

---

## Technical Summary: Claude vs. Antigravity

- **Antigravity** utilizes MemPalace purely reactively using standard MCP function calling. The knowledge base is updated explicitly when Antigravity deems it necessary or when prompted by the user to "file" something away.
- **Claude Code** implements a proactive architecture using **lifecycle hooks**. By intercepting the `Stop` and `PreCompact` states, Claude Code's integration offloads the cognitive load of "remembering to remember," enforcing that all decisions and context are ingested back into ChromaDB without user intervention.

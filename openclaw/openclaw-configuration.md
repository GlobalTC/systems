# OpenClaw (tinyBrains) Configuration Reference

> **Last updated:** 2026-04-04
> **Host:** Raspberry Pi 5 (`pi5-ubuntu`, Tailscale IP: 100.93.76.98)
> **OS:** Ubuntu Linux, uptime 31+ days
> **OpenClaw version:** v2026.4.2 (d74a122)
> **Agent name:** tinyBrains

---

## Architecture Overview

OpenClaw is an always-on AI agent platform running as a systemd user service on a Raspberry Pi 5. The agent ("tinyBrains") is accessible via WhatsApp and Telegram, powered by Google's Gemini models through OpenRouter, and has access to tools including shell execution, web browsing, Pieces LTM, and Coda documents.

```
[WhatsApp] ──┐
              ├──→ [OpenClaw Gateway :18789] ──→ [Agent: tinyBrains]
[Telegram] ──┘         │                              │
                        │                              ├── Shell (exec, gateway mode)
                  [Tailscale Serve]                    ├── Browser (headless Chromium)
                        │                              ├── mcporter → Pieces LTM
                  [Dashboard HTTPS]                    ├── mcporter → Coda
                                                       └── ts-send → Tailscale file transfer
```

---

## Hardware & Infrastructure

| Component | Detail |
|---|---|
| **Hardware** | Raspberry Pi 5 |
| **OS** | Ubuntu Linux |
| **Node.js** | v22.22.0 (via nvm) |
| **Disk** | 29GB total, ~12GB used (41%) |
| **Network** | Tailscale (`pi5-ubuntu`, 100.93.76.98) |
| **Gateway** | `ws://127.0.0.1:18789` (loopback only) |
| **Dashboard** | `https://pi5-ubuntu.tailb1c28a.ts.net` (Tailscale Serve, tailnet-only) |

### SSH Access

```bash
ssh -i ~/.ssh/id_ed25519 bfrench@pi5-ubuntu
```

All `openclaw` commands require nvm:
```bash
export NVM_DIR=$HOME/.nvm && source $NVM_DIR/nvm.sh && openclaw <command>
```

All `systemctl --user` commands require:
```bash
export XDG_RUNTIME_DIR=/run/user/$(id -u)
```

---

## AI Models

All models are served via **OpenRouter** (`openrouter:default` auth profile, API key in `env.vars`).

| Role | Model ID |
|---|---|
| **Primary** | `openrouter/google/gemini-2.5-flash` |
| **Fallback** | `openrouter/google/gemini-2.5-flash-lite` |
| **Heartbeat** | `openrouter/google/gemini-2.5-flash-lite` |

### Models Registry

Available models in `agents.defaults.models`:
- `openrouter/google/gemini-2.5-flash`
- `openrouter/google/gemini-2.5-flash-lite`
- `openrouter/minimax/minimax-m2.5`
- `openrouter/x-ai/grok-4.1-fast`
- `openrouter/google/gemma-4-26b-a4b-it`

### Model Change Procedure

When changing models, update **four locations** (per the February 2026 incident):

1. `agents.defaults.model.primary`
2. `agents.defaults.model.fallbacks` array
3. `agents.defaults.heartbeat.model`
4. `agents.defaults.models` registry (add new ID)

```bash
openclaw config set agents.defaults.model.primary 'openrouter/<provider>/<model>'
openclaw config set agents.defaults.models['openrouter/<provider>/<model>'] '{}' --json
systemctl --user restart openclaw-gateway.service
```

### Model Selection History

| Date | Model | Outcome |
|---|---|---|
| Feb 2026 | gemini-3-pro-high | Deprecated without warning, broke agent |
| Feb 2026 | gemini-3.1-pro-high | Worked, but migrated to OpenRouter later |
| Apr 2026 | grok-4.1-fast | Was primary before this session |
| Apr 2026 | gemma-4-26b-a4b-it | Tested, "Unknown model" until v2026.4.2 upgrade; poor cost/performance |
| Apr 2026 | gemini-2.5-flash-lite | Too small — could not use exec tools reliably |
| Apr 2026 | **gemini-2.5-flash** | Current primary — good balance of capability and cost |

---

## Channels

### WhatsApp

| Setting | Value |
|---|---|
| **Enabled** | Yes |
| **DM Policy** | `allowlist` |
| **Allowed** | `+19703893126` (Bill only) |
| **Self-chat mode** | On (Bill can message himself to talk to tinyBrains) |
| **Group Policy** | `open` |
| **Media max** | 50MB |
| **Debounce** | 0ms |

WhatsApp uses a WhatsApp Web bridge (headless Chromium on the Pi). tinyBrains shares Bill's WhatsApp session — it is not a separate account.

**Relinking:** If WhatsApp disconnects:
```bash
openclaw channels login --channel whatsapp
```

### Telegram

| Setting | Value |
|---|---|
| **Enabled** | Yes |
| **Bot username** | `@tinyBrains_bot` |
| **DM Policy** | `pairing` (new users must be approved) |
| **Group Policy** | `allowlist` |
| **Allow from** | `[]` (all access via pairing) |
| **Polling mode** | Yes (IPv6 fallback to IPv4 on Pi5) |

**Approving a new Telegram user:**
```bash
# User sends a message, gets a pairing code
openclaw pairing approve --channel telegram <CODE>
```

**Bill's Telegram user ID:** `8309491159`

---

## Plugins

| Plugin | Status |
|---|---|
| **whatsapp** | Enabled |
| **telegram** | Enabled |
| **browser** | Enabled (headless Chromium at `/usr/bin/chromium`) |

---

## Tools & Exec Configuration

### Shell Execution

```json
"tools": {
  "exec": {
    "host": "gateway"
  }
}
```

**Critical:** `tools.exec.host` must be `gateway` for tinyBrains to execute shell commands on the Pi5. Valid options:

| Value | Meaning |
|---|---|
| `auto` | Default, may not work |
| `sandbox` | Sandboxed execution |
| `gateway` | Runs on the gateway process (the Pi5) — **use this** |
| `node` | Requires paired OpenClaw nodes (different concept, not what we need) |

### File Transfer (ts-send)

tinyBrains can send files to Bill's Mac via Tailscale using the `ts-send` wrapper.

**Location:** `/usr/local/bin/ts-send` (symlinked from `~/.local/bin/ts-send`)

**How it works:**
1. `ts-send` validates the target against an allowlist (currently only `mac-pro`)
2. Calls `sudo tailscale file cp <file> <target>:`
3. A scoped sudoers rule allows only `tailscale file cp` without password

**Usage:**
```bash
echo "Hello World" > /tmp/hello.md
ts-send /tmp/hello.md mac-pro
```

**Script source:**
```bash
#!/bin/bash
# Restricted tailscale file sender — only allows sending to known devices
ALLOWED_TARGETS="mac-pro"

if [ $# -lt 2 ]; then
  echo "Usage: ts-send <file> <target>"
  echo "Allowed targets: $ALLOWED_TARGETS"
  exit 1
fi

FILE="$1"
TARGET="$2"
TARGET="${TARGET%:}"

if ! echo "$ALLOWED_TARGETS" | grep -qw "$TARGET"; then
  echo "Error: target '$TARGET' not allowed. Allowed: $ALLOWED_TARGETS"
  exit 1
fi

if [ ! -f "$FILE" ]; then
  echo "Error: file '$FILE' not found"
  exit 1
fi

sudo tailscale file cp "$FILE" "${TARGET}:"
```

**Sudoers rule** (`/etc/sudoers.d/tailscale-filecp`):
```
bfrench ALL=(root) NOPASSWD: /usr/bin/tailscale file cp *
```

**Security design:**
- The blanket `--operator=bfrench` Tailscale setting was deliberately revoked
- Only `tailscale file cp` is allowed via sudo (not `tailscale serve`, `tailscale set`, etc.)
- The `ts-send` wrapper restricts destinations to known device names
- Adding new targets requires editing the script

### External Tool Integrations (via mcporter)

| Tool | Status | Notes |
|---|---|---|
| **Pieces** | Active | LTM, search, memory. Requires mac-pro on with Tailscale active |
| **Coda** | Active | Full read/write doc access, always available |

---

## Security

### Identity-Based Access Control

Enforced via instructions in `AGENTS.md`:

**Bill (owner)** — identified by:
- WhatsApp: `+19703893126`
- Telegram: user ID `8309491159`

Full access to all capabilities.

**All other users** — restricted:
- **BLOCKED:** `tailscale` commands of any kind
- **BLOCKED:** SSH, SCP, or any command accessing other machines
- **BLOCKED:** Reading `.env`, `openclaw.json`, or secrets/tokens
- **BLOCKED:** `openclaw config`, `openclaw devices`, `openclaw cron`
- **BLOCKED:** `mcporter` calls (Pieces, Coda)
- **ALLOWED:** General conversation, web search, weather, public info

### Network Security

- Gateway binds to loopback only (`127.0.0.1:18789`) — never directly on the network
- Tailscale Serve provides HTTPS with automatic TLS — tailnet-only (not Funnel)
- Dashboard requires gateway token + approved device identity
- WhatsApp DMs restricted to allowlist
- Telegram DMs require pairing approval

### Secrets

**File:** `~/.openclaw/.env` (mode 600)
```
OPENCLAW_GATEWAY_TOKEN=<token>
```

**Config:** `openclaw.json` contains:
- `env.vars.OPENROUTER_API_KEY`
- `gateway.auth.token`
- `channels.telegram.botToken`

### Attack Surface Analysis

```
Telegram (public) → tinyBrains → shell (gateway) → Tailscale (private) → Mac, Pi5, iPad, iPhone
```

**Mitigations:**
1. Telegram pairing required — attacker must be approved
2. Identity-based access control blocks non-Bill users from sensitive operations
3. `ts-send` restricts file transfer destinations to `mac-pro` only
4. Scoped sudoers — only `tailscale file cp` is passwordless
5. Tailscale is zero-trust (only Bill's devices)

**Remaining risks:**
- If Bill's Telegram account is compromised, attacker has full access
- tinyBrains trusts its workspace files (AGENTS.md) — prompt injection via workspace modification could bypass controls
- 2FA on Telegram is critical

---

## Heartbeat System

Two-tier schedule (America/Denver):

| Window | Hours | Frequency | Mechanism |
|---|---|---|---|
| Business hours | 8:00 AM - 4:00 PM | Every 30 minutes | Native heartbeat |
| Off-hours | 4:00 PM - 8:00 AM | Every 4 hours | Cron job (8 PM, 12 AM, 4 AM) |

### Heartbeat Checks

- GitHub notification cleanup (>12h old)
- Workspace git push (daily auto-commit)
- Model health monitoring
- Device audit (monthly)
- Tailscale Serve verification (weekly)
- Daily memory file (`memory/YYYY-MM-DD.md`)

### Cron Jobs

| ID | Name | Schedule | Status |
|---|---|---|---|
| `d905dfeb` | Off-hours heartbeat | `0 0,4,20 * * *` America/Denver | Active |

---

## Workspace Files

**Root:** `/home/bfrench/.openclaw/workspace/`

| File | Purpose |
|---|---|
| `AGENTS.md` | Behavior rules, safety, access control, heartbeat instructions |
| `SOUL.md` | Personality, values, tone |
| `USER.md` | Info about Bill (name, timezone, contacts) |
| `IDENTITY.md` | Agent name (tinyBrains), emoji, vibe |
| `MEMORY.md` | Curated long-term memory |
| `HEARTBEAT.md` | Periodic check instructions |
| `TOOLS.md` | Environment-specific tool notes (ts-send, Pieces, Coda) |
| `scripts/watchdog.py` | Only remaining script |
| `memory/YYYY-MM-DD.md` | Daily activity logs |
| `memory/heartbeat-state.json` | Last check timestamps |

### Removed (April 4, 2026)

All email/calendar functionality was permanently removed:
- 10 scripts (archive-old-messages, inbox-triage, scan-invites, sync-digest-calendar, etc.)
- 3 inbox triage cron jobs
- gog OAuth credentials (`~/.config/gogcli/`)
- `google-antigravity-auth` plugin
- `GOG_KEYRING_PASSWORD` from `.env`
- Email references from all workspace files
- 214 session history files (contained stale email context)

---

## Skills (9 ready of 52 total)

| Skill | Description |
|---|---|
| clawflow | Workflow automation |
| clawflow-inbox-triage | Inbox triage workflow (legacy, may be unused) |
| gog | Google Workspace CLI (credentials removed — non-functional) |
| healthcheck | Security auditing and hardening |
| mcporter | MCP tool bridge (Pieces + Coda) |
| node-connect | Node connectivity |
| skill-creator | Create/update agent skills |
| video-frames | Extract video frames via ffmpeg |
| weather | Weather forecasts (no API key needed) |

---

## Paired Devices

9 paired devices (6 with revoked tokens — cleanup candidates):

| Device (prefix) | Status | IP |
|---|---|---|
| `f776ad0d` | Active | 100.85.221.122 (Mac) |
| `ba270411` | Active | 100.85.221.122 (Mac) |
| `420b9003` | Active | — (Linux CLI) |
| `c0b2d8ac` | Revoked | — |
| `9bffe2e8` | Revoked | — |
| `bae3b637` | Revoked | — |
| `a1821644` | Revoked | — |
| `62d024e4` | Revoked | — |
| `ac17cb5a` | Revoked | — |

---

## Tailscale Network

| Machine | Tailscale IP | OS | Role |
|---|---|---|---|
| pi5-ubuntu | 100.93.76.98 | Linux | OpenClaw host |
| mac-pro | 100.85.221.122 | macOS | Bill's Mac |
| ipad-air | 100.96.115.119 | iOS | Bill's iPad |
| iphone-max | 100.106.96.16 | iOS | Bill's iPhone |

**Tailscale Serve:**
```
https://pi5-ubuntu.tailb1c28a.ts.net → http://127.0.0.1:18789
```

---

## Key File Locations

| What | Path |
|---|---|
| OpenClaw config | `~/.openclaw/openclaw.json` |
| Secrets (.env) | `~/.openclaw/.env` |
| Workspace root | `~/.openclaw/workspace/` |
| Systemd service | `~/.config/systemd/user/openclaw-gateway.service` |
| Application logs | `/tmp/openclaw/openclaw-YYYY-MM-DD.log` |
| Node binary | `~/.nvm/versions/node/v22.22.0/bin/node` |
| OpenClaw binary | `~/.nvm/versions/node/v22.22.0/bin/openclaw` |
| ts-send script | `/usr/local/bin/ts-send` (symlink to `~/.local/bin/ts-send`) |
| Sudoers rule | `/etc/sudoers.d/tailscale-filecp` |
| Session archives | `~/.openclaw/agents/main/sessions-archive-2026-04-04/` |

---

## Common Operations

### Restart Gateway
```bash
ssh -i ~/.ssh/id_ed25519 bfrench@pi5-ubuntu "export XDG_RUNTIME_DIR=/run/user/\$(id -u) && systemctl --user restart openclaw-gateway.service"
```

### Check Channel Status
```bash
ssh -i ~/.ssh/id_ed25519 bfrench@pi5-ubuntu "export NVM_DIR=\$HOME/.nvm && source \$NVM_DIR/nvm.sh && openclaw channels status"
```

### View Today's Logs
```bash
ssh -i ~/.ssh/id_ed25519 bfrench@pi5-ubuntu "tail -30 /tmp/openclaw/openclaw-\$(date +%F).log"
```

### Update OpenClaw
```bash
ssh -i ~/.ssh/id_ed25519 bfrench@pi5-ubuntu "export NVM_DIR=\$HOME/.nvm && source \$NVM_DIR/nvm.sh && openclaw update"
# update automatically restarts the gateway
```

### Change Primary Model
```bash
ssh -i ~/.ssh/id_ed25519 bfrench@pi5-ubuntu "export NVM_DIR=\$HOME/.nvm && source \$NVM_DIR/nvm.sh && \
  openclaw config set agents.defaults.model.primary 'openrouter/<provider>/<model>' && \
  export XDG_RUNTIME_DIR=/run/user/\$(id -u) && systemctl --user restart openclaw-gateway.service"
```

### Approve Telegram Pairing
```bash
ssh -i ~/.ssh/id_ed25519 bfrench@pi5-ubuntu "export NVM_DIR=\$HOME/.nvm && source \$NVM_DIR/nvm.sh && openclaw pairing approve --channel telegram <CODE>"
```

### Clear Session History (Nuclear Reset)
```bash
ssh -i ~/.ssh/id_ed25519 bfrench@pi5-ubuntu "mkdir -p ~/.openclaw/agents/main/sessions-archive-\$(date +%F) && \
  mv ~/.openclaw/agents/main/sessions/*.jsonl ~/.openclaw/agents/main/sessions-archive-\$(date +%F)/ && \
  echo '{}' > ~/.openclaw/agents/main/sessions/sessions.json && \
  export XDG_RUNTIME_DIR=/run/user/\$(id -u) && systemctl --user restart openclaw-gateway.service"
```

---

## Known Issues

### IPv6 Timeout on Telegram

The Pi5 has intermittent IPv6 connectivity issues. Telegram polling falls back to IPv4 with `ETIMEDOUT,ENETUNREACH` warnings. Adds ~10-15 seconds latency on reconnects. Non-blocking but annoying.

### Log Path Changes Between Versions

The log directory has changed across versions:
- v2026.2.9 and earlier: `/tmp/openclaw/`
- v2026.2.15+: `/tmp/openclaw-1000/` (user ID appended)
- v2026.4.2: Back to `/tmp/openclaw/`

Always verify with `ls /tmp/openclaw*/` after upgrades.

### Session History Pollution

tinyBrains loads recent session history (JSONL files) at startup. Old sessions containing stale context (e.g., email/gog references) will cause the agent to reference removed capabilities. Fix: archive session files and restart (see Nuclear Reset above).

### Model Registry Dot Notation

When adding models with dots in the ID (e.g., `gemini-2.5-flash`), use bracket notation:
```bash
openclaw config set 'agents.defaults.models["openrouter/google/gemini-2.5-flash"]' '{}' --json
```
Dot notation parses `2.5` as nested keys (`2` → `5`).

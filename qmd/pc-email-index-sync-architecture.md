# pc-email Sync Architecture

## Overview

Automated pipeline that keeps the `work.pc-email` QMD collection current by
incrementally extracting new emails from eM Client's local SQLite databases,
converting them to markdown, and re-indexing via QMD.

## Architecture

```
eM Client SQLite (WAL)
        │
        ▼  (every 30 min)
sync_emails.py          ← incremental extract, cursor-based
        │
        ▼
fix_safelinks.py        ← decode MS SafeLinks URLs in new files
        │
        ▼
qmd update              ← text index refresh (fast, ~5s)
        │
        ▼  (every 2 hours, superset of above)
qmd embed               ← vector embeddings (~90s for changed files)
        │
        ▼
work.pc-email           ← searchable via QMD MCP
```

## Components

| File | Location | Purpose |
|---|---|---|
| `sync_emails.py` | `pc-email/` | Incremental extractor — cursor-based, reconciliation |
| `extract_emails.py` | `pc-email/` | Full extraction — bootstrap/reset only |
| `fix_safelinks.py` | `pc-email/` | Decode MS SafeLinks URLs in-place (idempotent) |
| `.state.json` | `pc-email/` | Run cursor and stats |
| `sync_pc_email.sh` | `~/Library/Scripts/` | Orchestrator: extract + safelinks + qmd update |
| `embed_pc_email.sh` | `~/Library/Scripts/` | Orchestrator: sync + qmd embed |
| `com.billfrench.pc-email.sync.plist` | `~/Library/LaunchAgents/` | 30-min launchd schedule |
| `com.billfrench.pc-email.embed.plist` | `~/Library/LaunchAgents/` | 2-hour launchd schedule |
| Logs | `~/Library/Logs/pc-email/` | `sync.log`, `sync_error.log` |

## Data Source

eM Client stores Office 365 email in SQLite databases (`.dat` files with WAL):

```
~/Library/Application Support/eM Client/
  {account-guid}/
    {mailbox-guid}/
      mail_index.dat    ← MailItems: id, date, receivedDate, subject, folder
      mail_data.dat     ← LocalMailContents: body BLOBs (MIME parts)
      folders.dat       ← Folder hierarchy and display names
```

- Bodies stored as HTML, quoted-printable or base64 encoded
- Dates stored as .NET ticks (100ns intervals since 0001-01-01)
- Folder IDs: 5=Inbox, 2=Sent Items, 16=Archive (Deleted/Junk excluded)

## Cursor Strategy

`sync_emails.py` uses `receivedDate` (when eM Client ingested the email) as
the cursor, stored in `.state.json` as `.NET ticks`. Each run queries:

```sql
SELECT * FROM MailItems
WHERE folder IN (5, 2, 16)
  AND receivedDate >= {last_max_received_ticks}
ORDER BY receivedDate
```

Uses `>=` (not `>`) to handle same-tick edge cases — writes are idempotent.

## Reconciliation

Every 6th run, a reconciliation pass:
1. Queries all live IDs from the DB
2. Walks the output directory, parses IDs from filenames
3. Deletes `.md` files for IDs no longer in DB (moved to Deleted/Junk)
4. Writes any IDs present in DB but missing from disk (moved from excluded folders)

## Markdown Format

Each email becomes `{folder}/{YYYY-MM}/{id:05d}-{safe-subject}.md`:

```markdown
---
id: 1234
date: 2026-03-14 10:30
from: Sender Name <sender@example.com>
to: Bill French <bfrench@phasechange.ai>
cc: (optional)
subject: Email Subject
folder: Inbox
---

# Email Subject

**From:** ...
**To:** ...
**Date:** ...

---

(body as markdown)
```

## SafeLinks Handling

Microsoft Office 365 wraps all URLs in SafeLinks tracking redirects:
`https://nam12.safelinks.protection.outlook.com/?url={encoded_url}&...`

`fix_safelinks.py` decodes the `url=` parameter and replaces in-place across
all `.md` files. It is idempotent — already-fixed files are left unchanged.

**Status:** 6,381 SafeLinks decoded across 433 files on 2026-03-14.

## Scheduling

| Job | Interval | What it does |
|---|---|---|
| `com.billfrench.pc-email.sync` | 30 minutes | extract + safelinks + qmd update |
| `com.billfrench.pc-email.embed` | 2 hours | sync + qmd embed |

**Worst-case latency:**
- Keyword search: 30 minutes
- Vector/semantic search: 2 hours

## Operations

**Check status:**
```bash
cat ~/Documents/phase-change/pc-email/.state.json
tail -50 ~/Library/Logs/pc-email/sync.log
```

**Manual sync:**
```bash
bash ~/Library/Scripts/sync_pc_email.sh
```

**Manual embed:**
```bash
bash ~/Library/Scripts/embed_pc_email.sh
```

**Full reset (re-extract everything):**
```bash
cd ~/Documents/phase-change/pc-email
python3 sync_emails.py --reset
python3 fix_safelinks.py
qmd update
qmd embed
```

**Reload launchd agents:**
```bash
launchctl unload ~/Library/LaunchAgents/com.billfrench.pc-email.sync.plist
launchctl load   ~/Library/LaunchAgents/com.billfrench.pc-email.sync.plist
launchctl unload ~/Library/LaunchAgents/com.billfrench.pc-email.embed.plist
launchctl load   ~/Library/LaunchAgents/com.billfrench.pc-email.embed.plist
```

## Known Limitations

- **Flag/read status changes** are not detected (editTime=0 always in eM Client)
- **Attachments** are not extracted — body text only
- **Calendar items** are skipped (no extractable text body in LocalMailContents)
- **Date filter** relies on `receivedDate`; emails moved between folders after
  receipt are caught by the reconciliation pass (every 3 hours)
- **qmd embed** re-processes all changed chunks, not just new ones

## Related

- [[recency-index-strategy]] — plan for date-based search via QMD
- GitHub: https://github.com/tobi/qmd
- eM Client data: `~/Library/Application Support/eM Client/`

# QMD Recency Index Strategy

## Problem

QMD's MCP search tools (`search`, `vector_search`, `deep_search`) are content-based only. They have no awareness of file modification dates, making queries like "what files did I change today?" impossible through MCP.

This is a known gap in QMD. Two related GitHub issues are open:
- **Issue #192** — *"Add temporal/date-range filtering to search commands (--since, --before)"* — requests hard filtering (`--since`, `--before`, `--last 7d`) using the existing `modified_at` SQLite column
- **Issue #367** — *"feat: optional temporal relevance boost in search scoring"* — requests recency-weighted scoring via exponential decay (opt-in `recency` parameter)

## Key Finding

QMD's SQLite index (`~/.cache/qmd/index.sqlite`) already stores `modified_at` per document in the `documents` table. The data exists — it is simply not exposed through any search interface.

```sql
CREATE TABLE documents (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  collection TEXT NOT NULL,
  path TEXT NOT NULL,
  title TEXT NOT NULL,
  hash TEXT NOT NULL,
  created_at TEXT NOT NULL,
  modified_at TEXT NOT NULL,
  ...
)
```

## Proposed Workaround: `_recency.md` Manifests

Until QMD natively supports date filtering, generate a `_recency.md` manifest file per collection after each `qmd update`. The manifest lists every document with its `modified_at` date in a format that QMD can index as content, making date-based queries work through MCP.

### How It Works

1. After `qmd update` completes, query the `documents` SQLite table
2. For each collection, generate a `_recency.md` file in the collection root
3. Run `qmd update` again to index the manifests
4. Date searches via `mcp__plugin_qmd_qmd__search` now resolve against manifest content

### Manifest Format

```markdown
# Recency Index: pers.pi5-ubuntu
<!-- auto-generated, do not edit -->

- modified:2026-03-14 [[OpenClaw Constitution/IDENTITY.md]]
- modified:2026-03-14 [[OpenClaw Constitution/HEARTBEAT.md]]
- modified:2026-03-14 [[OpenClaw Constitution/MEMORY.md]]
- modified:2026-03-14 [[OpenClaw Constitution/USER.md]]
- modified:2026-03-14 [[OpenClaw Constitution/SOUL.md]]
- modified:2026-03-14 [[OpenClaw Constitution/AGENTS.md]]
- modified:2026-03-14 [[OpenClaw Constitution/TOOLS.md]]
- modified:2026-03-10 [[some-other-file.md]]
...
```

### Query Pattern

Once manifests are indexed, MCP searches like these work natively:

```
mcp__plugin_qmd_qmd__search: "modified:2026-03-14" collection:"pers.pi5-ubuntu"
mcp__plugin_qmd_qmd__search: "modified:2026-03" collection:"work.opm"
```

## Implementation Plan

### Script: `qmd-update-with-recency.sh`

```bash
#!/bin/bash
# Run qmd update, then regenerate _recency.md manifests for all collections,
# then re-index to pick up the manifests.

set -e

QMD_DB="$HOME/.cache/qmd/index.sqlite"

echo "Step 1: Updating QMD index..."
qmd update

echo "Step 2: Generating recency manifests..."

# Get all collections and their paths
sqlite3 "$QMD_DB" "SELECT DISTINCT collection, path FROM documents WHERE active=1;" | while IFS='|' read -r collection filepath; do
  # Get collection root path from collection list
  :
done

# Generate per-collection manifests
sqlite3 "$QMD_DB" \
  "SELECT collection, path, modified_at FROM documents WHERE active=1 ORDER BY collection, modified_at DESC;" \
  | awk -F'|' '
    {
      col=$1; path=$2; date=substr($3,1,10)
      if (col != last_col) {
        if (last_col != "") close(outfile)
        # Need collection root path — see note below
        last_col=col
      }
      print "- modified:" date " [[" path "]]" >> outfile
    }
  '

echo "Step 3: Re-indexing to pick up manifests..."
qmd update

echo "Done."
```

> **Note:** The script needs collection root paths to write `_recency.md` files. These are available via `qmd collection list` or directly from the SQLite index. Full implementation pending.

## Limitations

- Requires a two-pass `qmd update` (update → generate manifests → re-index)
- Manifests must be excluded from collection patterns if stored outside the collection root, or handled carefully to avoid circular indexing
- Date granularity is day-level (ISO date `YYYY-MM-DD`)
- Not a substitute for native filtering — intended as a bridge until Issue #192 is resolved

## Next Steps

- [ ] Build and test `qmd-update-with-recency.sh`
- [ ] Decide manifest storage location (inside vs. outside collection root)
- [ ] Add `+1` / comment to GitHub Issue #192 referencing this workaround
- [ ] Monitor QMD releases for native date filtering support
- [ ] Register `qmd` as a new personal Obsidian collection once this folder has content

## Related

- [[QMD MCP Setup]] (to be written)
- GitHub: https://github.com/tobi/qmd
- GitHub Issue #192: date-range filtering
- GitHub Issue #367: temporal relevance scoring

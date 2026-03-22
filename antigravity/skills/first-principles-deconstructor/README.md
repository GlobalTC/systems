# FirstPrinciplesDeconstructor (FPD) — Skill Workspace

> **Skill Status:** Active · **Global Deployment:** `~/.agent/skills/first-principles-deconstructor/SKILL.md`

This folder is the **development and management home** for the FPD Antigravity skill.
Come here to improve the skill, review test runs, track changes, and keep documentation current.

---

## What This Skill Does

The FPD skill activates a rigorous, 5-phase analytical protocol that:

1. Harvests your prior context from QMD memory
2. Strips every inherited assumption from a topic
3. Rebuilds understanding from provably true fundamentals only
4. Explains the result in plain language a 12-year-old would grasp
5. Exposes what the field teaches as "truth" (sorted by: proven / convention / myth)
6. Stress-tests the most critical assumptions with counterfactuals
7. Designs the optimal from-scratch solution using only bedrock fundamentals
8. Produces a complete QMD-ready export document for instant indexing

---

## Workspace Structure

```
antigravity/skills/first-principles-deconstructor/
├── README.md               ← You are here — overview and usage guide
├── CHANGELOG.md            ← Version history and iteration notes
└── tests/
    └── test-log.md         ← Running log of test sessions and findings
```

**The deployed skill lives at:**
```
~/.agent/skills/first-principles-deconstructor/SKILL.md
```
This path makes the skill **universally available** to Antigravity across every project on this machine.

---

## Activation Syntax

Any of these phrases will activate the skill:

```
Activate FirstPrinciplesDeconstructor on [topic]. Mode: [General/Business/Pre-Learning/Invention].
```
```
FPD on [topic]
```
```
First principles on [topic]
```
```
Deconstruct [topic]
```

**Mode options:**
| Mode | Best For |
|---|---|
| **General** | Any concept, idea, or question |
| **Business** | Problems, strategies, processes — find the shortest path from problem to outcome |
| **Pre-Learning** | Before studying a subject — generates a questioning checklist instead of assumptions table |
| **Invention** | Novel combination-seeking — maximizes leverage points and unexpected intersections |

---

## QMD Integration

When QMD integration is enabled (default), the skill:
- Runs a hybrid deep + vector search on the topic before deconstructing
- Surfaces your prior notes, thoughts, and context
- Incorporates personal assumptions found in your knowledge base into Phase 1

To disable: append `"QMD: Disable"` to your activation command.

---

## How to Iterate on This Skill

1. **Test** — Run a session (see `tests/test-log.md`)
2. **Note issues** — Log what worked, what didn't, what was missing
3. **Edit** the deployed skill at `~/.agent/skills/first-principles-deconstructor/SKILL.md`
4. **Document** the change in `CHANGELOG.md`
5. **Re-test** to validate

> Changes to `~/.agent/skills/` take effect immediately in the next Antigravity session.

---

## Design Principles

- **Bedrock over convention** — The skill must always distinguish proven truth from inherited practice
- **Universal topic coverage** — Works for physics, business, philosophy, engineering, personal decisions
- **QMD-native** — Every session produces a ready-to-index export so knowledge compounds over time
- **Mode-aware** — The same core protocol adapts to different thinking contexts without becoming a different skill
- **Feynman-enforced** — If it can't be explained simply, it isn't understood; the skill never settles for jargon

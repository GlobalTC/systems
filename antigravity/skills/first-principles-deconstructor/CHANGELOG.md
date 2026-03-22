# FPD Skill — Changelog

All notable changes to the FirstPrinciplesDeconstructor skill are recorded here.

Format: `## [version] — YYYY-MM-DD` followed by change notes.

---

## [1.0.0] — 2026-03-22

### Initial Release

**Author:** Bill French (via Antigravity session)

**What was built:**
- Full 5-phase deconstruction protocol (Phases 0–5)
- 7-section structured output format
- QMD hybrid search integration (Phase 0)
- Four operating modes: General, Business, Pre-Learning, Invention
- QMD Export section with YAML frontmatter for instant indexing
- Bedrock Essence closing statement requirement
- Quality standards checklist embedded in the skill

**Deployment:**
- Global skill installed at `~/.agent/skills/first-principles-deconstructor/SKILL.md`
- Available across all Antigravity projects on this machine without any per-project configuration

**Design decisions recorded:**
- Phase 0 (QMD Context) runs before Phase 1 so personal assumptions surface into the deconstruction layer, not just the preamble — this was intentional to prevent QMD being decorative
- Pre-Learning mode replaces the Phase 3 table with a questioning checklist because the user's goal before studying is to *interrogate*, not audit
- Invention mode emphasizes cross-domain bedrock intersections because those are where genuine novelty lives
- The QMD Export is required to be self-contained (not just a link to the analysis) so future retrieval gives full context without re-running the skill

---

## Planned Improvements (Backlog)

- [ ] Add a "Synthesis" mode that compares two FPD analyses against each other
- [ ] Consider a `confidence_level` field in the QMD export YAML frontmatter (how well-established were the bedrock fundamentals found?)
- [ ] Explore whether Phase 4 (Counterfactual) should generate a mini "what if" scenario, not just analysis
- [ ] Test whether QMD deep_search + vector_search in parallel (Phase 0) is better than sequential — measure by relevance of surfaced context
- [ ] Add a "Challenge Me" tag to QMD exports so users can search for their own prior FPD analyses and build on them

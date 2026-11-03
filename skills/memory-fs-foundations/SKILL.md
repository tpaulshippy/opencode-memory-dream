---
name: memory-fs-foundations
description: Use when bootstripping persistent agent memory from scratch, choosing a memory store, or converting tribal knowledge into reusable skills.
---

# Memory FS Foundations

Simple file-based memory that compounds. Start with one markdown file, grant write autonomy, then extract durable workflows into skills.

## Principles

1. One entrypoint beats a framework. A single `CLAUDE.md` at the repo root is "unreasonably effective" (§5a) — it loads every session with zero tooling.
2. Let agents manage their own memory. Ask: "What happens if we let agents autonomously manage their own memory systems?" (§5b). Grant write access; review the diffs.
3. Model memory as a filesystem, not a database. "What we think is best practice is modeling these memory systems just as file systems" (§5d).
4. Agents already know the tools. Agents are very good at using normal filesystem tools like "bash and rep" [rep = grep; transcription of grep] (§5d) — no custom query DSL needed.

## Workflow

1. **Start with CLAUDE.md.** Create `/CLAUDE.md` with project map, build/test commands, and gotchas. Keep under ~100 lines [not from talk — repo threshold].
2. **Grant write autonomy.** Tell the agent it may update `CLAUDE.md` and `memory/` when it learns something durable. Review changes in git.
3. **Keep a grep-able store.** Use plain markdown dirs: `memory/decisions/`, `memory/procedures/`, `memory/gotchas/`. One fact per file, descriptive filenames.
4. **Extract procedural workflows to skills.** When a `CLAUDE.md` section grows past ~20 lines or is used in >2 sessions, promote it to `skills/<name>/SKILL.md` [not from talk — repo threshold].
5. **Use progressive disclosure.** The loader rule: "agent only looks at this front matter..." (§5c) — frontmatter decides load; body loads on demand.
6. **Organize like a bookshelf.** "As if I had a bookshelf..." (§5c): broad categories visible, details hidden until pulled. Prefer many small files over one mega-file.
7. **Search with bash/grep first.** `grep -ri "keyword" memory/ skills/` before adding anything new. Duplicate check prevents forked truths.

## Frontmatter Example

```md
---
name: deploy-procedure
description: Use when deploying the API to staging or production.
---

# Deploy Procedure
...
```

Loader reads `name` + `description` only (~10 lines), then loads full body iff relevant. Keep `description` starting with "Use when".

## Boundaries

- Do NOT build retrieval infra before this works: no vector DB, no embeddings, no reranker until grep demonstrably fails.
- Do NOT store secrets, tokens, or PII in memory files; link to the vault instead.
- Do NOT let memory exceed ~200 files without an index (`memory/INDEX.md`) and archive pass [not from talk — repo threshold].
- Defer to `@designer` for visual/UX memory; to `memory-production-guards` for multi-agent hardening.

## Anti-Pattern

Bespoke vector DB first: spinning up Postgres+pgvector / Pinecone, chunking, and eval harnesses before ten markdown files exist. Symptom: retrieval never trusted, nobody reads the store. Fix: delete the service, `mkdir -p memory skills`, do the simple thing that works.

## Example Layout

```text
CLAUDE.md
memory/
  INDEX.md
  decisions/2026-10-28-why-postgres.md
  procedures/deploy-staging.md
  gotchas/nvcc-path-f fix.md
skills/
  deploy-procedure/SKILL.md
```

Start flat; add subdirs only when a dir exceeds ~20 files. Rename for grep hits, not cleverness.

## References

- "unreasonably effective" (§5a — CLAUDE.md pattern)
- "As if I had a bookshelf..." (§5c — skills + progressive disclosure)

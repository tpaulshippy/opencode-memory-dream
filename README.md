# opencode-memory-dream

Memory + dreaming loop for opencode, built directly from Lamis (Anthropic Applied AI) — *Context Engineering, Memory Systems, and Dreaming*, AI Native DevCon 2026 LDN.

Source talk: https://github.com/AINativeDev/aidevcon-2026-ldn/tree/main/talk-lamis-context-engineering-dreaming (4 files: `SKILL.md`, `outline.md`, `transcript.md`, `quotes.md`).

Tagline from the talk's closing: *"Keep thinking, keep learning and keep dreaming."*

## Install

**Warning: never install the bare npm name `opencode-memory-dream` — that name belongs to an unrelated project (cj06412). This repo is not yet published to npm.**

```jsonc
// opencode.jsonc
{ "$schema": "https://opencode.ai/config.json",
  "plugins": ["github:tpaulshippy/opencode-memory-dream"] }
```

Local-path alternative (no registry needed):

```jsonc
// opencode.jsonc
{ "$schema": "https://opencode.ai/config.json",
  "plugins": ["/path/opencode-memory-dream"] }
```

Local dev:

```sh
git clone https://github.com/tpaulshippy/opencode-memory-dream
# project-local: symlink the cloned repo ROOT (it contains src/, skills/, commands/, agents/)
# into your project's plugin dir:
ln -s /path/opencode-memory-dream /your/project/.opencode/plugins/memory-dream
# or reference the root path explicitly instead of symlinking:
# { "plugins": ["/path/opencode-memory-dream"] }
```

Skills-only use: copy/symlink `skills/*/` into `.opencode/skills/`, `~/.config/opencode/skills/`, or serve over HTTP per the opencode skills catalog (`index.json`).

## What this repo is

A V2 opencode plugin (`Plugin.define({ id: "memory-dream" })`) plus 6 skills, 2 commands, 1 agent:

```
src/index.ts                        # tools: memory_read, memory_write_cas, memory_search,
                                    #        dream_propose, dream_steer_config
                                    # commands: dream-run, memory-audit
skills/memory-fs-foundations/      # CLAUDE.md → autonomy → skills → FS store
skills/memory-production-guards/   # 4 production principles + audit checklist
skills/inband-vs-outband/          # what stays live vs moves to dreaming
skills/dreaming-loop/              # 6-step batch orchestrator ritual + output contract
skills/dreaming-steering/          # steering slot, transcript permissions, harness boundary
skills/talk-grounding-rituals/     # quote/audit/draft/teach/proactive-citation rules
commands/dream-run.md               # /dream-run over a transcript dir
commands/memory-audit.md            # audit any artifact over the 4 principles
agents/dream-orchestrator.md        # head-teacher fan-out + aggregate role
```

Deterministic parts live in the harness (`src/index.ts`: sha256 CAS, append-only `.versions/` + `.prov.json` sidecars, keyword search, proposal persistence); judgment parts live in the skills/agent (is this a real pattern? how to word the curriculum?).

## Concept coverage — every talk idea → where it lives here

| # | Talk concept (with anchor quote) | Covered by | How |
|---|---|---|---|
| 0 | **Thesis: context compounds intelligence** — *"The intelligence alone is not going to compound because they need this context…"* | `memory-fs-foundations`, `inband-vs-outband`, README | Stated as the why in both skills' intros; hygiene mandate ("multiplying the intelligence") is the dreaming payoff |
| 1 | **ROI: context multiplies intelligence** — *"It's a really great investment to work in the context engineering part…"* | `inband-vs-outband` (hygiene mandate), `dreaming-loop` (parallel-arch note) | Extra dreaming tokens framed as paying back via fewer future retries |
| 2 | **Design philosophy: simple thing that works** — *"Anthropic, we like to say do the simple thing that works."* | `memory-fs-foundations` (anti-pattern), `dreaming-steering` (harness table) | Vector-DB-first called out as anti-pattern; deterministic bits stay in code, no bespoke infra until grep fails |
| 3 | **CLAUDE.md** — *"unreasonably effective"* single markdown entrypoint | `memory-fs-foundations` Workflow step 1 (docs guidance only — no harness code reads `CLAUDE.md`) | Start with `/CLAUDE.md` (<100 lines [not from talk]); promote to skills past ~20 lines [not from talk] |
| 4 | **Memory tools / autonomy** — *"What happens if we let agents autonomously manage their own memory systems?"* | `memory-fs-foundations` step 2, `memory_write_cas` tool | Default grant: agents decide when to read/write/update; diffs reviewed in git; CAS prevents clobbering |
| 5 | **Skills + progressive disclosure** — *"agent only looks at this front matter…"* | `memory-fs-foundations` steps 4–5, every `SKILL.md` in this repo | All 6 skills are themselves frontmatter-disclosure examples; bodies load on demand |
| 6 | **Bookshelf analogy** — *"As if I had a bookshelf…"* | `memory-fs-foundations` step 6 | Broad categories visible, details hidden until pulled; many small files |
| 7 | **Filesystem-as-memory (SOTA)** — *"What we think is best practice is modeling these memory systems just as file systems"* | `src/index.ts` (FS-backed store), `memory-fs-foundations` layout | `memory/decisions|procedures|gotchas`, `INDEX.md`, portable plain files |
| 8 | **bash/grep over bespoke tools** — *Agents actually just very good at using normal file system tools like "bash and rep"* [rep = grep; transcription of grep] | `memory-fs-foundations` step 7, `memory_search` tool | `grep -ri` before adding; `memory_search` is a keyword scorer — a pragmatic stand-in, since the talk prefers bash/grep and no bespoke retrieval |
| 9 | **In-band limits** — split-focus optimization, latency, *"same mistake over sessions"* single-visibility | `inband-vs-outband` Limits § | All three limits + staleness enumerated with triage workflow |
| 10 | **Out-of-band curation** — own budget, fleet visibility, hygiene | `inband-vs-outband` Curation §, `dreaming-loop` | Separate allocation, cross-session joins, dedupe/expire/promote |
| 11 | **Production problems** — concurrent writes, org-wide corruption (*"pretty disastrous"*), stale/wrong/injected | `memory-production-guards` Problems § | All four enumerated; quarantine-on-failure rule |
| 12 | **Principle 1: Versioning + provenance** | `memory-production-guards` §1, `src/index.ts` `commitEntry` | Provenance stores `sourceTranscriptIds` (array, defaults `[]`) — record via `memory_write_cas` `sourceTranscriptIds` input; no `source`/`confidence` scalar. Append-only `.versions/*.json` + `.prov.json`, drift detection in audit |
| 13 | **Principle 2: Hashing/CAS concurrency** — *"When an agent decides… it takes the hash…"* | `memory-production-guards` §2, `memory_write_cas` | 5-step ritual (read hash → draft → re-hash → commit or abort+re-draft); tool returns `ABORT` on mismatch |
| 14 | **Principle 3: Permissioning** — *"You wouldn't want one agent to just decide…"* | `memory-production-guards` §3, `dreaming-steering` selection (docs-only guidance — NOT enforced by the harness; agents can write `org/` directly today) | `org/*` read-only → `team/*` → `agent-scratchpad/*` R/W as a human-run checklist; promotion requires review |
| 15 | **Principle 4: Portability** | `memory-production-guards` §4 (docs-only guidance — no export/restore path exists in code) | Plain files + `memory.jsonl` manifest [not from talk]; monthly restore test [not from talk] is aspirational until the harness implements it |
| 16 | **Benefits when in place** — accuracy, cost/latency, freed capacity | `dreaming-loop` (parallel-arch), `inband-vs-outband` | One-shot tasks, fewer retries; no invented numbers (talk gives none — marked as such) |
| 17 | **Dreaming definition** — *"batch and asynchronously… own allocated resources"* | `dreaming-loop` head, `inband-vs-outband`, `dream-orchestrator` | Quoted in all three; offline night-shift framing |
| 18 | **School analogy** — *"Think about a school…"* | `dreaming-loop`, `dream-run.md`, `dream-orchestrator.md` | Students=sessions, teachers=fleet, head-teacher=orchestrator, curriculum=memory |
| 19 | **Dreaming inputs** — memory snapshot + transcripts incl tool calls/metadata | `dreaming-loop` step 1, `dream-run.md` step 3 | Collect 10–20 transcripts (up to 50 for large runs) [not from talk — repo batch size] with tool history; output capped at maxProposals (default 5, raise via dream_steer_config). Harness gap: current `dream_propose` searches memory files, does not ingest transcripts; transcript ingestion is manual (model reads them) until a future transcript-index input lands |
| 20 | **Dreaming process** — fan out → aggregate → prevalence threshold → proposals | `dreaming-loop` steps 2–4, `dream-orchestrator.md` | One reviewer per transcript, cluster, ≥2–3 independent sessions to promote (repo convention [not from talk]; harness counts memory-file hits — pass sessionsScanned for session-based accounting) |
| 21 | **Steering** — humans tell orchestrator what's important (paraphrase, not a talk quote) | `dreaming-steering` slot, `dream-run.md` step 4 | Mandatory steering prompt (`Focus on / Ignore / Priority`) is a repo convention [not from talk], recorded verbatim in the run log; steer IS wired — `runDreamPass` reads `readSteer()` and `dream_steer_config` get/set is effective (`minPrevalence`, `maxProposals`, `autoCommit`) |
| 22 | **Output contract** — *"examples of transcripts… stats on how prevalent…"* + rationale | `dreaming-loop` template, `dream_propose` tool | `{diff, exampleMemoryKeys, exampleTranscriptIds (from provenance; may be empty — limitation), prevalence {hits, scanned}, rationale}` — `exampleMemoryKeys` is what the tool returns today (it searches memory, not transcripts); true transcript IDs need provenance |
| 23 | **Example 1: missing curriculum (geography)** | `dreaming-loop` canonical #1 | Fleet asks for facts that should be memory → add curriculum page |
| 24 | **Example 2: systematic misconfiguration (radians vs degrees)** | `dreaming-loop` canonical #2 | Tool-call metadata reveals misuse → fix tool config, not prompts |
| 25 | **Example 3: fleet-wide style (em dashes)** — *"Everybody's using too many em dashes…"* | `dreaming-loop` canonical #3, `inband-vs-outband` | One shared style rule instead of per-session corrections |
| 26 | **Parallel architecture** — in-band ∥ dreaming, tokens pay back | `dreaming-loop` footer, `dream-orchestrator.md` | Fast feedback ∥ breadth; fix-once-prevent-fleetwise |
| 27 | **Scope beyond code** — *"This by no means is just specific to coding…"* | `dreaming-steering`, `memory-audit.md`, `inband-vs-outband` | Writing, planning, review, support — same split |
| 28 | **Dreaming permissions** — *"you decide exactly which session transcripts to attach…"* | `dreaming-steering` checklist, `dream-orchestrator.md` | Same-permission-set attach only; IDs logged; no cross-user reads (docs-only, NOT enforced by harness) |
| 29 | **Harness-vs-autonomy boundary** — *"We have enough signal now to know… deterministic way"* | `dreaming-steering` table, `src/index.ts` | Hashing/versioning/counting/gating in code; pattern judgment + wording to agents |
| 30 | **Talk's own SKILL.md rituals** — grounding (outline→section→verbatim quote+lines), audit, draft, teach, apply, proactive surfacing | `talk-grounding-rituals`, `memory-audit.md` | All six workflows ported; `"talk doesn't address this"` fallback; *"the speaker said…"* attribution (labels unreliable; named addressees checked against participants list, questioners cited as "a questioner"); extras marked `[not from talk]` |
| 31 | **Explicitly NOT in the talk** (outline open questions: dir schema, benchmarks, adversarial detail, eval/RLHF, DB-vs-markdown rule, cadence) | `dreaming-steering` cadence §, this README, per-claim markers | Anything beyond transcript marked `[not from talk]` — marked so far: <100-line `CLAUDE.md`, ~20-line/>2-session promote rule, ~20-file subdir rule [not from talk — repo threshold], ~200-file `INDEX.md` gate, N=10–20 batch, ≥2–3 prevalence (repo convention [not from talk]; harness counts memory-file hits — pass sessionsScanned for session-based accounting), ≤30s/≤500-token in-band budget, 90-day archive, <30d restore test, `memory.jsonl` manifest, STAYS/MOVES triage, `agent-scratchpad/YYYY-MM-DD` path, nightly-janitor phrasing, mandatory steering, permission tiers (`team/` name + org/team/scratchpad paths [not from talk — repo convention]) + portability enforcement; no invented benchmarks; cadence is suggestion-only |
| 32 | **Enterprise API + durability pointers (talk-sourced, not implemented here)** | `dreaming-steering` enterprise § | Talk §16 Q&A points enterprises at the Claude Managed Agents memory/dreaming API (talk-sourced pointer); talk §18 questioner raised durability — this repo covers format portability, not backup/restore guarantees, so back up MEMORY_DIR |

## Verbatim quote index

All quotes shortened to anchors; transcript §§ below resolve against the upstream talk repo files — https://github.com/AINativeDev/aidevcon-2026-ldn/tree/main/talk-lamis-context-engineering-dreaming (`transcript.md` = §§ + line refs, `outline.md` = section map, `quotes.md` = anchor lines). Full lines live in the talk's `quotes.md` / `transcript.md` §§ cited per skill. This repo never paraphrases inside quotation marks (see `talk-grounding-rituals`).

## Development

```sh
npm install
npx tsc --noEmit
```

## License

MIT.

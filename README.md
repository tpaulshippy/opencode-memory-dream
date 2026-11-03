# opencode-memory-dream

Memory + dreaming loop for opencode, built directly from Lamis (Anthropic Applied AI) — *Context Engineering, Memory Systems, and Dreaming*, AI Native DevCon 2026 LDN.

Source talk: https://github.com/AINativeDev/aidevcon-2026-ldn/tree/main/talk-lamis-context-engineering-dreaming (4 files: `SKILL.md`, `outline.md`, `transcript.md`, `quotes.md`).

Tagline from the talk's closing: *"Keep thinking, keep learning and keep dreaming."*

## Install

```jsonc
// opencode.jsonc
{ "$schema": "https://opencode.ai/config.json",
  "plugins": ["opencode-memory-dream"] }
```

Local dev:

```sh
git clone https://github.com/tpaulshippy/opencode-memory-dream
# project-local:
cp -r opencode-memory-dream/.opencode/plugins/memory-dream /your/project/.opencode/plugins/
# or reference explicitly:
# { "plugins": ["./vendor/opencode-memory-dream"] }
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
| 3 | **CLAUDE.md** — *"unreasonably effective"* single markdown entrypoint | `memory-fs-foundations` Workflow step 1, `src/index.ts` default `MEMORY_DIR` | Start with `/CLAUDE.md` <100 lines; promote to skills past ~20 lines |
| 4 | **Memory tools / autonomy** — *"What happens if we let agents autonomously manage their own memory systems?"* | `memory-fs-foundations` step 2, `memory_write_cas` tool | Default grant: agents decide when to read/write/update; diffs reviewed in git; CAS prevents clobbering |
| 5 | **Skills + progressive disclosure** — *"agent only looks at this front matter…"* | `memory-fs-foundations` steps 4–5, every `SKILL.md` in this repo | All 6 skills are themselves frontmatter-disclosure examples; bodies load on demand |
| 6 | **Bookshelf analogy** — *"As if I had a bookshelf…"* | `memory-fs-foundations` step 6 | Broad categories visible, details hidden until pulled; many small files |
| 7 | **Filesystem-as-memory (SOTA)** — *"What we think is best practice is modeling these memory systems just as file systems"* | `src/index.ts` (FS-backed store), `memory-fs-foundations` layout | `memory/decisions|procedures|gotchas`, `INDEX.md`, portable plain files |
| 8 | **bash/grep over bespoke tools** — *"Agents actually just very good at using normal file system tools like bash and rep [grep]"* | `memory-fs-foundations` step 7, `memory_search` tool | `grep -ri` before adding; `memory_search` is keyword scoring, not embeddings |
| 9 | **In-band limits** — split-focus optimization, latency, *"same mistake over sessions"* single-visibility | `inband-vs-outband` Limits § | All three limits + staleness enumerated with triage workflow |
| 10 | **Out-of-band curation** — own budget, fleet visibility, hygiene | `inband-vs-outband` Curation §, `dreaming-loop` | Separate allocation, cross-session joins, dedupe/expire/promote |
| 11 | **Production problems** — concurrent writes, org-wide corruption (*"pretty disastrous"*), stale/wrong/injected | `memory-production-guards` Problems § | All four enumerated; quarantine-on-failure rule |
| 12 | **Principle 1: Versioning + provenance** | `memory-production-guards` §1, `src/index.ts` `commitEntry` | `{id, version, author, source}` schema; append-only `.versions/*.json` + `.prov.json`, drift detection in audit |
| 13 | **Principle 2: Hashing/CAS concurrency** — *"When an agent decides… it takes the hash…"* | `memory-production-guards` §2, `memory_write_cas` | 5-step ritual (read hash → draft → re-hash → commit or abort+re-draft); tool returns `ABORT` on mismatch |
| 14 | **Principle 3: Permissioning** — *"You wouldn't want one agent to just decide…"* | `memory-production-guards` §3, `dreaming-steering` selection | `org/*` read-only → `team/*` → `agent-scratchpad/*` R/W; promotion requires review |
| 15 | **Principle 4: Portability** | `memory-production-guards` §4 | Plain files + `memory.jsonl` manifest; monthly restore test |
| 16 | **Benefits when in place** — accuracy, cost/latency, freed capacity | `dreaming-loop` (parallel-arch), `inband-vs-outband` | One-shot tasks, fewer retries; no invented numbers (talk gives none — marked as such) |
| 17 | **Dreaming definition** — *"batch and asynchronously… own allocated resources"* | `dreaming-loop` head, `inband-vs-outband`, `dream-orchestrator` | Quoted in all three; offline night-shift framing |
| 18 | **School analogy** — *"Think about a school…"* | `dreaming-loop`, `dream-run.md`, `dream-orchestrator.md` | Students=sessions, teachers=fleet, head-teacher=orchestrator, curriculum=memory |
| 19 | **Dreaming inputs** — memory snapshot + transcripts incl tool calls/metadata | `dreaming-loop` step 1, `dream-run.md` step 3 | Collect N=10–20 transcripts with tool history + timestamps + outcomes |
| 20 | **Dreaming process** — fan out → aggregate → prevalence threshold → proposals | `dreaming-loop` steps 2–4, `dream-orchestrator.md` | One reviewer per transcript, cluster, ≥2–3 sessions to promote |
| 21 | **Steering** — humans tell orchestrator what's important | `dreaming-steering` slot, `dream-run.md` step 4 | Mandatory steering prompt (`Focus on / Ignore / Priority`), recorded verbatim |
| 22 | **Output contract** — *"examples of transcripts… stats on how prevalent…"* + rationale | `dreaming-loop` template, `dream_propose` tool | `{diff, exampleTranscriptIds, prevalence {hits, scanned}, rationale}` — exact shape enforced in code |
| 23 | **Example 1: missing curriculum (geography)** | `dreaming-loop` canonical #1 | Fleet asks for facts that should be memory → add curriculum page |
| 24 | **Example 2: systematic misconfiguration (radians vs degrees)** | `dreaming-loop` canonical #2 | Tool-call metadata reveals misuse → fix tool config, not prompts |
| 25 | **Example 3: fleet-wide style (em dashes)** — *"Everybody's using too many em dashes…"* | `dreaming-loop` canonical #3, `inband-vs-outband` | One shared style rule instead of per-session corrections |
| 26 | **Parallel architecture** — in-band ∥ dreaming, tokens pay back | `dreaming-loop` footer, `dream-orchestrator.md` | Fast feedback ∥ breadth; fix-once-prevent-fleetwise |
| 27 | **Scope beyond code** — *"This by no means is just specific to coding…"* | `dreaming-steering`, `memory-audit.md`, `inband-vs-outband` | Writing, planning, review, support — same split |
| 28 | **Dreaming permissions** — *"you decide exactly which session transcripts to attach…"* | `dreaming-steering` checklist, `dream-orchestrator.md` | Same-permission-set attach only; IDs logged; no cross-user reads |
| 29 | **Harness-vs-autonomy boundary** — *"We have enough signal now to know… deterministic way"* | `dreaming-steering` table, `src/index.ts` | Hashing/versioning/counting/gating in code; pattern judgment + wording to agents |
| 30 | **Talk's own SKILL.md rituals** — grounding (outline→section→verbatim quote+lines), audit, draft, teach, proactive surfacing | `talk-grounding-rituals`, `memory-audit.md` | All five workflows ported; `"talk doesn't address this"` fallback; *"the speaker said…"* attribution (labels unreliable); extras marked `[not from talk]` |
| 31 | **Explicitly NOT in the talk** (outline open questions: dir schema, benchmarks, adversarial detail, eval/RLHF, DB-vs-markdown rule, cadence) | `dreaming-steering` cadence §, this README | Anything beyond transcript marked `[not from talk]`; no invented benchmarks; cadence is suggestion-only |

## Verbatim quote index

All quotes shortened to anchors; full lines live in the talk's `quotes.md` / `transcript.md` §§ cited per skill. This repo never paraphrases inside quotation marks (see `talk-grounding-rituals`).

## Development

```sh
npm install
npx tsc --noEmit
```

## License

MIT.

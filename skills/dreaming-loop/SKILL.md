---
name: dreaming-loop
description: Run the batch dreaming ritual over memory store + transcripts. Use when improving memory, MCP tools, or agent behavior from fleet experience.
---

# Dreaming Loop

Batch learning ritual from the talk (transcript §§11, 13). Dreaming runs
"batch and asynchronously... own allocated resources" —
offline, over many sessions at once, not in the hot path.

## School analogy (transcript §10)

Like a school: students (agents) do homework all day (sessions),
then teachers (dreaming fleet) review the batch at night and
update the curriculum (memory). No learning happens during class;
it happens when the batch is reviewed together.

## Ritual

### 1. Collect snapshot + transcripts

Inputs: a memory store dir of markdown files plus a batch of
session transcripts including tool calls and metadata (transcript §13).
Gather N transcripts (default 10–20 [not from talk — repo batch size]) with tool call history,
timestamps, and outcome labels. Snapshot current memory files.

### 2. Fan out with steering prompt (transcript §13)

Process: fan out a sub-agent fleet, one reviewer per transcript
(or small cluster), each carrying the human's steering prompt.
Each reviewer answers: what went wrong, what pattern repeats,
what memory/tool change would have helped?

### 3. Aggregate + prevalence threshold

Aggregate findings across the fleet. Apply the prevalence
threshold: a pattern must appear in ≥2–3 independent sessions
[not from talk — repo threshold] before it becomes a proposal. One-offs are logged, not promoted.

### 4. Emit proposals in output contract

Output contract per proposal: diff + example memory keys (what the
tool returns) + example transcript IDs from provenance + prevalence
stats + rationale. Use the template below exactly.

### 5. Human accept/reject gate

Steering rule: humans tell the orchestrator what's important (paraphrase; transcript §13).
Present proposals ranked by prevalence. Human accepts, edits,
or rejects each. Nothing writes to memory without approval.

### 6. Versioned commit

On accept: apply the diff, append the rationale to the change
log, commit memory with proposal IDs referenced.

## Canonical examples (transcript §12)

1. **Missing curriculum/geography** — fleet repeatedly asks
   user for facts that should be in memory (project geography,
   conventions). Proposal: add curriculum page to memory store.
2. **Radians-vs-degrees tool config** — tool misuse repeats
   across sessions (wrong unit passed). Proposal: fix MCP tool
   description/defaults, not agent prompts.
3. **Em-dash fleet style** — outputs share an unwanted style
   tic (e.g. em-dash overuse). Proposal: add style rule once
   to shared memory instead of correcting every session.

## Proposal template

```md
## Proposal: <short title>
- Diff: <file + exact change>
- exampleMemoryKeys: <memory keys returned by dream_propose — what the tool actually returns today>
- exampleTranscriptIds (from provenance; may be empty — limitation): <IDs>
- Prevalence: <k/N sessions, % >
- Rationale: <why this fixes the pattern>
- Steering alignment: <which human priority this serves>
```

Harness gap: `dream_propose` searches memory entries, not transcripts, so
`exampleMemoryKeys` is what the tool fills in; true transcript IDs must come
from provenance records and may be empty for older entries.

Parallel arch (transcript §14): in-band fast feedback ∥ dreaming breadth —
extra tokens pay back as paraphrase: one memory fix prevents
the mistake across the whole future fleet.

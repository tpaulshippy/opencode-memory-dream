---
description: Run a batch dreaming pass over a transcript directory to propose memory fixes
---

# Dream Run

Invokes the dreaming-loop skill. `$ARGUMENTS` = transcript dir
(default: `./transcripts`).

## Steps

1. Load the `dreaming-loop` skill ritual (6 steps).
2. Load the `dreaming-steering` skill for the steering slot
   and permission-scoped transcript selection.
3. Collect: snapshot the memory store dir of markdown files;
   gather 10–20 transcripts (up to 50 for large runs) including tool calls/metadata
   (no timestamps/outcomes here — those live in dreaming-loop step 1)
   from `$ARGUMENTS` dir. Output is capped at maxProposals (default 5,
   raise via dream_steer_config). Harness gap: current `dream_propose`
   searches memory files, does not ingest transcripts; transcript ingestion
   is manual (model reads them) until a future transcript-index input lands.
4. Confirm steering with the human — humans tell the orchestrator
   what's important (paraphrase; transcript §13). Do not fan out without a steering prompt.
   Record the steering text verbatim in the run log for audit.
5. Fan out the sub-agent fleet (one reviewer per transcript),
   then aggregate with the prevalence threshold (≥2–3 independent sessions (repo convention [not from talk]; harness counts memory-file hits — pass sessionsScanned for session-based accounting)).
6. Emit proposals in the output contract: diff + example memory keys
   (what `dream_propose` returns) + example transcript IDs from
   provenance (may be empty — limitation) + prevalence stats + rationale.
7. Human accept/reject gate: apply accepted diffs only, then
   versioned commit referencing proposal IDs. Rejected proposals
   stay logged with reasons — they are signal for the next run.

Dreaming runs "batch and asynchronously... own allocated
resources" (transcript §§11, 13) — offline review, parallel arch
with in-band fast feedback ∥ dreaming breadth (transcript §14).
The extra tokens pay back (paraphrase): one fix prevents the
fleet-wide repeat.

School analogy reminder (transcript §10): this command is the night shift —
teachers reviewing the day's homework to update the curriculum.
Permissions follow dreaming-steering (transcript §17): attach only transcripts
the user could already see, and log every attached ID.

Close every run log with: "Keep thinking, keep learning and
keep dreaming."


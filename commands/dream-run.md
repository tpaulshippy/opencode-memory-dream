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
   gather the batch transcripts including tool calls/metadata
   from `$ARGUMENTS` dir.
4. Confirm steering with the human — "humans tell orchestrator
   what's important." Do not fan out without a steering prompt.
   Record the steering text verbatim in the run log for audit.
5. Fan out the sub-agent fleet (one reviewer per transcript),
   then aggregate with the prevalence threshold (≥2–3 sessions).
6. Emit proposals in the output contract: diff + example
   transcripts + prevalence stats + rationale.
7. Human accept/reject gate: apply accepted diffs only, then
   versioned commit referencing proposal IDs. Rejected proposals
   stay logged with reasons — they are signal for the next run.

Dreaming runs "batch and asynchronously... own allocated
resources" — offline review, parallel arch with in-band fast
feedback ∥ dreaming breadth. The extra tokens pay back.

School analogy reminder: this command is the night shift —
teachers reviewing the day's homework to update the curriculum.
Permissions follow dreaming-steering: attach only transcripts
the user could already see, and log every attached ID.

Close every run log with: "Keep thinking, keep learning and
keep dreaming."


---
name: dreaming-steering
description: Use when configuring steering prompts, transcript selection, and harness boundaries for dreaming.
---

# Dreaming Steering

Humans steer dreaming, agents do the judging. The talk's rule
(paraphrase; transcript §13): humans tell the orchestrator what's
important — the orchestrator and fleet handle pattern detection;
humans set direction.

## Steering prompt slot

Every dream run takes a steering prompt. Fill this slot before
fan-out:

```md
Focus this run on: <area, e.g. tool misuse, style drift>
Ignore: <known noise, out-of-scope areas>
Priority: <what matters most right now>
```

Steering narrows the fleet's attention. Without it the fleet
reports everything and the prevalence threshold fills with noise.

## Transcript selection (permissions)

Dreaming permissions rule (transcript §17; paraphrase, not a quote):
you decide exactly which session transcripts to attach, and the
dreaming fleet sees only what the requesting user could already see
(same permission set). Selection checklist:

- Attach only transcripts the user owns or may access.
- Exclude secrets, credentials, unrelated personal sessions.
- Record attached transcript IDs in the run log.
- Never widen access: no cross-user reads to improve signal.

## Harness-vs-autonomy boundary (transcript §18)

The harness owns what is deterministic; agents own judgment.
"We have enough signal now to know... deterministic way" (§18) —
hashing, versioning, dedup, and audit trails belong in code.

| Harness (deterministic)      | Agents (judgment)              |
|------------------------------|--------------------------------|
| Content hashing, versioning  | Is this a real pattern?        |
| Transcript attach + logging  | Does the fix belong in memory? |
| Prevalence counting          | How to word the curriculum?    |
| Accept/reject gate plumbing  | Which proposal matters most?   |

If it can be computed exactly, put it in the harness.
If it needs taste, give it to the fleet.

## Non-coding scope

"This by no means is just specific to coding..." (§15) — dreaming
applies to writing style, tool use, planning, review habits,
any repeated agent behavior. Steer runs beyond code freely.

## Cadence guidance [not from talk]

Suggested, not from the talk: nightly or weekly dream runs
over 10–20 transcripts (up to 50 for large runs); ad-hoc runs after incidents or big
tool changes. Adjust N to keep review load under ~30 min.
Output is capped at maxProposals (default 5, raise via dream_steer_config).

## Enterprise + durability pointers (talk-sourced, not implemented here)

- Enterprise API (transcript §16 Q&A): enterprises are pointed at the Claude Managed Agents memory/dreaming API (talk-sourced pointer — not something this repo implements).
- Durability (transcript §18): a questioner raised durability; this repo covers format portability (plain files + manifest), not backup/restore guarantees — back up MEMORY_DIR.

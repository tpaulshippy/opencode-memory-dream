---
name: dreaming-steering
description: Configure steering prompts, transcript selection, and harness boundaries for dreaming. Use when scoping a dream run or setting fleet permissions.
---

# Dreaming Steering

Humans steer dreaming, agents do the judging. The talk's rule:
"humans tell orchestrator what's important" — the orchestrator
and fleet handle pattern detection; humans set direction.

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

Dreaming permissions rule: "you decide exactly which session
transcripts to attach... same permission set" — the dreaming
fleet sees only what the requesting user could already see.
Selection checklist:

- Attach only transcripts the user owns or may access.
- Exclude secrets, credentials, unrelated personal sessions.
- Record attached transcript IDs in the run log.
- Never widen access: no cross-user reads to "improve signal."

## Harness-vs-autonomy boundary

The harness owns what is deterministic; agents own judgment.
"We have enough signal now to know... deterministic way" —
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

"This by no means is just specific to coding..." — dreaming
applies to writing style, tool use, planning, review habits,
any repeated agent behavior. Steer runs beyond code freely.

## Cadence guidance [not from talk]

Suggested, not from the talk: nightly or weekly dream runs
over 10–50 transcripts; ad-hoc runs after incidents or big
tool changes. Adjust N to keep review load under ~30 min.

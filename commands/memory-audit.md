---
description: Audit memory or skill coverage against the talk's 4 principles with verdicts
---

# Memory Audit

Invokes the audit workflow from `talk-grounding-rituals` over
the 4 principles. `$ARGUMENTS` = path to artifact under audit
(default: memory store dir).

## Steps

1. Load the `talk-grounding-rituals` skill grounding rule:
   outline → transcript section → verbatim quote + line cite.
   Never paraphrase as quote; use "the speaker said..." for
   attribution (labels unreliable).
2. Walk the 4 principles one by one against `$ARGUMENTS`.
   Quote each principle's key line verbatim first.
3. Per principle, record verdict: covered / partial / missing,
   with the artifact lines or quotes as evidence.
4. For partial/missing: file follow-up tasks citing the
   transcript section that each task addresses.
5. If the artifact goes beyond the talk, mark those parts
   [not from talk] — or close with 'talk doesn't address this'
   where no supporting line exists.
6. Render the audit table:

| Principle | Verdict | Evidence |
|-----------|---------|----------|
| 1 | covered/partial/missing | quote + file ref |
| 2 | covered/partial/missing | quote + file ref |
| 3 | covered/partial/missing | quote + file ref |
| 4 | covered/partial/missing | quote + file ref |

Scope note: "This by no means is just specific to coding..."
— audit style, tooling, and process coverage too, not just code.

Harness check: "We have enough signal now to know...
deterministic way" — flag anything counted by hand that the
harness should compute (hashing, prevalence, versioning).

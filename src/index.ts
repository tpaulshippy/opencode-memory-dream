import { Plugin } from "@opencode/plugin";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, unlinkSync, writeFileSync } from "node:fs";
import { dirname, join, resolve, sep } from "node:path";

const PLUGIN_ID = "memory-dream";
// DEFAULT_STEER: maxProposals caps the number of output items (proposals /
// searched entries surfaced per pass), not the size of the transcript batch
// being dreamed over — transcript batches may be much larger.
const DEFAULT_STEER = { minPrevalence: 2, maxProposals: 5, autoCommit: false };

/**
 * Memory root, always resolved to an absolute path at every use via path.resolve.
 * When MEMORY_DIR is unset, defaults to <process.cwd()>/.opencode/memory.
 */
function memoryDir(): string {
  const raw = process.env.MEMORY_DIR ?? join(process.cwd(), ".opencode/memory");
  return resolve(raw);
}

function sha256(text: string): string {
  return createHash("sha256").update(text, "utf8").digest("hex");
}

/**
 * Collision-free flat encoding. Rejects path traversal ("..") and absolute
 * paths BEFORE sanitizing (so encoded forms can't smuggle them past the check).
 * Layout: lowercase, "/" -> "__", other unsafe chars -> "-", plus -<hash8 of
 * the original key> so distinct keys never collide. The original key is stored
 * in provenance (originalKey).
 */
function safeKey(key: string): string {
  if (key.includes("..")) throw new Error(`invalid memory key (path traversal): ${key}`);
  if (key.startsWith("/") || /^[a-zA-Z]:[\\/]/.test(key) || key.startsWith("\\\\")) {
    throw new Error(`invalid memory key (absolute path): ${key}`);
  }
  if (!key.trim()) throw new Error(`invalid memory key: ${key}`);
  const hash8 = createHash("sha256").update(key, "utf8").digest("hex").slice(0, 8);
  const flat = key.toLowerCase().replace(/\//g, "__").replace(/[^a-z0-9_-]/g, "-");
  if (!flat.replace(/[-_]/g, "")) throw new Error(`invalid memory key: ${key}`);
  return `${flat}-${hash8}`;
}

/** Resolve a slugged filename under memoryDir; throw if it escapes containment. */
function sluggedPath(key: string, suffix: string): string {
  const dir = memoryDir();
  const p = resolve(join(dir, `${safeKey(key)}${suffix}`));
  const root = dir.endsWith(sep) ? dir : dir + sep;
  if (p !== dir && !p.startsWith(root)) throw new Error(`path escapes memoryDir: ${p}`);
  return p;
}

function entryPath(key: string): string {
  return sluggedPath(key, ".md");
}
function provenancePath(key: string): string {
  return sluggedPath(key, ".prov.json");
}
function versionsDir(): string {
  return join(memoryDir(), ".versions");
}

function readEntry(key: string): { content: string; hash: string } | null {
  const path = entryPath(key);
  if (!existsSync(path)) return null;
  const content = readFileSync(path, "utf8");
  return { content, hash: sha256(content) };
}

interface Provenance {
  key: string;
  originalKey: string;
  hash: string;
  version: number;
  author: string;
  updatedAt: string;
  prev: string | null;
  sourceTranscriptIds?: string[];
}

function readProvenance(key: string): Provenance | null {
  const path = provenancePath(key);
  if (!existsSync(path)) return null;
  try {
    const raw = JSON.parse(readFileSync(path, "utf8")) as Partial<Provenance>;
    if (typeof raw !== "object" || raw === null) return null;
    return {
      key: typeof raw.key === "string" ? raw.key : safeKey(key),
      originalKey: typeof raw.originalKey === "string" ? raw.originalKey : key,
      hash: typeof raw.hash === "string" ? raw.hash : "",
      version: typeof raw.version === "number" ? raw.version : 0,
      author: typeof raw.author === "string" ? raw.author : "unknown",
      updatedAt: typeof raw.updatedAt === "string" ? raw.updatedAt : "",
      prev: typeof raw.prev === "string" || raw.prev === null ? raw.prev : null,
      sourceTranscriptIds: Array.isArray(raw.sourceTranscriptIds)
        ? raw.sourceTranscriptIds.filter((s): s is string => typeof s === "string")
        : [],
    };
  } catch {
    return null;
  }
}

/** Append-only versioned write: snapshot to .versions/, update entry + provenance sidecar. */
function commitEntry(key: string, content: string, author: string, opts?: { sourceTranscriptIds?: string[] }): Provenance {
  mkdirSync(memoryDir(), { recursive: true });
  mkdirSync(versionsDir(), { recursive: true });
  const prev = readEntry(key);
  const prevProv = readProvenance(key);
  const hash = sha256(content);
  const version = (prevProv?.version ?? 0) + 1;
  const timestamp = new Date().toISOString();
  const record = { key: safeKey(key), content, hash, prev: prev?.hash ?? null, author, timestamp, version };
  writeFileSync(join(versionsDir(), `${safeKey(key)}.v${version}.${hash.slice(0, 8)}.json`), JSON.stringify(record, null, 2));
  const ep = entryPath(key);
  mkdirSync(dirname(ep), { recursive: true });
  writeFileSync(ep, content);
  const prov: Provenance = {
    key: safeKey(key),
    originalKey: key,
    hash,
    version,
    author,
    updatedAt: timestamp,
    prev: record.prev,
    sourceTranscriptIds: opts?.sourceTranscriptIds ?? prevProv?.sourceTranscriptIds ?? [],
  };
  writeFileSync(provenancePath(key), JSON.stringify(prov, null, 2));
  return prov;
}

interface ScoredEntry {
  key: string;
  hash: string; // full 64-char sha256
  hits: number;
  snippet: string;
}

/** Read a raw *.md file in dir: content + full hash + display key (originalKey via provenance). */
function readScannedFile(dir: string, file: string): { key: string; content: string; hash: string; fullPath: string } | null {
  const fullPath = join(dir, file);
  let content: string;
  try {
    if (!statSync(fullPath).isFile()) return null;
    content = readFileSync(fullPath, "utf8");
  } catch {
    return null;
  }
  let key = file.slice(0, -3);
  try {
    const provRaw = JSON.parse(readFileSync(join(dir, `${key}.prov.json`), "utf8")) as Partial<Provenance>;
    if (provRaw && typeof provRaw.originalKey === "string") key = provRaw.originalKey;
  } catch {
    /* no provenance sidecar — fall back to filename slug */
  }
  return { key, content, hash: sha256(content), fullPath };
}

/** Score entries by keyword hit count against the query. Skips dotfiles. */
function searchEntries(query: string, limit: number): { scanned: number; results: ScoredEntry[] } {
  const dir = memoryDir();
  if (!existsSync(dir)) return { scanned: 0, results: [] };
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  const files = readdirSync(dir).filter((f) => f.endsWith(".md") && !f.startsWith("."));
  const scored: ScoredEntry[] = [];
  for (const file of files) {
    const entry = readScannedFile(dir, file);
    if (!entry) continue;
    const lower = entry.content.toLowerCase();
    const hits = words.reduce((n, w) => n + (lower.includes(w) ? 1 : 0), 0);
    if (words.length === 0 || hits > 0) {
      scored.push({ key: entry.key, hash: entry.hash, hits, snippet: entry.content.slice(0, 280) });
    }
  }
  scored.sort((a, b) => b.hits - a.hits);
  return { scanned: files.length, results: scored.slice(0, Math.max(1, limit)) };
}

interface DreamProposal {
  diff: string;
  /** Derived from provenance sourceTranscriptIds; may be empty (see rationale). */
  exampleTranscriptIds: string[];
  /** Memory keys the proposal was drawn from. */
  exampleMemoryKeys: string[];
  prevalence: { hits: number; scanned: number; unit: "memory-files" };
  rationale: string;
}

/** Build one dream proposal: diff + example IDs + prevalence + rationale. */
function runDreamPass(topic: string, opts?: { sessionsScanned?: number }): DreamProposal {
  const steer = readSteer();
  const { scanned, results } = searchEntries(topic, steer.maxProposals);
  const keys = results.map((r) => r.key);
  const ids: string[] = [];
  for (const k of keys) {
    for (const id of readProvenance(k)?.sourceTranscriptIds ?? []) {
      if (!ids.includes(id)) ids.push(id);
    }
  }
  const diff = results.length === 0
    ? `# No memories mention "${topic}" yet. Proposed: create \`memory/${safeKey(topic)}.md\`.`
    : `# Promote "${topic}" (${results.length} entries)\n${results.map((r) => `## ${r.key} (${r.hash.slice(0, 12)})\n${r.snippet}\n`).join("\n")}`;
  const batchNote = opts?.sessionsScanned !== undefined
    ? ` Transcript batch scanned: ${opts.sessionsScanned} sessions.`
    : "";
  const rationale = results.length >= steer.minPrevalence
    ? `"${topic}" recurs across ${results.length}/${scanned} memory-file hits, so it earns a durable memory slot.${batchNote}`
    : `Only ${results.length}/${scanned} memory-file hits mention "${topic}"; keep watching before promoting.${batchNote}`;
  const limitation = ids.length === 0
    ? ` Note: no sourceTranscriptIds are recorded in entry provenance yet, so exampleTranscriptIds is empty; exampleMemoryKeys lists the searched keys instead.`
    : "";
  return {
    diff,
    exampleTranscriptIds: ids,
    exampleMemoryKeys: keys,
    prevalence: { hits: results.length, scanned, unit: "memory-files" },
    rationale: rationale + limitation,
  };
}

interface Steer {
  minPrevalence: number;
  maxProposals: number;
  autoCommit: boolean;
}

const STEER_KEYS = ["minPrevalence", "maxProposals", "autoCommit"] as const;

function coerceSteer(raw: unknown): Steer {
  const out: Steer = { ...DEFAULT_STEER };
  if (typeof raw !== "object" || raw === null) return out;
  const r = raw as Record<string, unknown>;
  if (Number.isInteger(r.minPrevalence) && (r.minPrevalence as number) >= 1) {
    out.minPrevalence = r.minPrevalence as number;
  }
  if (Number.isInteger(r.maxProposals) && (r.maxProposals as number) >= 1 && (r.maxProposals as number) <= 20) {
    out.maxProposals = r.maxProposals as number;
  }
  if (typeof r.autoCommit === "boolean") out.autoCommit = r.autoCommit;
  return out;
}

/** Read steering config; on corrupt JSON back up the broken file and return defaults. */
function readSteer(): Steer {
  const path = join(memoryDir(), "steer.json");
  if (!existsSync(path)) return { ...DEFAULT_STEER };
  let raw: string;
  try {
    raw = readFileSync(path, "utf8");
  } catch {
    return { ...DEFAULT_STEER };
  }
  try {
    return coerceSteer(JSON.parse(raw) as unknown);
  } catch {
    try {
      writeFileSync(join(memoryDir(), `steer.json.broken-${Date.now()}`), raw);
    } catch {
      /* best effort backup */
    }
    return { ...DEFAULT_STEER };
  }
}

const STALE_AFTER_MS = 90 * 24 * 60 * 60 * 1000;

/** Audit: every entry with its hash, version, staleness, and provenance drift. Skips dotfiles. */
function runAudit(): string {
  const dir = memoryDir();
  if (!existsSync(dir)) return "AUDIT: memory dir missing (no entries).";
  const files = readdirSync(dir).filter((f) => f.endsWith(".md") && !f.startsWith("."));
  const now = Date.now();
  const lines = files.map((file) => {
    const entry = readScannedFile(dir, file);
    const prov = entry ? readProvenance(entry.key) : null;
    const drift = prov && entry && prov.hash !== entry.hash ? " DRIFT(file edited outside CAS)" : "";
    let stale = "";
    try {
      const ageMs = now - statSync(join(dir, file)).mtimeMs;
      if (ageMs > STALE_AFTER_MS) stale = " STALE(archive-candidate)";
    } catch {
      /* ignore stat failures */
    }
    return `- ${entry?.key ?? file.slice(0, -3)}: hash=${entry?.hash.slice(0, 12) ?? "missing"} version=${prov?.version ?? 0} author=${prov?.author ?? "unknown"}${drift}${stale}`;
  });
  const report = `# memory-audit\nentries=${files.length}\n${lines.join("\n")}`;
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, ".audit.md"), `${report}\n`);
  return report;
}

/** Keep only the latest `keep` proposal files in .dreams (timestamped names sort oldest-first). */
function pruneDreams(dreamsDir: string, keep: number): void {
  let files: string[];
  try {
    files = readdirSync(dreamsDir).filter((f) => f.endsWith(".json") && !f.startsWith("latest"));
  } catch {
    return;
  }
  files.sort();
  while (files.length > keep) {
    const old = files.shift();
    if (old === undefined) break;
    try {
      unlinkSync(join(dreamsDir, old));
    } catch {
      break;
    }
  }
}

/** Thread invocation input: prefer input.args/params topic (or transcriptDir), then prompt text, else fallback. */
function extractTopic(input: any, fallback: string): string {
  const direct = input?.args?.topic ?? input?.params?.topic ?? input?.args?.transcriptDir ?? input?.params?.transcriptDir;
  if (typeof direct === "string" && direct.trim()) return direct.trim();
  const text = input?.prompt?.text;
  if (typeof text === "string" && text.trim()) {
    let t = text.trim();
    if (t.startsWith("/")) t = t.split(/\s+/).slice(1).join(" ").trim();
    if (t) return t;
  }
  return fallback;
}

const obj = (properties: Record<string, unknown>, required: string[] = []) => ({ type: "object", properties, required, additionalProperties: false });
const str = (description: string) => ({ type: "string", description });

export default Plugin.define({
  id: PLUGIN_ID,
  async setup(ctx) {
    await ctx.tool.transform((editor) => {
      editor.namespace({ name: "memory", description: "Durable filesystem-backed memory with CAS writes." });
      editor.add({
        name: "memory_read",
        description: "Read a memory entry by key. Returns its sha256 hash plus content.",
        input: obj({ key: str("Memory key, e.g. 'project/overview'.") }, ["key"]),
        options: { namespace: "memory" },
        execute: async (input: any) => {
          const entry = readEntry(String(input.key));
          if (!entry) return { content: `NOT_FOUND key=${input.key}` };
          return { content: `HASH ${entry.hash}\n${entry.content}` };
        },
      });
      editor.add({
        name: "memory_write_cas",
        description: "CAS memory write: read, draft, re-hash, compare expectedHash, commit or abort. Pass expectedHash from memory_read, or force:true to commit without a hash check (recorded with a +force author tag).",
        input: obj({
          key: str("Memory key to write."),
          content: str("Full new content for the entry."),
          expectedHash: { type: "string", description: "Hash from memory_read; abort if current differs. Required unless force:true." },
          force: { type: "boolean", description: "Skip the CAS hash check and commit unconditionally. Provenance author is tagged +force." },
          sourceTranscriptIds: { type: "array", items: { type: "string" }, description: "Transcript IDs this content derives from; stored in entry provenance." },
          author: str("Author tag for provenance."),
        }, ["key", "content"]),
        options: { namespace: "memory" },
        execute: async (input: any) => {
          const key = String(input.key);
          const current = readEntry(key);
          const expected = input.expectedHash ? String(input.expectedHash) : null;
          const force = input.force === true;
          if (current && !force && !expected) {
            return { content: `ABORT no expectedHash for existing key=${key} current=${current.hash}. Re-read via memory_read and pass expectedHash, or retry with force:true.` };
          }
          if (current && !force && expected && expected !== current.hash) {
            return { content: `ABORT stale write: expected=${expected} current=${current.hash}. Re-read, re-draft, retry.` };
          }
          const author = force ? `${String(input.author ?? "agent")}+force` : String(input.author ?? "agent");
          const sourceTranscriptIds = Array.isArray(input.sourceTranscriptIds)
            ? input.sourceTranscriptIds.filter((s: unknown): s is string => typeof s === "string")
            : undefined;
          const prov = commitEntry(key, String(input.content), author, { sourceTranscriptIds });
          return { content: `COMMIT key=${prov.key} hash=${prov.hash} version=${prov.version} prev=${prov.prev ?? "none"}` };
        },
      });
      editor.add({
        name: "memory_search",
        description: "Keyword search over memory entries. Returns scored keys with snippets.",
        input: obj({ query: str("Space-separated keywords."), limit: { type: "number", description: "Max results." } }, ["query"]),
        options: { namespace: "memory" },
        execute: async (input: any) => {
          const { scanned, results } = searchEntries(String(input.query), Number(input.limit ?? 5));
          if (results.length === 0) return { content: `NO_HITS scanned=${scanned}` };
          return { content: `scanned=${scanned}\n` + results.map((r) => `## ${r.key} [${r.hash}] hits=${r.hits}\n${r.snippet}`).join("\n---\n") };
        },
      });
      editor.namespace({ name: "dream", description: "Dream loop: propose durable memories from recurring signals." });
      editor.add({
        name: "dream_propose",
        description: "Propose a memory update. Output contract: diff + example transcript IDs + prevalence stats + rationale.",
        input: obj({
          topic: str("Topic to dream about."),
          steering: str("Optional steering hint recorded with the proposal."),
          minPrevalence: { type: "number", description: "Optional minPrevalence override recorded with the proposal." },
          sessionIds: { type: "array", items: { type: "string" }, description: "Transcript batch this proposal was drawn from; persisted in the .dreams envelope." },
          sessionsScanned: { type: "number", description: "Size of the transcript batch scanned; persisted in the envelope and may be referenced in rationale." },
        }, ["topic"]),
        options: { namespace: "dream" },
        execute: async (input: any) => {
          const topic = String(input.topic);
          const sessionIds = Array.isArray(input.sessionIds)
            ? input.sessionIds.filter((s: unknown): s is string => typeof s === "string")
            : null;
          const sessionsScanned = input.sessionsScanned !== undefined ? Number(input.sessionsScanned) : null;
          // No auto-write of promoted entries here: proposals are human-gated.
          // sessionIds/sessionsScanned only describe the transcript batch and are persisted.
          const record = {
            schemaVersion: 1,
            topic,
            timestamp: new Date().toISOString(),
            steering: input.steering !== undefined ? String(input.steering) : null,
            minPrevalence: input.minPrevalence !== undefined ? Number(input.minPrevalence) : null,
            sessionIds,
            sessionsScanned,
            proposal: runDreamPass(topic, sessionsScanned !== null && !Number.isNaN(sessionsScanned) ? { sessionsScanned } : undefined),
          };
          const dreamsDir = join(memoryDir(), ".dreams");
          mkdirSync(dreamsDir, { recursive: true });
          writeFileSync(join(dreamsDir, `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.json`), JSON.stringify(record, null, 2));
          pruneDreams(dreamsDir, 50);
          return { content: JSON.stringify(record, null, 2) };
        },
      });
      editor.add({
        name: "dream_steer_config",
        description: "Get or set dream steering config (minPrevalence, maxProposals, autoCommit).",
        input: obj({
          action: { type: "string", enum: ["get", "set"], description: "Read or update config." },
          key: str("Config key to set."),
          value: { type: "string", description: "Config value to set (parsed as JSON when possible)." },
        }, ["action"]),
        options: { namespace: "dream" },
        execute: async (input: any) => {
          if (String(input.action) !== "set") return { content: JSON.stringify(readSteer(), null, 2) };
          const key = String(input.key ?? "");
          if (key === "__proto__" || key === "constructor" || key === "prototype") {
            return { content: `STEER_REJECT forbidden key=${key}` };
          }
          if (!(STEER_KEYS as readonly string[]).includes(key)) {
            return { content: `STEER_REJECT unknown key=${key} allowed=minPrevalence|maxProposals|autoCommit` };
          }
          let value: unknown = input.value;
          try { value = JSON.parse(String(input.value)); } catch { /* keep raw string */ }
          if (key === "minPrevalence" && (!Number.isInteger(value) || (value as number) < 1)) {
            return { content: `STEER_REJECT minPrevalence must be an integer >= 1` };
          }
          if (key === "maxProposals" && (!Number.isInteger(value) || (value as number) < 1 || (value as number) > 20)) {
            return { content: `STEER_REJECT maxProposals must be an integer 1..20` };
          }
          if (key === "autoCommit" && typeof value !== "boolean") {
            return { content: `STEER_REJECT autoCommit must be a boolean` };
          }
          const steer: Record<string, unknown> = { ...readSteer(), [key]: value };
          mkdirSync(memoryDir(), { recursive: true });
          writeFileSync(join(memoryDir(), "steer.json"), JSON.stringify(steer, null, 2));
          return { content: `STEER_SET ${key}=${JSON.stringify(value)}\n${JSON.stringify(steer, null, 2)}` };
        },
      });
    });
    // Commands below intentionally mirror commands/*.md (same names).
    // The markdown files are model-facing instructions auto-discovered by
    // opencode; the code registrations below are tool-backed execution.
    // Same names are intentional parity — last-wins is harmless.
    // Note: CommandDefinition.execute must return Promise<void> (see
    // node_modules/@opencode/plugin/dist/promise/command.d.ts), so commands
    // persist their summaries to .dreams/latest-summary.md instead of returning text.
    await ctx.command.transform((editor) => {
      editor.add({
        name: "dream-run",
        description: "Run one dream pass over memory and persist the proposal.",
        execute: async (input: any) => {
          const topic = extractTopic(input, "recurring");
          const proposal = runDreamPass(topic);
          const dreamsDir = join(memoryDir(), ".dreams");
          mkdirSync(dreamsDir, { recursive: true });
          const record = { schemaVersion: 1, topic, timestamp: new Date().toISOString(), proposal };
          writeFileSync(join(dreamsDir, "latest.json"), JSON.stringify(record, null, 2));
          writeFileSync(join(dreamsDir, "latest-summary.md"), `# dream-run: ${topic}\n\n${proposal.diff}\n\n${proposal.rationale}\n`);
        },
      });
      editor.add({
        name: "memory-audit",
        description: "Audit memory entries: hashes, versions, provenance drift.",
        execute: async () => {
          runAudit();
        },
      });
    });
  },
});

import { Plugin } from "@opencode/plugin";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const PLUGIN_ID = "memory-dream";
const DEFAULT_STEER = { minPrevalence: 2, maxProposals: 5, autoCommit: false };

function memoryDir(): string {
  return process.env.MEMORY_DIR ?? ".opencode/memory";
}

function sha256(text: string): string {
  return createHash("sha256").update(text, "utf8").digest("hex");
}

function safeKey(key: string): string {
  const cleaned = key.replace(/[^a-zA-Z0-9/_-]/g, "-").replace(/\.\.+/g, "-");
  if (!cleaned) throw new Error(`invalid memory key: ${key}`);
  return cleaned;
}

function entryPath(key: string): string {
  return join(memoryDir(), `${safeKey(key)}.md`);
}
function provenancePath(key: string): string {
  return join(memoryDir(), `${safeKey(key)}.prov.json`);
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
  hash: string;
  version: number;
  author: string;
  updatedAt: string;
  prev: string | null;
}

function readProvenance(key: string): Provenance | null {
  const path = provenancePath(key);
  if (!existsSync(path)) return null;
  try {
    return JSON.parse(readFileSync(path, "utf8")) as Provenance;
  } catch {
    return null;
  }
}

/** Append-only versioned write: snapshot to .versions/, update entry + provenance sidecar. */
function commitEntry(key: string, content: string, author: string): Provenance {
  mkdirSync(memoryDir(), { recursive: true });
  mkdirSync(versionsDir(), { recursive: true });
  const prev = readEntry(key);
  const prevProv = readProvenance(key);
  const hash = sha256(content);
  const version = (prevProv?.version ?? 0) + 1;
  const timestamp = new Date().toISOString();
  const record = { key: safeKey(key), content, hash, prev: prev?.hash ?? null, author, timestamp, version };
  writeFileSync(join(versionsDir(), `${safeKey(key)}.v${version}.${hash.slice(0, 8)}.json`), JSON.stringify(record, null, 2));
  writeFileSync(entryPath(key), content);
  const prov: Provenance = { key: safeKey(key), hash, version, author, updatedAt: timestamp, prev: record.prev };
  writeFileSync(provenancePath(key), JSON.stringify(prov, null, 2));
  return prov;
}

interface ScoredEntry {
  key: string;
  hash: string;
  hits: number;
  snippet: string;
}

/** Score entries by keyword hit count against the query. */
function searchEntries(query: string, limit: number): { scanned: number; results: ScoredEntry[] } {
  const dir = memoryDir();
  if (!existsSync(dir)) return { scanned: 0, results: [] };
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  const files = readdirSync(dir).filter((f) => f.endsWith(".md"));
  const scored: ScoredEntry[] = [];
  for (const file of files) {
    const key = file.slice(0, -3);
    const entry = readEntry(key);
    if (!entry) continue;
    const lower = entry.content.toLowerCase();
    const hits = words.reduce((n, w) => n + (lower.includes(w) ? 1 : 0), 0);
    if (words.length === 0 || hits > 0) {
      scored.push({ key, hash: entry.hash.slice(0, 8), hits, snippet: entry.content.slice(0, 280) });
    }
  }
  scored.sort((a, b) => b.hits - a.hits);
  return { scanned: files.length, results: scored.slice(0, Math.max(1, limit)) };
}

interface DreamProposal {
  diff: string;
  exampleTranscriptIds: string[];
  prevalence: { hits: number; scanned: number };
  rationale: string;
}

/** Build one dream proposal: diff + example IDs + prevalence + rationale. */
function runDreamPass(topic: string): DreamProposal {
  const { scanned, results } = searchEntries(topic, DEFAULT_STEER.maxProposals);
  const ids = results.map((r) => r.key);
  const diff = results.length === 0
    ? `# No memories mention "${topic}" yet. Proposed: create \`memory/${safeKey(topic)}.md\`.`
    : `# Promote "${topic}" (${results.length} entries)\n${results.map((r) => `## ${r.key} (${r.hash})\n${r.snippet}\n`).join("\n")}`;
  return {
    diff,
    exampleTranscriptIds: ids,
    prevalence: { hits: results.length, scanned },
    rationale: results.length >= DEFAULT_STEER.minPrevalence
      ? `"${topic}" recurs across ${results.length}/${scanned} entries, so it earns a durable memory slot.`
      : `Only ${results.length}/${scanned} entries mention "${topic}"; keep watching before promoting.`,
  };
}

function readSteer(): Record<string, unknown> {
  const path = join(memoryDir(), "steer.json");
  if (!existsSync(path)) return { ...DEFAULT_STEER };
  try {
    return { ...DEFAULT_STEER, ...(JSON.parse(readFileSync(path, "utf8")) as Record<string, unknown>) };
  } catch {
    return { ...DEFAULT_STEER };
  }
}

/** Audit: every entry with its hash, version, and staleness vs provenance. */
function runAudit(): string {
  const dir = memoryDir();
  if (!existsSync(dir)) return "AUDIT: memory dir missing (no entries).";
  const files = readdirSync(dir).filter((f) => f.endsWith(".md"));
  const lines = files.map((file) => {
    const key = file.slice(0, -3);
    const entry = readEntry(key);
    const prov = readProvenance(key);
    const drift = prov && entry && prov.hash !== entry.hash ? " DRIFT(file edited outside CAS)" : "";
    return `- ${key}: hash=${entry?.hash.slice(0, 12)} version=${prov?.version ?? 0} author=${prov?.author ?? "unknown"}${drift}`;
  });
  const report = `# memory-audit\nentries=${files.length}\n${lines.join("\n")}`;
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, ".audit.md"), `${report}\n`);
  return report;
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
        description: "CAS memory write: read, draft, re-hash, compare expectedHash, commit or abort.",
        input: obj({
          key: str("Memory key to write."),
          content: str("Full new content for the entry."),
          expectedHash: { type: "string", description: "Hash from memory_read; abort if current differs. Omit to force." },
          author: str("Author tag for provenance."),
        }, ["key", "content"]),
        options: { namespace: "memory" },
        execute: async (input: any) => {
          const key = String(input.key);
          const current = readEntry(key);
          const expected = input.expectedHash ? String(input.expectedHash) : null;
          if (current && expected && expected !== current.hash) {
            return { content: `ABORT stale write: expected=${expected} current=${current.hash}. Re-read, re-draft, retry.` };
          }
          const prov = commitEntry(key, String(input.content), String(input.author ?? "agent"));
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
        input: obj({ topic: str("Topic to dream about.") }, ["topic"]),
        options: { namespace: "dream" },
        execute: async (input: any) => {
          const proposal = runDreamPass(String(input.topic));
          mkdirSync(join(memoryDir(), ".dreams"), { recursive: true });
          writeFileSync(join(memoryDir(), ".dreams", `${Date.now()}.json`), JSON.stringify(proposal, null, 2));
          return { content: JSON.stringify(proposal, null, 2) };
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
          const steer = readSteer();
          let value: unknown = input.value;
          try { value = JSON.parse(String(input.value)); } catch { /* keep raw string */ }
          steer[String(input.key)] = value;
          mkdirSync(memoryDir(), { recursive: true });
          writeFileSync(join(memoryDir(), "steer.json"), JSON.stringify(steer, null, 2));
          return { content: `STEER_SET ${input.key}=${JSON.stringify(value)}\n${JSON.stringify(steer, null, 2)}` };
        },
      });
    });
    await ctx.command.transform((editor) => {
      editor.add({
        name: "dream-run",
        description: "Run one dream pass over memory and persist the proposal.",
        execute: async () => {
          const proposal = runDreamPass("recurring");
          mkdirSync(join(memoryDir(), ".dreams"), { recursive: true });
          writeFileSync(join(memoryDir(), ".dreams", "latest.json"), JSON.stringify(proposal, null, 2));
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

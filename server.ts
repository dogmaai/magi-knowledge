import crypto from 'crypto';
import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import type {
  ActorEvent,
  BundlePayload,
  LifecycleStatus,
  LintDiagnostic,
  LintReport,
  ParsedConcept,
  R2SyncPreviewItem,
  SafeLoaderReport,
  SafeLoaderSmokeTestResult,
  TreeScope,
  TrustTier,
  UnitDetectorSyncReport,
} from './src/types/okf.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const BUNDLE_ROOT = __dirname;

const RESERVED_FILENAMES = new Set(['index.md', 'log.md', 'README.md']);
const LIFECYCLE_STATUSES = new Set(['draft', 'stable', 'deprecated']);
const IGNORED_DIRS = new Set(['.git', 'node_modules', 'dist', 'src', 'public']);

const CROSS_UNIT_NAMES = [
  'sophia',
  'melchior',
  'anima',
  'casper',
  'oracle',
  'zeroel',
  'tiara',
  'seraph',
  'balthasar',
  'prometheus',
  'typhon',
  'adam',
  'qwen',
  'sekhmet',
  'boreas',
];

const ACTOR_RE = /^(human:[A-Za-z0-9_.-]+|process:[A-Za-z0-9_.-]+|[A-Za-z0-9_.-]+\/[A-Za-z0-9_.:-]+)$/;
const CROSS_UNIT_RE = new RegExp(`\\b(${CROSS_UNIT_NAMES.join('|')})\\b`, 'i');
const SECTION5_RE = /section\s*5|jun[\s_-]*review[\s_-]*only/i;
const TICKER_PICK_RE = /\b(entry|stop[\s_-]*loss|stop|target|take[\s_-]*profit|tp|sl)\b\s*[:=]\s*\$?\d/i;
const UNIT_WINRATE_RE = new RegExp(
  `\\b(${CROSS_UNIT_NAMES.join('|')})\\b[^\\n]{0,40}?\\d{1,3}\\s*%`,
  'i'
);
const MD_LINK_RE = /\]\(([^)\s#]+)(?:#[^)]*)?\)/g;

// In-memory overrides for interactive concept editing / drafting without mutating protected repo files
const inMemoryConceptOverrides = new Map<string, string>();

function coerceScalar(raw: string): any {
  const s = raw.trim();
  if ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'"))) {
    return s.slice(1, -1);
  }
  const low = s.toLowerCase();
  if (low === 'true' || low === 'false') {
    return low === 'true';
  }
  if (low === 'null' || low === '~' || low === '') {
    return null;
  }
  if (/^-?\d+$/.test(s)) {
    return parseInt(s, 10);
  }
  if (/^-?\d+\.\d+$/.test(s)) {
    return parseFloat(s);
  }
  return s;
}

function splitTopLevel(inner: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let quote: string | null = null;
  let buf = '';
  for (const ch of inner) {
    if (quote) {
      if (ch === quote) quote = null;
    } else if (ch === '"' || ch === "'") {
      quote = ch;
    } else if (ch === '{' || ch === '[') {
      depth += 1;
    } else if (ch === '}' || ch === ']') {
      depth -= 1;
    } else if (ch === ',' && depth === 0) {
      parts.push(buf);
      buf = '';
      continue;
    }
    buf += ch;
  }
  if (buf.length > 0 || parts.length > 0) {
    parts.push(buf);
  }
  return parts;
}

function parseValue(raw: string): any {
  const s = raw.trim();
  if (s.startsWith('[') && s.endsWith(']')) {
    const inner = s.slice(1, -1).trim();
    if (!inner) return [];
    return splitTopLevel(inner).map((part) => parseValue(part));
  }
  if (s.startsWith('{') && s.endsWith('}')) {
    const inner = s.slice(1, -1).trim();
    const out: Record<string, any> = {};
    if (!inner) return out;
    for (const part of splitTopLevel(inner)) {
      const idx = part.indexOf(':');
      if (idx === -1) {
        throw new Error(`malformed flow mapping entry: ${part.trim()}`);
      }
      const key = part.slice(0, idx).trim();
      const val = part.slice(idx + 1);
      out[key] = parseValue(val);
    }
    return out;
  }
  return coerceScalar(s);
}

export function parseFrontmatter(text: string): { frontmatter: Record<string, any>; body: string } {
  if (!text.startsWith('---')) {
    throw new Error("missing opening '---' frontmatter delimiter");
  }
  const lines = text.split(/\r?\n/);
  if (lines[0].trim() !== '---') {
    throw new Error("first line must be exactly '---'");
  }
  const fm: Record<string, any> = {};
  let bodyStart: number | null = null;
  for (let i = 1; i < lines.length; i++) {
    if (lines[i].trim() === '---') {
      bodyStart = i + 1;
      break;
    }
    const line = lines[i];
    if (!line.trim() || line.trimStart().startsWith('#')) {
      continue;
    }
    const idx = line.indexOf(':');
    if (idx === -1) {
      throw new Error(`malformed frontmatter line: ${line}`);
    }
    const key = line.slice(0, idx).trim();
    const value = line.slice(idx + 1);
    fm[key] = parseValue(value);
  }
  if (bodyStart === null) {
    throw new Error("missing closing '---' frontmatter delimiter");
  }
  const body = lines.slice(bodyStart).join('\n');
  return { frontmatter: fm, body };
}

function isActor(value: any): boolean {
  return typeof value === 'string' && ACTOR_RE.test(value);
}

function parseDatetime(value: any): Date | null {
  if (typeof value !== 'string') return null;
  const s = value.trim();
  // Must have explicit UTC offset ('Z' or +/-HH:MM)
  if (!/(Z|[+-]\d{2}:\d{2})$/.test(s)) return null;
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
}

function verifiedEvents(fm: Record<string, any>): ActorEvent[] {
  const v = fm.verified;
  if (v === undefined || v === null) return [];
  if (Array.isArray(v)) return v.filter((x) => x && typeof x === 'object');
  if (typeof v === 'object') return [v as ActorEvent];
  return [];
}

function computeTrustTier(fm: Record<string, any>): TrustTier {
  const events = verifiedEvents(fm);
  if (events.length === 0) return 'unverified';
  const hasHuman = events.some((e) => typeof e.by === 'string' && e.by.startsWith('human:'));
  return hasHuman ? 'human-reviewed' : 'machine-confirmed';
}

function computeLatestVerifiedAt(fm: Record<string, any>): string | null {
  const dates = verifiedEvents(fm)
    .map((e) => parseDatetime(e.at))
    .filter((d): d is Date => d !== null);
  if (dates.length === 0) return null;
  const max = new Date(Math.max(...dates.map((d) => d.getTime())));
  return max.toISOString();
}

function computeLifecycleStatus(fm: Record<string, any>): LifecycleStatus {
  const s = fm.status;
  if (s === 'draft' || s === 'stable' || s === 'deprecated') return s;
  return 'stable';
}

function extractVerbatimBlock(text: string, lang = 'text'): string {
  const openMarker = '```' + lang;
  const lines = text.split('\n');
  let start: number | null = null;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].trim() === openMarker) {
      start = i + 1;
      break;
    }
  }
  if (start === null) {
    throw new Error(`no opening \`\`\`${lang} fence in document`);
  }
  for (let j = start; j < lines.length; j++) {
    if (lines[j].trim() === '```') {
      return lines.slice(start, j).join('\n');
    }
  }
  throw new Error('unterminated fenced block');
}

function walkMarkdownFiles(dir: string, results: string[] = []): string[] {
  const entries = fs.readdirSync(dir, { withFileTypes: true }).sort((a, b) =>
    a.name.localeCompare(b.name)
  );
  for (const entry of entries) {
    if (IGNORED_DIRS.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walkMarkdownFiles(full, results);
    } else if (entry.isFile() && entry.name.endsWith('.md')) {
      results.push(full);
    }
  }
  return results;
}

function classifyTree(relPath: string): { tree: TreeScope; subtree: string } {
  const parts = relPath.split('/');
  if (parts[0] === '_lilith_safe') {
    return { tree: '_lilith_safe', subtree: parts.length > 2 ? parts[1] : 'root' };
  }
  if (parts[0] === 'system') {
    return { tree: 'system', subtree: parts.length > 2 ? parts[1] : 'root' };
  }
  if (parts[0] === '.agents') {
    return { tree: 'skills', subtree: parts.slice(1, -1).join('/') || 'skills' };
  }
  return { tree: 'root', subtree: 'workflow' };
}

function resolveLink(srcRelPath: string, target: string): string | null {
  if (target.includes('://') || target.startsWith('mailto:')) return null;
  if (target.startsWith('/')) {
    return target.replace(/^\/+/, '');
  }
  const srcDir = path.posix.dirname(srcRelPath);
  return path.posix.normalize(srcDir === '.' ? target : `${srcDir}/${target}`);
}

function readConceptText(relPath: string): string {
  if (inMemoryConceptOverrides.has(relPath)) {
    return inMemoryConceptOverrides.get(relPath)!;
  }
  return fs.readFileSync(path.join(BUNDLE_ROOT, relPath), 'utf-8');
}

function loadAllData(failOnStale = false): BundlePayload {
  const allMdPaths = walkMarkdownFiles(BUNDLE_ROOT);
  const now = new Date();
  const concepts: ParsedConcept[] = [];
  const reservedDocs: Array<{ relPath: string; title: string; body: string }> = [];
  let bundleRootDoc = {
    relPath: 'index.md',
    frontmatter: { okf_version: '0.2' } as Record<string, any>,
    body: '',
  };

  for (const fullPath of allMdPaths) {
    const relPath = path.relative(BUNDLE_ROOT, fullPath).split(path.sep).join('/');
    if (relPath.startsWith('scripts/')) continue;
    const fileName = path.posix.basename(relPath);
    const rawText = readConceptText(relPath);

    if (RESERVED_FILENAMES.has(fileName)) {
      if (relPath === 'index.md') {
        try {
          const parsed = parseFrontmatter(rawText);
          bundleRootDoc = {
            relPath,
            frontmatter: parsed.frontmatter,
            body: parsed.body,
          };
        } catch {
          bundleRootDoc = { relPath, frontmatter: {}, body: rawText };
        }
      }
      const firstHeading = rawText.match(/^#\s+(.+)$/m)?.[1]?.trim() || relPath;
      reservedDocs.push({
        relPath,
        title: firstHeading,
        body: relPath === 'index.md' ? bundleRootDoc.body : rawText,
      });
      continue;
    }

    try {
      const { frontmatter: fm, body } = parseFrontmatter(rawText);
      const conceptId = relPath.endsWith('.md') ? relPath.slice(0, -3) : relPath;
      const { tree, subtree } = classifyTree(relPath);
      const staleDate = fm.stale_after ? parseDatetime(fm.stale_after) : null;
      const status = computeLifecycleStatus(fm);
      const isStale = staleDate !== null && now >= staleDate && status !== 'deprecated';

      const outgoingLinks: string[] = [];
      let m: RegExpExecArray | null;
      const linkRe = new RegExp(MD_LINK_RE.source, 'g');
      while ((m = linkRe.exec(body)) !== null) {
        const resolved = resolveLink(relPath, m[1]);
        if (resolved) outgoingLinks.push(resolved);
      }

      concepts.push({
        conceptId,
        relPath,
        tree,
        subtree,
        isReserved: false,
        frontmatter: fm,
        body,
        rawText,
        title: String(fm.title || fm.name || path.posix.basename(conceptId)),
        type: String(fm.type || (tree === 'skills' ? 'Agent Skill' : 'Unknown')),
        description: String(fm.description || ''),
        lilithSafe: typeof fm.lilith_safe === 'boolean' ? fm.lilith_safe : null,
        status,
        unitStatus: fm.unit_status ? String(fm.unit_status) : null,
        trustTier: computeTrustTier(fm),
        generated: fm.generated && typeof fm.generated === 'object' ? fm.generated : null,
        verified: verifiedEvents(fm),
        latestVerifiedAt: computeLatestVerifiedAt(fm),
        staleAfter: fm.stale_after ? String(fm.stale_after) : null,
        isStale,
        tags: Array.isArray(fm.tags) ? fm.tags.map(String) : [],
        outgoingLinks: Array.from(new Set(outgoingLinks)),
      });
    } catch {
      // Handled in linter below
    }
  }

  const lintReport = runOkfLinter(allMdPaths, failOnStale);
  const detectorSync = runUnitDetectorSync();
  const safeLoader = runSafeLoaderSuite(concepts);
  const r2Preview = buildR2SyncPreview(concepts, String(bundleRootDoc.frontmatter.okf_version || '0.2'));

  return {
    okfVersion: String(bundleRootDoc.frontmatter.okf_version || '0.2'),
    gitRevision: '383a61655330',
    bundleRootDoc,
    reservedDocs,
    concepts,
    lintReport,
    detectorSync,
    safeLoader,
    r2Preview,
  };
}

export function lintSingleDocument(
  relPath: string,
  rawText: string,
  now = new Date()
): LintDiagnostic[] {
  const diags: LintDiagnostic[] = [];
  const conceptId = relPath.endsWith('.md') ? relPath.slice(0, -3) : relPath;
  let fm: Record<string, any>;
  let body: string;

  try {
    const parsed = parseFrontmatter(rawText);
    fm = parsed.frontmatter;
    body = parsed.body;
  } catch (err: any) {
    diags.push({
      level: 'ERROR',
      relPath,
      conceptId,
      category: 'okf_conformance',
      message: `frontmatter parse error: ${err.message}`,
    });
    return diags;
  }

  if (!fm.type) {
    diags.push({
      level: 'ERROR',
      relPath,
      conceptId,
      category: 'okf_conformance',
      message: "missing required non-empty 'type' field",
    });
  }

  const underSafe = relPath.startsWith('_lilith_safe/');
  const underSystem = relPath.startsWith('system/');

  if (underSafe || underSystem) {
    const status = fm.status;
    if (!LIFECYCLE_STATUSES.has(status)) {
      diags.push({
        level: 'ERROR',
        relPath,
        conceptId,
        category: 'trust_lifecycle',
        message: `'status' must be one of draft/stable/deprecated (got ${JSON.stringify(status)}; unit lifecycle belongs in 'unit_status')`,
      });
    }

    const gen = fm.generated;
    if (!gen || typeof gen !== 'object' || Array.isArray(gen)) {
      diags.push({
        level: 'ERROR',
        relPath,
        conceptId,
        category: 'trust_lifecycle',
        message: "missing 'generated: { by, at }'",
      });
    } else {
      if (!isActor(gen.by)) {
        diags.push({
          level: 'ERROR',
          relPath,
          conceptId,
          category: 'trust_lifecycle',
          message: `generated.by ${JSON.stringify(gen.by)} is not a §7 actor`,
        });
      }
      if (!parseDatetime(gen.at)) {
        diags.push({
          level: 'ERROR',
          relPath,
          conceptId,
          category: 'trust_lifecycle',
          message: `generated.at ${JSON.stringify(gen.at)} is not ISO 8601 with UTC offset`,
        });
      }
    }

    let humanVerified = false;
    let humanCurrent = false;
    const genAt = gen && typeof gen === 'object' ? parseDatetime(gen.at) : null;
    const rawVerified = fm.verified === undefined || fm.verified === null ? [] : Array.isArray(fm.verified) ? fm.verified : [fm.verified];

    for (const ev of rawVerified) {
      if (!ev || typeof ev !== 'object' || Array.isArray(ev)) {
        diags.push({
          level: 'ERROR',
          relPath,
          conceptId,
          category: 'trust_lifecycle',
          message: `verified entry ${JSON.stringify(ev)} is not a { by, at } mapping`,
        });
        continue;
      }
      const by = ev.by;
      if (!isActor(by)) {
        diags.push({
          level: 'ERROR',
          relPath,
          conceptId,
          category: 'trust_lifecycle',
          message: `verified.by ${JSON.stringify(by)} is not a §7 actor`,
        });
      } else if (String(by).startsWith('human:')) {
        humanVerified = true;
      }
      const evAt = parseDatetime(ev.at);
      if (!evAt) {
        diags.push({
          level: 'ERROR',
          relPath,
          conceptId,
          category: 'trust_lifecycle',
          message: `verified.at ${JSON.stringify(ev.at)} is not ISO 8601 with UTC offset`,
        });
      } else if (typeof by === 'string' && by.startsWith('human:') && genAt !== null && evAt >= genAt) {
        humanCurrent = true;
      }
    }

    if (status === 'stable' && !humanVerified) {
      diags.push({
        level: 'ERROR',
        relPath,
        conceptId,
        category: 'trust_lifecycle',
        message: "'status: stable' requires a 'verified' entry by a human: actor (machine/AI review only qualifies for 'draft')",
      });
    } else if (status === 'stable' && genAt !== null && !humanCurrent) {
      diags.push({
        level: 'ERROR',
        relPath,
        conceptId,
        category: 'trust_lifecycle',
        message: `'status: stable' but every human verified.at predates generated.at '${gen.at}' — the verification covers an older revision; re-verify or demote to 'draft'`,
      });
    } else if (status === 'draft' && genAt !== null && humanVerified && !humanCurrent) {
      diags.push({
        level: 'WARN',
        relPath,
        conceptId,
        category: 'trust_lifecycle',
        message: `human verification predates generated.at '${gen.at}' — awaiting re-verification`,
      });
    }

    if ('stale_after' in fm) {
      const sa = parseDatetime(fm.stale_after);
      if (!sa) {
        diags.push({
          level: 'ERROR',
          relPath,
          conceptId,
          category: 'freshness',
          message: `stale_after ${JSON.stringify(fm.stale_after)} is not ISO 8601 with UTC offset`,
        });
      } else if (now >= sa && status !== 'deprecated') {
        diags.push({
          level: 'STALE',
          relPath,
          conceptId,
          category: 'freshness',
          message: `stale since ${fm.stale_after} — re-verify or deprecate`,
        });
      }
    } else if (status === 'stable') {
      diags.push({
        level: 'WARN',
        relPath,
        conceptId,
        category: 'freshness',
        message: "stable doc without 'stale_after' (freshness cannot be judged)",
      });
    }
  }

  const lilithSafe = fm.lilith_safe;
  if (underSafe && lilithSafe !== true) {
    diags.push({
      level: 'ERROR',
      relPath,
      conceptId,
      category: 'lilith_boundary',
      message: `under _lilith_safe/ but 'lilith_safe' is not true (got ${JSON.stringify(lilithSafe)})`,
    });
  }
  if (underSystem && lilithSafe !== false) {
    diags.push({
      level: 'ERROR',
      relPath,
      conceptId,
      category: 'lilith_boundary',
      message: `under system/ but 'lilith_safe' is not false (got ${JSON.stringify(lilithSafe)})`,
    });
  }
  if (underSystem && lilithSafe === true) {
    diags.push({
      level: 'ERROR',
      relPath,
      conceptId,
      category: 'lilith_boundary',
      message: "FORBIDDEN — 'lilith_safe: true' under system/",
    });
  }
  if (!underSafe && !underSystem && (lilithSafe === undefined || lilithSafe === null)) {
    diags.push({
      level: 'WARN',
      relPath,
      conceptId,
      category: 'lilith_boundary',
      message: "no 'lilith_safe' flag (outside both trees)",
    });
  }

  if (underSafe) {
    const definesProhibitions = fm.defines_prohibitions === true;
    if (SECTION5_RE.test(body) && !definesProhibitions) {
      diags.push({
        level: 'ERROR',
        relPath,
        conceptId,
        category: 'lilith_contamination',
        message:
          "CONTAMINATION — Section 5 / Jun-Review marker in a LILITH-safe doc (set 'defines_prohibitions: true' only on a doc whose purpose is to define the prohibition)",
      });
    }
    if (TICKER_PICK_RE.test(body)) {
      diags.push({
        level: 'ERROR',
        relPath,
        conceptId,
        category: 'lilith_contamination',
        message: 'CONTAMINATION — explicit ticker entry/stop/target in a LILITH-safe doc',
      });
    }
    if (UNIT_WINRATE_RE.test(body)) {
      diags.push({
        level: 'ERROR',
        relPath,
        conceptId,
        category: 'lilith_contamination',
        message: 'CONTAMINATION — win-rate attributed to another MAGI unit in a LILITH-safe doc',
      });
    }
    const isDetector = fm.cross_unit_detector === true;
    if (!isDetector && CROSS_UNIT_RE.test(body)) {
      const m = CROSS_UNIT_RE.exec(body);
      diags.push({
        level: 'ERROR',
        relPath,
        conceptId,
        category: 'lilith_contamination',
        message: `CONTAMINATION — cross-unit name '${m?.[1]}' in a LILITH-safe doc (set 'cross_unit_detector: true' only on the dedicated detector doc)`,
      });
    }
  }

  return diags;
}

function runOkfLinter(allMdPaths: string[], failOnStale = false): LintReport {
  const now = new Date();
  const diagnostics: LintDiagnostic[] = [];
  let scannedCount = 0;
  const statuses = new Map<string, LifecycleStatus>();
  const links: Array<{ srcRel: string; rawTarget: string; targetRel: string }> = [];

  for (const fullPath of allMdPaths) {
    const relPath = path.relative(BUNDLE_ROOT, fullPath).split(path.sep).join('/');
    if (relPath.startsWith('scripts/')) continue;
    const fileName = path.posix.basename(relPath);

    if (fileName === 'index.md') {
      const text = readConceptText(relPath);
      const isRoot = relPath === 'index.md';
      if (text.startsWith('---')) {
        if (!isRoot) {
          diagnostics.push({
            level: 'ERROR',
            relPath,
            conceptId: relPath,
            category: 'reserved_index',
            message: 'only the bundle-root index.md may carry frontmatter',
          });
        } else {
          try {
            parseFrontmatter(text);
          } catch (err: any) {
            diagnostics.push({
              level: 'ERROR',
              relPath,
              conceptId: relPath,
              category: 'reserved_index',
              message: `bad root index frontmatter: ${err.message}`,
            });
          }
        }
      }
      continue;
    }

    if (RESERVED_FILENAMES.has(fileName)) continue;
    scannedCount += 1;
    const rawText = readConceptText(relPath);
    const docDiags = lintSingleDocument(relPath, rawText, now);
    diagnostics.push(...docDiags);

    try {
      const { frontmatter: fm, body } = parseFrontmatter(rawText);
      statuses.set(relPath, computeLifecycleStatus(fm));
      let m: RegExpExecArray | null;
      const linkRe = new RegExp(MD_LINK_RE.source, 'g');
      while ((m = linkRe.exec(body)) !== null) {
        const targetRel = resolveLink(relPath, m[1]);
        if (targetRel) {
          links.push({ srcRel: relPath, rawTarget: m[1], targetRel });
        }
      }
    } catch {
      // Already logged by lintSingleDocument
    }
  }

  const seenLinks = new Set<string>();
  for (const { srcRel, rawTarget, targetRel } of links) {
    const key = `${srcRel}:::${rawTarget}:::${targetRel}`;
    if (seenLinks.has(key)) continue;
    seenLinks.add(key);
    if (statuses.get(srcRel) === 'deprecated') continue;
    if (statuses.get(targetRel) === 'deprecated') {
      diagnostics.push({
        level: 'ERROR',
        relPath: srcRel,
        conceptId: srcRel.replace(/\.md$/, ''),
        category: 'deprecated_link',
        message: `links to deprecated concept '${rawTarget}' — point at its successor or mark this doc deprecated too`,
      });
    }
  }

  const staleCount = diagnostics.filter((d) => d.level === 'STALE').length;
  const baseErrors = diagnostics.filter((d) => d.level === 'ERROR').length;
  const baseWarnings = diagnostics.filter((d) => d.level === 'WARN').length;

  const errorCount = failOnStale ? baseErrors + staleCount : baseErrors;
  const warningCount = failOnStale ? baseWarnings : baseWarnings + staleCount;

  return {
    scannedCount,
    errorCount,
    warningCount,
    staleCount,
    passed: errorCount === 0,
    failOnStale,
    timestamp: now.toISOString(),
    diagnostics,
  };
}

function runUnitDetectorSync(): UnitDetectorSyncReport {
  const registryText = readConceptText('system/plm-units/index.md');
  const detectorText = readConceptText('_lilith_safe/hallucination-patterns/cross-unit.md');

  const stemsSet = new Set<string>();
  const linkRe = /\[([A-Za-z0-9-]+)\]\(([a-z0-9-]+)\.md\)/g;
  let m: RegExpExecArray | null;
  while ((m = linkRe.exec(registryText)) !== null) {
    const slug = m[2].toLowerCase();
    const stem = slug.replace(/-\d+$/, '');
    stemsSet.add(stem);
  }
  stemsSet.delete('index');
  stemsSet.delete('lilith');

  const { frontmatter } = parseFrontmatter(detectorText);
  const unitNames: string[] = Array.isArray(frontmatter.unit_names)
    ? frontmatter.unit_names.map((n: any) => String(n).trim().toLowerCase())
    : [];
  const detectedSet = new Set(unitNames);
  const linterSet = new Set(CROSS_UNIT_NAMES.map((n) => n.toLowerCase()));

  const registryStems = Array.from(stemsSet).sort();
  const detectorNames = Array.from(detectedSet).sort();
  const linterNames = Array.from(linterSet).sort();

  const missingFromDetector = registryStems.filter((s) => !detectedSet.has(s));
  const missingFromLinter = registryStems.filter((s) => !linterSet.has(s));
  const detectorOnlyNames = detectorNames.filter(
    (d) => !stemsSet.has(d) && d !== 'seraph' && d !== 'balthasar'
  );
  const selfNameInDetector = detectedSet.has('lilith');

  const ok =
    missingFromDetector.length === 0 &&
    missingFromLinter.length === 0 &&
    !selfNameInDetector;

  return {
    ok,
    registryStems,
    detectorNames,
    linterNames,
    missingFromDetector,
    missingFromLinter,
    detectorOnlyNames,
    selfNameInDetector,
  };
}

export function probeSafeLoader(conceptIdInput: string, mode: 'get' | 'verbatim_block' = 'get') {
  const safeRoot = path.resolve(BUNDLE_ROOT, '_lilith_safe');
  const cid = conceptIdInput.endsWith('.md') ? conceptIdInput.slice(0, -3) : conceptIdInput;
  if (cid.split('/').includes('..')) {
    throw new Error(`LilithContaminationError: path traversal blocked: '${cid}'`);
  }
  const rel = cid.startsWith('_lilith_safe/') ? cid : `_lilith_safe/${cid}`;
  const fullPath = path.resolve(BUNDLE_ROOT, `${rel}.md`);
  if (fullPath !== safeRoot && !fullPath.startsWith(safeRoot + path.sep)) {
    throw new Error(`LilithContaminationError: refusing to read outside _lilith_safe/: ${fullPath}`);
  }
  const relNormalized = path.relative(BUNDLE_ROOT, fullPath).split(path.sep).join('/');
  if (!fs.existsSync(fullPath) && !inMemoryConceptOverrides.has(relNormalized)) {
    throw new Error(`FileNotFoundError: no safe concept '${conceptIdInput}' (${relNormalized})`);
  }
  const raw = readConceptText(relNormalized);
  const { frontmatter, body } = parseFrontmatter(raw);
  if (frontmatter.lilith_safe !== true) {
    throw new Error(
      `LilithContaminationError: ${rel}: lilith_safe flag is not true — refusing`
    );
  }
  if (mode === 'verbatim_block') {
    return {
      conceptId: rel,
      frontmatter,
      verbatimBlock: extractVerbatimBlock(raw, 'text'),
    };
  }
  return {
    conceptId: rel,
    frontmatter,
    body,
  };
}

function runSafeLoaderSuite(concepts: ParsedConcept[]): SafeLoaderReport {
  const safeConcepts = concepts.filter((c) => c.tree === '_lilith_safe');
  const tests: SafeLoaderSmokeTestResult[] = [];

  // Test 1: Non-empty safe concepts & all flagged lilith_safe: true
  const unflagged = safeConcepts.filter((c) => c.lilithSafe !== true);
  tests.push({
    id: 'safe-flag-check',
    name: 'All _lilith_safe/ Concepts Carry lilith_safe: true',
    description: 'Verifies every concept loaded from _lilith_safe/ declares lilith_safe: true.',
    passed: safeConcepts.length > 0 && unflagged.length === 0,
    detail:
      unflagged.length === 0
        ? `Loaded ${safeConcepts.length} LILITH-safe concepts; 0 unflagged.`
        : `Failed on ${unflagged.map((c) => c.conceptId).join(', ')}`,
  });

  // Test 2: schemas/isabel-stats-block reachable
  try {
    const res = probeSafeLoader('schemas/isabel-stats-block', 'get');
    tests.push({
      id: 'load-isabel-schema',
      name: 'Load schemas/isabel-stats-block',
      description: 'Confirms canonical ISABEL_STATS_BLOCK schema loads through LilithSafeKnowledge.get().',
      passed: Boolean(res.frontmatter.block_tag === 'ISABEL_STATS_BLOCK'),
      detail: `Resolved ${res.conceptId} (source_table=${res.frontmatter.source_table}, window=${res.frontmatter.window})`,
    });
  } catch (err: any) {
    tests.push({
      id: 'load-isabel-schema',
      name: 'Load schemas/isabel-stats-block',
      description: 'Confirms canonical ISABEL_STATS_BLOCK schema loads.',
      passed: false,
      detail: err.message,
    });
  }

  // Test 3: Block traversal into ../system/plm-units/sophia-5
  let blockedSystemTraversal = false;
  let systemTraversalMsg = '';
  try {
    probeSafeLoader('../system/plm-units/sophia-5', 'get');
  } catch (err: any) {
    blockedSystemTraversal = err.message.includes('LilithContaminationError');
    systemTraversalMsg = err.message;
  }
  tests.push({
    id: 'block-system-traversal',
    name: 'Refuse Cross-Tree Traversal (../system/plm-units/sophia-5)',
    description: 'Ensures attempting to read system/ via LilithSafeKnowledge raises LilithContaminationError.',
    passed: blockedSystemTraversal,
    detail: systemTraversalMsg || 'Traversal was not blocked',
  });

  // Test 4: Block arbitrary path traversal (../../etc/passwd)
  let blockedRootTraversal = false;
  let rootTraversalMsg = '';
  try {
    probeSafeLoader('../../etc/passwd', 'get');
  } catch (err: any) {
    blockedRootTraversal = err.message.includes('LilithContaminationError');
    rootTraversalMsg = err.message;
  }
  tests.push({
    id: 'block-root-traversal',
    name: 'Refuse Filesystem Escape (../../etc/passwd)',
    description: 'Ensures directory traversal outside bundle raises LilithContaminationError.',
    passed: blockedRootTraversal,
    detail: rootTraversalMsg || 'Traversal was not blocked',
  });

  // Test 5: Cross-unit detector list non-empty
  const detectorDoc = safeConcepts.find((c) => c.frontmatter.cross_unit_detector === true);
  const detectorList: string[] = Array.isArray(detectorDoc?.frontmatter.unit_names)
    ? detectorDoc!.frontmatter.unit_names.map((x: any) => String(x).toLowerCase())
    : [];
  tests.push({
    id: 'cross-unit-detector-list',
    name: 'Cross-Unit Detector List Populated',
    description: 'Exposes flat unit_names detector list from cross_unit_detector: true concept.',
    passed: detectorList.length > 0,
    detail: `${detectorList.length} forbidden unit stems: ${detectorList.join(', ')}`,
  });

  // Test 6: Verbatim output-rules block byte-for-byte & no unit leak
  let verbatimOutputRules = '';
  let interpolatedOutputRules = '';
  try {
    const res = probeSafeLoader('constitution/output-rules', 'verbatim_block');
    verbatimOutputRules = res.verbatimBlock || '';
    interpolatedOutputRules = verbatimOutputRules.replace(
      '{cross_unit_names}',
      detectorList.join(', ')
    );
    const hasPlaceholder = verbatimOutputRules.includes('{cross_unit_names}');
    const hasConstraints = verbatimOutputRules.includes('ABSOLUTE CONSTRAINTS');
    const hasNewlines =
      verbatimOutputRules.startsWith('\n') && verbatimOutputRules.endsWith('\n');
    const leakedUnit = detectorList.find((u) =>
      verbatimOutputRules.toLowerCase().includes(u.toLowerCase())
    );
    const ok = hasPlaceholder && hasConstraints && hasNewlines && !leakedUnit;
    tests.push({
      id: 'verbatim-output-rules',
      name: 'Byte-for-Byte Verbatim Block (constitution/output-rules)',
      description:
        'Preserves leading/trailing newlines, carries {cross_unit_names} placeholder, and leaks zero literal unit names.',
      passed: ok,
      detail: ok
        ? `Verified ${verbatimOutputRules.length} bytes with leading/trailing '\\n' and {cross_unit_names} placeholder.`
        : `Failed invariant check (leaked=${leakedUnit || 'none'})`,
    });
  } catch (err: any) {
    tests.push({
      id: 'verbatim-output-rules',
      name: 'Byte-for-Byte Verbatim Block (constitution/output-rules)',
      description: 'Preserves leading/trailing newlines and placeholder.',
      passed: false,
      detail: err.message,
    });
  }

  // Test 7: Missing fenced block fails loud
  let failedLoudOnNoFence = false;
  let noFenceMsg = '';
  try {
    probeSafeLoader('constitution/clean-source-rule', 'verbatim_block');
  } catch (err: any) {
    failedLoudOnNoFence = err.message.includes('no opening ```text fence');
    noFenceMsg = err.message;
  }
  tests.push({
    id: 'fail-loud-no-fence',
    name: 'Fail-Loud on Missing Verbatim Fence (constitution/clean-source-rule)',
    description: 'Raises ValueError when verbatim_block() is called on a doc without a ```text fence.',
    passed: failedLoudOnNoFence,
    detail: noFenceMsg || 'Did not raise expected error',
  });

  // Test 8: Distribution priors JSON parse & sum-to-1.0 invariants
  let distributionPriors: any = null;
  try {
    const priorsDoc = safeConcepts.find((c) => c.frontmatter.distribution_priors === true);
    if (!priorsDoc) throw new Error('No distribution_priors: true concept found');
    const jsonBlock = extractVerbatimBlock(priorsDoc.rawText, 'json');
    distributionPriors = JSON.parse(jsonBlock);
    const vixApplied: Record<string, number> =
      distributionPriors.macro.vix_regime_weights.applied;
    const vixSum = Object.values(vixApplied).reduce((a, b) => a + b, 0);
    const nbApplied: Record<string, number> =
      distributionPriors.isabel_lilith.n_bucket_weights.applied;
    const nbSum = Object.values(nbApplied).reduce((a, b) => a + b, 0);
    const hasCashP50 = 'p50' in distributionPriors.macro.cash_pct_quantiles;
    const hasAtrP50 = 'p50' in distributionPriors.technicals.atr_pct_of_price_quantiles;
    const ok =
      Math.abs(vixSum - 1.0) <= 1e-6 &&
      Math.abs(nbSum - 1.0) <= 1e-6 &&
      hasCashP50 &&
      hasAtrP50;
    tests.push({
      id: 'echidna-distribution-priors',
      name: 'ECHIDNA Fitted Distribution Priors Invariants',
      description:
        'Validates vix_regime_weights.applied (sum=1.0), n_bucket_weights.applied (sum=1.0), cash_pct p50, and atr_pct p50.',
      passed: ok,
      detail: `vix_applied sum=${vixSum.toFixed(4)}, n_bucket sum=${nbSum.toFixed(4)}, cash p50=${distributionPriors.macro.cash_pct_quantiles.p50}%, ATR p50=${distributionPriors.technicals.atr_pct_of_price_quantiles.p50}%`,
    });
  } catch (err: any) {
    tests.push({
      id: 'echidna-distribution-priors',
      name: 'ECHIDNA Fitted Distribution Priors Invariants',
      description: 'Validates distribution priors JSON block.',
      passed: false,
      detail: err.message,
    });
  }

  return {
    passed: tests.every((t) => t.passed),
    safeConceptCount: safeConcepts.length,
    crossUnitDetectorNames: detectorList,
    verbatimOutputRules,
    interpolatedOutputRules,
    distributionPriors,
    tests,
  };
}

export function exportOkfDigest(tree: 'system' | '_lilith_safe'): string {
  const expectedSafe = tree === '_lilith_safe';
  const rootText = readConceptText('index.md');
  const { frontmatter: rootFm, body: rootBody } = parseFrontmatter(rootText);
  const okfVersion = String(rootFm.okf_version || '0.2');

  const parts: string[] = [
    `# MAGI knowledge digest — ${tree}/`,
    '',
    `* source: \`dogmaai/magi-knowledge\` @ \`383a61655330\``,
    `* okf_version: \`${okfVersion}\``,
    `* lilith_safe: \`${String(expectedSafe)}\``,
    '',
    'Generated by `scripts/okf_export.py`. The repository is the source of',
    'truth — regenerate rather than editing this digest.',
    '',
    '---',
    '',
    '## How to read this digest (OKF v0.1)',
    '',
    'This is a flattened cache of one directory-tree Markdown bundle in the',
    'Open Knowledge Format (OKF) v0.1. The repository is the source of truth;',
    'regenerate the digest rather than editing it.',
    'Each concept document is Markdown with a flat YAML frontmatter block',
    'delimited by `---` lines, followed by the document body.',
    '`index.md`, `log.md`, and `README.md` are reserved filenames, not concepts.',
    'A concept ID is the bundle-root-relative path with the `.md` suffix removed.',
    'In this digest, each concept appears under a `## <concept_id>` heading.',
    "The italic line immediately below that heading contains the document's",
    'frontmatter, except for `lilith_safe`; the document body follows it.',
    'Only one tree is flattened per digest, and its safety boundary is checked',
    'during export. OKF specification:',
    'https://github.com/GoogleCloudPlatform/knowledge-catalog/blob/main/okf/SPEC.md',
    '',
  ];

  const treeIndexRel = `${tree}/index.md`;
  if (fs.existsSync(path.join(BUNDLE_ROOT, treeIndexRel))) {
    if (tree === 'system') {
      parts.push('---', '', '## OKF bundle overview', '', rootBody.trim(), '');
    }
    const treeIndexBody = readConceptText(treeIndexRel).trim();
    parts.push('---', '', `## ${tree}/index.md`, '', treeIndexBody, '');
  }

  const treeDir = path.join(BUNDLE_ROOT, tree);
  const mdFiles = walkMarkdownFiles(treeDir);
  for (const fullPath of mdFiles) {
    const relPath = path.relative(BUNDLE_ROOT, fullPath).split(path.sep).join('/');
    const fileName = path.posix.basename(relPath);
    if (RESERVED_FILENAMES.has(fileName)) continue;

    const raw = readConceptText(relPath);
    const { frontmatter: fm, body } = parseFrontmatter(raw);
    const flag = fm.lilith_safe;
    if (flag !== expectedSafe) {
      throw new Error(
        `${relPath}: lilith_safe=${JSON.stringify(flag)} contradicts tree ${tree}/ (expected ${expectedSafe}) — refusing to export`
      );
    }
    const conceptId = relPath.replace(/\.md$/, '');
    const meta = Object.entries(fm)
      .filter(([k]) => k !== 'lilith_safe')
      .map(([k, v]) => `${k}: ${typeof v === 'object' ? JSON.stringify(v) : v}`)
      .join(', ');

    parts.push('---', '', `## ${conceptId}`, '');
    if (meta) {
      parts.push(`*${meta}*`, '');
    }
    parts.push(body.trim(), '');
  }

  return parts.join('\n') + '\n';
}

function buildR2SyncPreview(concepts: ParsedConcept[], okfVersion: string) {
  const bucket = 'magi-system';
  const prefix = 'okf/system';
  const accountId = 'c3b51b9f35d16713caab757feca638d8';
  const endpoint = `https://${accountId}.r2.cloudflarestorage.com`;
  const namespace = 'okf';

  const customMetadataSchema = [
    { field_name: 'type', data_type: 'text' },
    { field_name: 'lilith_safe', data_type: 'boolean' },
    { field_name: 'version', data_type: 'number' },
    { field_name: 'status', data_type: 'text' },
    { field_name: 'tags', data_type: 'text' },
  ];

  const systemConcepts = concepts.filter((c) => c.tree === 'system');
  const items: R2SyncPreviewItem[] = systemConcepts.map((c) => {
    const relWithinTree = c.relPath.replace(/^system\//, '');
    const key = `${prefix}/${relWithinTree}`;
    const md5 = crypto.createHash('md5').update(c.rawText, 'utf8').digest('hex');

    const metadata: Record<string, string> = {};
    if (c.type) metadata.type = c.type;
    metadata.lilith_safe = c.lilithSafe ? 'true' : 'false';
    if (c.frontmatter.version !== undefined) {
      const num = parseFloat(String(c.frontmatter.version));
      metadata.version = Number.isNaN(num) ? String(c.frontmatter.version) : num.toFixed(1);
    }
    metadata.status = c.status;
    metadata.trust_tier = c.trustTier;
    if (c.latestVerifiedAt) metadata.verified_at = c.latestVerifiedAt;
    if (c.staleAfter) metadata.stale_after = c.staleAfter;
    if (c.unitStatus) metadata.unit_status = c.unitStatus;
    if (c.tags.length > 0) metadata.tags = c.tags.join(',');

    const s3Command = `aws s3 cp ${c.relPath} s3://${bucket}/${key} --endpoint-url ${endpoint} --content-type text/markdown --metadata '${JSON.stringify(metadata)}' --dryrun`;

    return {
      conceptId: c.conceptId,
      key,
      md5,
      s3Command,
      metadata,
      icebergRow: {
        concept_id: c.conceptId,
        tree: 'system',
        path: c.relPath,
        title: c.title,
        type: c.type,
        status: c.status,
        trust_tier: c.trustTier,
        verified_at: c.latestVerifiedAt,
        stale_after: c.staleAfter,
        unit_status: c.unitStatus,
        lilith_safe: Boolean(c.lilithSafe),
        tags: c.tags,
        bodyChars: c.body.length,
      },
    };
  });

  return {
    bucket,
    prefix,
    endpoint,
    accountId,
    namespace,
    customMetadataSchema,
    items,
  };
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '5mb' }));

  app.get('/api/bundle', (req, res) => {
    try {
      const failOnStale = req.query.failOnStale === 'true';
      const payload = loadAllData(failOnStale);
      res.json(payload);
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to load OKF bundle' });
    }
  });

  app.post('/api/lint-document', (req, res) => {
    try {
      const { relPath, rawText } = req.body as { relPath: string; rawText: string };
      if (!relPath || typeof rawText !== 'string') {
        res.status(400).json({ error: 'relPath and rawText are required' });
        return;
      }
      const diagnostics = lintSingleDocument(relPath, rawText, new Date());
      let parsedFrontmatter: Record<string, any> | null = null;
      let trustTier: TrustTier | null = null;
      let status: LifecycleStatus | null = null;
      try {
        const { frontmatter } = parseFrontmatter(rawText);
        parsedFrontmatter = frontmatter;
        trustTier = computeTrustTier(frontmatter);
        status = computeLifecycleStatus(frontmatter);
      } catch {
        // parse error included in diagnostics
      }
      res.json({
        passed: diagnostics.filter((d) => d.level === 'ERROR').length === 0,
        diagnostics,
        parsedFrontmatter,
        trustTier,
        status,
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/save-concept-override', (req, res) => {
    try {
      const { relPath, rawText } = req.body as { relPath: string; rawText: string };
      if (!relPath || typeof rawText !== 'string') {
        res.status(400).json({ error: 'relPath and rawText are required' });
        return;
      }
      const diagnostics = lintSingleDocument(relPath, rawText, new Date());
      const errors = diagnostics.filter((d) => d.level === 'ERROR');
      if (errors.length > 0) {
        res.status(400).json({
          error: 'Document failed OKF conformance or LILITH contamination boundary checks',
          diagnostics,
        });
        return;
      }
      inMemoryConceptOverrides.set(relPath, rawText);
      const payload = loadAllData(false);
      res.json({ ok: true, payload });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/reset-concept-override', (req, res) => {
    const { relPath } = req.body as { relPath?: string };
    if (relPath) {
      inMemoryConceptOverrides.delete(relPath);
    } else {
      inMemoryConceptOverrides.clear();
    }
    const payload = loadAllData(false);
    res.json({ ok: true, payload });
  });

  app.post('/api/safe-loader-probe', (req, res) => {
    try {
      const { conceptId, mode } = req.body as {
        conceptId: string;
        mode?: 'get' | 'verbatim_block';
      };
      const result = probeSafeLoader(conceptId || '', mode || 'get');
      res.json({ ok: true, result });
    } catch (err: any) {
      res.json({
        ok: false,
        errorType: err.message.startsWith('LilithContaminationError')
          ? 'LilithContaminationError'
          : err.message.startsWith('FileNotFoundError')
            ? 'FileNotFoundError'
            : 'ValueError',
        error: err.message,
      });
    }
  });

  app.get('/api/export-digest', (req, res) => {
    try {
      const tree = req.query.tree === '_lilith_safe' ? '_lilith_safe' : 'system';
      const digest = exportOkfDigest(tree);
      res.json({
        tree,
        charCount: digest.length,
        lineCount: digest.split('\n').length,
        digest,
      });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*all', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  const PORT = 3000;
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`MAGI Knowledge OKF Workbench listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();

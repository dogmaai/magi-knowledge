import React, { useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Play,
  ShieldAlert,
  ShieldCheck,
  Terminal,
} from 'lucide-react';
import type { BundlePayload, LintDiagnostic } from '../types/okf.ts';

interface LinterGatesViewProps {
  bundle: BundlePayload;
  failOnStale: boolean;
  onToggleFailOnStale: (val: boolean) => void;
  onNavigateConcept: (conceptId: string) => void;
}

const PRESET_SCENARIOS = [
  {
    id: 'clean-safe',
    label: 'Valid _lilith_safe/ Concept (Passes)',
    relPath: '_lilith_safe/schemas/example-block.md',
    rawText: `---
type: Prompt Block Schema
title: EXAMPLE_BLOCK
description: Valid clean-source schema block.
lilith_safe: true
status: stable
generated: { by: devin/cloud, at: 2026-09-01T00:00:00Z }
verified: { by: human:jun, at: 2026-09-02T00:00:00Z }
stale_after: 2027-03-01T00:00:00Z
tags: [lilith, schema]
---

# Schema
Decide strictly from LILITH's own ISABEL stats and raw market data blocks.
`,
  },
  {
    id: 'cross-unit-leak',
    label: 'Cross-Unit Name Leak in _lilith_safe/ (Fails)',
    relPath: '_lilith_safe/constitution/leak-test.md',
    rawText: `---
type: Constitution Rule
title: Contaminated Rule
lilith_safe: true
status: draft
generated: { by: devin/cloud, at: 2026-09-01T00:00:00Z }
---

# Violation
Following CASPER and MELCHIOR-1 momentum signals with a 68% win-rate on AAPL.
`,
  },
  {
    id: 'section5-ticker-pick',
    label: 'Section 5 & Ticker Pick Leak (Fails)',
    relPath: '_lilith_safe/schemas/pick-leak.md',
    rawText: `---
type: Prompt Block Schema
title: Pick Leak Test
lilith_safe: true
status: draft
generated: { by: devin/cloud, at: 2026-09-01T00:00:00Z }
---

# Section 5 (Jun Review Only)
Recommended trade: entry: $185.50, stop_loss: $176.20, target: $204.00.
`,
  },
  {
    id: 'unverified-stable',
    label: 'status: stable Without Human Verifier (Fails)',
    relPath: 'system/services/unverified-test.md',
    rawText: `---
type: Service
title: Unverified Stable Doc
lilith_safe: false
status: stable
generated: { by: devin/cloud, at: 2026-10-01T00:00:00Z }
verified: { by: devin/cloud, at: 2026-10-01T00:00:00Z }
stale_after: 2027-04-01T00:00:00Z
---

# Service
AI review alone only qualifies for draft; status: stable requires a human: verifier.
`,
  },
];

export const LinterGatesView: React.FC<LinterGatesViewProps> = ({
  bundle,
  failOnStale,
  onToggleFailOnStale,
  onNavigateConcept,
}) => {
  const { lintReport, detectorSync } = bundle;

  const [testRelPath, setTestRelPath] = useState(PRESET_SCENARIOS[1].relPath);
  const [testRawText, setTestRawText] = useState(PRESET_SCENARIOS[1].rawText);
  const [benchResult, setBenchResult] = useState<{
    passed: boolean;
    diagnostics: LintDiagnostic[];
    trustTier: string | null;
    status: string | null;
  } | null>(null);

  const runLiveTestBench = async (relPath = testRelPath, rawText = testRawText) => {
    const res = await fetch('/api/lint-document', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ relPath, rawText }),
    });
    const data = await res.json();
    setBenchResult(data);
  };

  React.useEffect(() => {
    runLiveTestBench(PRESET_SCENARIOS[1].relPath, PRESET_SCENARIOS[1].rawText);
  }, []);

  return (
    <div className="space-y-6">
      {/* Top KPI Summary Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-lg p-4">
          <div className="text-xs text-slate-500">OKF Conformance Gate (okf_lint.py)</div>
          <div className="mt-1.5 flex items-center gap-2">
            {lintReport.passed ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
            ) : (
              <ShieldAlert className="w-4 h-4 text-rose-700 shrink-0" />
            )}
            <span className="text-lg font-bold font-mono text-slate-900 tabular-nums">
              {lintReport.passed ? 'PASS (Exit 0)' : `FAIL (${lintReport.errorCount} Errors)`}
            </span>
          </div>
          <div className="mt-1 text-xs text-slate-500 font-mono tabular-nums">
            Scanned {lintReport.scannedCount} concept(s)
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg p-4">
          <div className="text-xs text-slate-500">Diagnostics Breakdown</div>
          <div className="mt-1.5 text-lg font-bold font-mono text-slate-900 tabular-nums">
            {lintReport.errorCount} ERR · {lintReport.warningCount} WARN · {lintReport.staleCount}{' '}
            STALE
          </div>
          <div className="mt-1 text-xs text-slate-500">
            13 draft docs awaiting human re-verification
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg p-4">
          <div className="text-xs text-slate-500">
            Unit Detector Sync (check_unit_detector_sync.py)
          </div>
          <div className="mt-1.5 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-700 shrink-0" />
            <span className="text-lg font-bold font-mono text-slate-900 tabular-nums">
              {detectorSync.ok ? 'SYNCED (Exit 0)' : 'DRIFT DETECTED'}
            </span>
          </div>
          <div className="mt-1 text-xs text-slate-500 font-mono tabular-nums">
            {detectorSync.registryStems.length} registry stems · {detectorSync.detectorNames.length}{' '}
            detector names
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg p-4 flex flex-col justify-between">
          <div className="text-xs text-slate-500">Freshness Enforcement Mode</div>
          <div className="mt-2 flex items-center justify-between gap-2">
            <span className="text-xs font-mono text-slate-800">
              {failOnStale ? '--fail-on-stale (Weekly CI)' : 'Standard PR Gate (Warn Stale)'}
            </span>
            <button
              type="button"
              onClick={() => onToggleFailOnStale(!failOnStale)}
              className={`px-3 py-1 text-xs font-medium rounded border transition-colors whitespace-nowrap shrink-0 ${
                failOnStale
                  ? 'bg-slate-900 text-white border-slate-900'
                  : 'bg-slate-50 text-slate-800 border-slate-300 hover:bg-slate-100'
              }`}
            >
              {failOnStale ? 'Disable --fail-on-stale' : 'Enable --fail-on-stale'}
            </button>
          </div>
        </div>
      </div>

      {/* Live Linter Diagnostics Table */}
      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        <div className="px-5 py-3.5 border-b border-slate-200 flex items-center justify-between bg-slate-50/60">
          <div className="flex items-center gap-2">
            <Terminal className="w-4 h-4 text-slate-600" />
            <h2 className="text-sm font-semibold text-slate-900">
              Repository Conformance & Trust Lifecycle Output ({lintReport.diagnostics.length})
            </h2>
          </div>
          <span className="text-xs font-mono text-slate-500 tabular-nums">
            python scripts/okf_lint.py {failOnStale ? '--fail-on-stale' : ''}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                <th className="py-2.5 px-4 w-24">Level</th>
                <th className="py-2.5 px-4 w-44">Rule Category</th>
                <th className="py-2.5 px-4 w-64">Concept Document</th>
                <th className="py-2.5 px-4">Diagnostic Detail</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {lintReport.diagnostics.map((d, idx) => (
                <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-2.5 px-4 font-mono font-semibold">
                    <span
                      className={
                        d.level === 'ERROR'
                          ? 'text-rose-700'
                          : d.level === 'STALE'
                            ? 'text-amber-800'
                            : 'text-amber-700'
                      }
                    >
                      {d.level}
                    </span>
                  </td>
                  <td className="py-2.5 px-4 font-mono text-slate-600">{d.category}</td>
                  <td className="py-2.5 px-4 font-mono">
                    <button
                      type="button"
                      onClick={() => onNavigateConcept(d.conceptId)}
                      className="text-slate-900 underline decoration-slate-300 hover:decoration-slate-900 font-medium text-left"
                    >
                      {d.relPath}
                    </button>
                  </td>
                  <td className="py-2.5 px-4 font-mono text-slate-700">{d.message}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Unit Detector Synchronization Panel + Interactive Contamination Test Bench */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: Unit Detector Sync (5 cols) */}
        <div className="lg:col-span-5 bg-white border border-slate-200 rounded-lg p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-200 pb-3">
            <div>
              <h3 className="text-sm font-semibold text-slate-900">
                PLM Unit Roster ↔ Cross-Unit Detector Sync
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Verifies <code className="font-mono">system/plm-units/index.md</code> stems against{' '}
                <code className="font-mono">cross-unit.md</code> and <code className="font-mono">okf_lint.py</code>.
              </p>
            </div>
            <span className="text-xs font-mono font-semibold text-emerald-700">
              {detectorSync.ok ? 'OK' : 'FAIL'}
            </span>
          </div>

          <div className="space-y-3 text-xs">
            <div>
              <div className="font-medium text-slate-700 mb-1">
                Registry Stems ({detectorSync.registryStems.length}) — excluding self-name{' '}
                <code className="font-mono">lilith</code>
              </div>
              <div className="p-2.5 rounded bg-slate-50 border border-slate-200 font-mono text-slate-800 leading-relaxed">
                {detectorSync.registryStems.join(', ')}
              </div>
            </div>

            <div>
              <div className="font-medium text-slate-700 mb-1">
                Detector Frontmatter <code className="font-mono">unit_names</code> (
                {detectorSync.detectorNames.length})
              </div>
              <div className="p-2.5 rounded bg-slate-50 border border-slate-200 font-mono text-slate-800 leading-relaxed">
                {detectorSync.detectorNames.join(', ')}
              </div>
            </div>

            <div>
              <div className="font-medium text-slate-700 mb-1">
                Retained Legacy / Detector-Only Stems (Allowed)
              </div>
              <div className="p-2.5 rounded bg-slate-50 border border-slate-200 font-mono text-slate-600">
                seraph, balthasar, {detectorSync.detectorOnlyNames.join(', ')} (retired offline
                analyzers kept in detector so historical references still flag)
              </div>
            </div>
          </div>
        </div>

        {/* Right: Interactive LILITH Contamination & OKF Rule Test Bench (7 cols) */}
        <div className="lg:col-span-7 bg-white border border-slate-200 rounded-lg p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-3">
            <div>
              <h3 className="text-sm font-semibold text-slate-900">
                Interactive Contamination & Conformance Test Bench
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Simulate PR changes to test <code className="font-mono">SECTION5_RE</code>,{' '}
                <code className="font-mono">TICKER_PICK_RE</code>,{' '}
                <code className="font-mono">CROSS_UNIT_RE</code>,{' '}
                <code className="font-mono">UNIT_WINRATE_RE</code>, and §5/§7 trust rules.
              </p>
            </div>
            <button
              type="button"
              onClick={() => runLiveTestBench(testRelPath, testRawText)}
              className="px-3 py-1.5 text-xs font-medium bg-slate-900 text-white rounded-md hover:bg-slate-800 transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0"
            >
              <Play className="w-3.5 h-3.5" />
              <span>Run Linter Check</span>
            </button>
          </div>

          {/* Preset Scenario Selector Buttons */}
          <div className="flex flex-wrap gap-1.5">
            {PRESET_SCENARIOS.map((sc) => (
              <button
                key={sc.id}
                type="button"
                onClick={() => {
                  setTestRelPath(sc.relPath);
                  setTestRawText(sc.rawText);
                  runLiveTestBench(sc.relPath, sc.rawText);
                }}
                className={`px-2.5 py-1 text-xs font-medium rounded border transition-colors whitespace-nowrap shrink-0 ${
                  testRelPath === sc.relPath
                    ? 'bg-slate-900 text-white border-slate-900'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                {sc.label}
              </button>
            ))}
          </div>

          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Simulated Target Path (determines <code className="font-mono">_lilith_safe/</code> vs{' '}
                <code className="font-mono">system/</code> boundary rules)
              </label>
              <input
                type="text"
                value={testRelPath}
                onChange={(e) => {
                  setTestRelPath(e.target.value);
                  runLiveTestBench(e.target.value, testRawText);
                }}
                className="w-full px-3 py-1.5 text-xs font-mono bg-slate-50 border border-slate-200 rounded-md text-slate-900 focus:outline-none focus:border-slate-900"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Document Frontmatter & Markdown Payload
              </label>
              <textarea
                value={testRawText}
                onChange={(e) => {
                  setTestRawText(e.target.value);
                  runLiveTestBench(testRelPath, e.target.value);
                }}
                rows={10}
                className="w-full p-3 font-mono text-xs bg-slate-900 text-slate-100 rounded-md border border-slate-700 focus:outline-none focus:border-slate-400 leading-relaxed"
              />
            </div>

            {benchResult && (
              <div
                className={`p-3.5 rounded-md border text-xs space-y-1.5 ${
                  benchResult.passed
                    ? 'bg-emerald-50/90 border-emerald-200 text-emerald-900'
                    : 'bg-rose-50/90 border-rose-200 text-rose-900'
                }`}
              >
                <div className="flex items-center justify-between font-semibold">
                  <div className="flex items-center gap-1.5">
                    {benchResult.passed ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 text-rose-700 shrink-0" />
                    )}
                    <span>
                      {benchResult.passed
                        ? 'PASS — Zero Conformance or Contamination Violations'
                        : `BLOCKED — ${
                            benchResult.diagnostics.filter((d) => d.level === 'ERROR').length
                          } Violation(s) Detected`}
                    </span>
                  </div>
                  {benchResult.status && (
                    <span className="font-mono text-[11px]">
                      status: {benchResult.status} · trust_tier: {benchResult.trustTier}
                    </span>
                  )}
                </div>

                {benchResult.diagnostics.length > 0 && (
                  <div className="pt-1 space-y-1 font-mono text-[11px]">
                    {benchResult.diagnostics.map((d, i) => (
                      <div key={i}>
                        [{d.level}] ({d.category}) {d.message}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

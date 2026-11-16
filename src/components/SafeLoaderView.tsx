import React, { useState } from 'react';
import {
  CheckCircle2,
  Lock,
  Play,
  ShieldAlert,
  ShieldCheck,
  Sliders,
} from 'lucide-react';
import type { BundlePayload } from '../types/okf.ts';

interface SafeLoaderViewProps {
  bundle: BundlePayload;
  onNavigateConcept: (conceptId: string) => void;
}

export const SafeLoaderView: React.FC<SafeLoaderViewProps> = ({
  bundle,
  onNavigateConcept,
}) => {
  const { safeLoader } = bundle;
  const priors = safeLoader.distributionPriors;

  const [probeConceptId, setProbeConceptId] = useState('schemas/isabel-stats-block');
  const [probeMode, setProbeMode] = useState<'get' | 'verbatim_block'>('get');
  const [probeOutput, setProbeOutput] = useState<any>(null);
  const [showInterpolatedRules, setShowInterpolatedRules] = useState(false);

  // Interactive Coverage-Floor Simulator state (mirrors fit_distributions.py _apply_floor)
  const [calmFloor, setCalmFloor] = useState(0.03);
  const [normalFloor, setNormalFloor] = useState(0.04);
  const [extremeFearFloor, setExtremeFearFloor] = useState(0.07);
  const [panicFloor, setPanicFloor] = useState(0.03);

  const runProbe = async (cid = probeConceptId, mode = probeMode) => {
    const res = await fetch('/api/safe-loader-probe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ conceptId: cid, mode }),
    });
    const data = await res.json();
    setProbeOutput(data);
  };

  React.useEffect(() => {
    runProbe('schemas/isabel-stats-block', 'get');
  }, []);

  // Compute simulated VIX regime applied weights using fit_distributions.py _apply_floor formula
  const empiricalVix: Record<string, number> = priors?.macro?.vix_regime_weights?.empirical || {
    CALM: 0.0,
    LOW_FEAR: 0.3649,
    NORMAL: 0.0217,
    HIGH_FEAR: 0.5858,
    EXTREME_FEAR: 0.0276,
    PANIC: 0.0,
  };

  const simulatedVixApplied = React.useMemo(() => {
    const floors: Record<string, number> = {
      CALM: calmFloor,
      NORMAL: normalFloor,
      EXTREME_FEAR: extremeFearFloor,
      PANIC: panicFloor,
    };
    const floorSum = Object.values(floors).reduce((a, b) => a + b, 0);
    const remaining = Math.max(0, 1.0 - floorSum);
    const freeTotal = (empiricalVix.HIGH_FEAR || 0) + (empiricalVix.LOW_FEAR || 0) || 1;
    const highFear = Number(((remaining * (empiricalVix.HIGH_FEAR || 0)) / freeTotal).toFixed(4));
    const lowFear = Number(((remaining * (empiricalVix.LOW_FEAR || 0)) / freeTotal).toFixed(4));
    const currentSum = floorSum + highFear + lowFear;
    const drift = Number((1.0 - currentSum).toFixed(4));
    return {
      CALM: floors.CALM,
      LOW_FEAR: lowFear,
      NORMAL: floors.NORMAL,
      HIGH_FEAR: Number((highFear + drift).toFixed(4)),
      EXTREME_FEAR: floors.EXTREME_FEAR,
      PANIC: floors.PANIC,
    };
  }, [calmFloor, normalFloor, extremeFearFloor, panicFloor, empiricalVix]);

  return (
    <div className="space-y-6">
      {/* Smoke & Boundary Test Suite (test_lilith_safe_loader.py) */}
      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200 bg-slate-50/60 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-700" />
              <h2 className="text-sm font-semibold text-slate-900">
                LILITH-Safe Loader Boundary & Smoke Suite (test_lilith_safe_loader.py)
              </h2>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Enforces that <code className="font-mono">LilithSafeKnowledge</code> reads exclusively
              from <code className="font-mono">_lilith_safe/</code> and fails loud on traversal or
              unflagged docs.
            </p>
          </div>
          <span className="text-xs font-mono font-semibold text-emerald-800 tabular-nums">
            {safeLoader.tests.filter((t) => t.passed).length} / {safeLoader.tests.length} PASSED (
            {safeLoader.safeConceptCount} safe concepts)
          </span>
        </div>

        <div className="divide-y divide-slate-200">
          {safeLoader.tests.map((test) => (
            <div
              key={test.id}
              className="px-5 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 hover:bg-slate-50/60"
            >
              <div className="space-y-0.5">
                <div className="flex items-center gap-2 text-xs font-semibold text-slate-900">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                  <span>{test.name}</span>
                </div>
                <p className="text-xs text-slate-500 pl-5">{test.description}</p>
              </div>
              <div className="text-xs font-mono text-slate-700 sm:text-right pl-5 sm:pl-0 max-w-md truncate">
                {test.detail}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Interactive Path Traversal Probe + Verbatim Output Rules Block */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: Interactive LilithSafeKnowledge Probe (6 cols) */}
        <div className="lg:col-span-6 bg-white border border-slate-200 rounded-lg p-5 space-y-4">
          <div className="border-b border-slate-200 pb-3">
            <h3 className="text-sm font-semibold text-slate-900">
              Interactive <code className="font-mono">LilithSafeKnowledge</code> Boundary Probe
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Test valid <code className="font-mono">_lilith_safe/</code> lookups or attempt
              cross-tree path traversal into <code className="font-mono">system/</code>.
            </p>
          </div>

          {/* Quick Preset Probes */}
          <div className="flex flex-wrap gap-1.5">
            {[
              { label: 'schemas/isabel-stats-block', cid: 'schemas/isabel-stats-block', mode: 'get' as const },
              { label: 'constitution/output-rules (verbatim)', cid: 'constitution/output-rules', mode: 'verbatim_block' as const },
              { label: 'Attack: ../system/plm-units/sophia-5', cid: '../system/plm-units/sophia-5', mode: 'get' as const },
              { label: 'Attack: ../../etc/passwd', cid: '../../etc/passwd', mode: 'get' as const },
              { label: 'No Fence: constitution/clean-source-rule', cid: 'constitution/clean-source-rule', mode: 'verbatim_block' as const },
            ].map((item) => (
              <button
                key={item.label}
                type="button"
                onClick={() => {
                  setProbeConceptId(item.cid);
                  setProbeMode(item.mode);
                  runProbe(item.cid, item.mode);
                }}
                className={`px-2.5 py-1 text-xs font-medium rounded border transition-colors whitespace-nowrap shrink-0 ${
                  probeConceptId === item.cid && probeMode === item.mode
                    ? 'bg-slate-900 text-white border-slate-900'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>

          <div className="flex flex-col sm:flex-row gap-2">
            <input
              type="text"
              value={probeConceptId}
              onChange={(e) => setProbeConceptId(e.target.value)}
              placeholder="e.g. schemas/isabel-stats-block or ../system/guards/l0"
              className="flex-1 px-3 py-1.5 text-xs font-mono bg-slate-50 border border-slate-200 rounded-md text-slate-900 focus:outline-none focus:border-slate-900"
            />
            <select
              value={probeMode}
              onChange={(e) => setProbeMode(e.target.value as 'get' | 'verbatim_block')}
              aria-label="Loader method"
              className="px-2.5 py-1.5 text-xs font-mono bg-slate-50 border border-slate-200 rounded-md text-slate-800"
            >
              <option value="get">kb.get(concept_id)</option>
              <option value="verbatim_block">kb.verbatim_block(concept_id)</option>
            </select>
            <button
              type="button"
              onClick={() => runProbe(probeConceptId, probeMode)}
              className="px-3.5 py-1.5 text-xs font-medium bg-slate-900 text-white rounded-md hover:bg-slate-800 transition-colors flex items-center gap-1 whitespace-nowrap shrink-0"
            >
              <Play className="w-3.5 h-3.5" />
              <span>Execute</span>
            </button>
          </div>

          {probeOutput && (
            <div
              className={`rounded-lg border p-4 text-xs font-mono space-y-2 ${
                probeOutput.ok
                  ? 'bg-slate-900 text-slate-100 border-slate-800'
                  : 'bg-rose-950 text-rose-100 border-rose-800'
              }`}
            >
              <div className="flex items-center justify-between border-b border-white/10 pb-2">
                <span className="font-semibold flex items-center gap-1.5">
                  {probeOutput.ok ? (
                    <>
                      <ShieldCheck className="w-4 h-4 text-emerald-400" />
                      <span>RETURNED SAFE CONCEPT ({probeOutput.result.conceptId})</span>
                    </>
                  ) : (
                    <>
                      <Lock className="w-4 h-4 text-rose-400" />
                      <span>RAISED {probeOutput.errorType} (FAIL-LOUD GUARD)</span>
                    </>
                  )}
                </span>
              </div>
              <pre className="overflow-x-auto leading-relaxed max-h-64 text-[11px]">
                <code>
                  {probeOutput.ok
                    ? JSON.stringify(probeOutput.result, null, 2)
                    : probeOutput.error}
                </code>
              </pre>
            </div>
          )}
        </div>

        {/* Right: Verbatim COMMON_OUTPUT_RULES Inspector (6 cols) */}
        <div className="lg:col-span-6 bg-white border border-slate-200 rounded-lg p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-3">
            <div>
              <h3 className="text-sm font-semibold text-slate-900">
                Canonical Verbatim Prompt Tail (<code className="font-mono">output-rules.md</code>)
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Byte-for-byte <code className="font-mono">COMMON_OUTPUT_RULES</code> block with
                runtime <code className="font-mono">{'{cross_unit_names}'}</code> interpolation.
              </p>
            </div>
            <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-md shrink-0">
              <button
                type="button"
                onClick={() => setShowInterpolatedRules(false)}
                className={`px-2.5 py-1 text-xs font-medium rounded transition-colors whitespace-nowrap shrink-0 ${
                  !showInterpolatedRules
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Raw Placeholder
              </button>
              <button
                type="button"
                onClick={() => setShowInterpolatedRules(true)}
                className={`px-2.5 py-1 text-xs font-medium rounded transition-colors whitespace-nowrap shrink-0 ${
                  showInterpolatedRules
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Interpolated Detector
              </button>
            </div>
          </div>

          <div className="rounded-lg border border-slate-200 bg-slate-900 text-slate-100 overflow-hidden">
            <div className="px-3.5 py-2 bg-slate-800 border-b border-slate-700 text-xs font-mono text-slate-400 flex items-center justify-between">
              <span>
                {showInterpolatedRules
                  ? 'common_output_rules() -> {cross_unit_names} filled from detector'
                  : 'kb.verbatim_block("constitution/output-rules")'}
              </span>
              <button
                type="button"
                onClick={() => onNavigateConcept('_lilith_safe/constitution/output-rules')}
                className="text-slate-300 hover:text-white underline"
              >
                Open Concept
              </button>
            </div>
            <pre className="p-4 text-xs font-mono leading-relaxed overflow-x-auto max-h-72">
              <code>
                {showInterpolatedRules
                  ? safeLoader.interpolatedOutputRules
                  : safeLoader.verbatimOutputRules}
              </code>
            </pre>
          </div>
        </div>
      </div>

      {/* ECHIDNA Fitted Input Priors & Coverage-Floor Simulator (echidna-priors.md + fit_distributions.py) */}
      {priors && (
        <div className="bg-white border border-slate-200 rounded-lg p-6 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-4">
            <div>
              <h2 className="text-base font-semibold text-slate-900">
                ECHIDNA Fitted Input Priors & Coverage-Floor Grounding (echidna-priors.md)
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Aggregate ground-truth distributions fitted from{' '}
                <code className="font-mono">
                  {priors.fit.source_project}.{priors.fit.source_dataset}
                </code>{' '}
                (fit date <span className="font-mono">{priors.fit.date}</span> ·{' '}
                <span className="font-mono tabular-nums">
                  {priors.fit.snapshots_with_regime}
                </span>{' '}
                regime snapshots ·{' '}
                <span className="font-mono tabular-nums">
                  {priors.fit.lilith_decided_trades}
                </span>{' '}
                LILITH-own decided trades).
              </p>
            </div>
            <button
              type="button"
              onClick={() => onNavigateConcept('_lilith_safe/distributions/echidna-priors')}
              className="px-3 py-1.5 text-xs font-medium border border-slate-300 rounded-md text-slate-800 hover:bg-slate-50 transition-colors whitespace-nowrap shrink-0"
            >
              Inspect echidna-priors.md
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* VIX Regime Weights Table & Interactive Coverage Floor Calculator (7 cols) */}
            <div className="lg:col-span-7 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-semibold text-slate-900">
                  1. VIX Regime Weights (Empirical vs SFT Coverage-Floor Applied)
                </h3>
                <span className="text-xs font-mono text-slate-500 tabular-nums">
                  Sum ={' '}
                  {Object.values(simulatedVixApplied)
                    .reduce((a, b) => a + b, 0)
                    .toFixed(4)}
                </span>
              </div>

              <div className="overflow-x-auto border border-slate-200 rounded-lg">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-700 font-semibold">
                      <th className="py-2 px-3">VIX Regime</th>
                      <th className="py-2 px-3 text-right">Empirical</th>
                      <th className="py-2 px-3 text-right">Canonical Applied</th>
                      <th className="py-2 px-3 text-right">Simulated Applied</th>
                      <th className="py-2 px-3 text-right">VIX Level Band [p10, p90]</th>
                      <th className="py-2 px-3">Source</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 font-mono tabular-nums">
                    {(['CALM', 'LOW_FEAR', 'NORMAL', 'HIGH_FEAR', 'EXTREME_FEAR', 'PANIC'] as const).map(
                      (regime) => {
                        const emp = priors.macro.vix_regime_weights.empirical[regime] ?? 0;
                        const app = priors.macro.vix_regime_weights.applied[regime] ?? 0;
                        const sim = simulatedVixApplied[regime] ?? 0;
                        const band = priors.macro.vix_level_band[regime];
                        return (
                          <tr key={regime} className="hover:bg-slate-50/80">
                            <td className="py-2 px-3 font-semibold text-slate-900">{regime}</td>
                            <td className="py-2 px-3 text-right text-slate-600">
                              {(emp * 100).toFixed(2)}%
                            </td>
                            <td className="py-2 px-3 text-right text-slate-900 font-medium">
                              {(app * 100).toFixed(2)}%
                            </td>
                            <td className="py-2 px-3 text-right text-emerald-800 font-semibold">
                              {(sim * 100).toFixed(2)}%
                            </td>
                            <td className="py-2 px-3 text-right text-slate-700">
                              {band ? `[${band.lo.toFixed(1)}, ${band.hi.toFixed(1)}]` : '—'}
                            </td>
                            <td className="py-2 px-3 text-slate-500">
                              {band?.source || 'synthetic'}
                            </td>
                          </tr>
                        );
                      }
                    )}
                  </tbody>
                </table>
              </div>

              {/* Coverage Floor Sliders (fit_distributions.py _apply_floor) */}
              <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-800">
                    <Sliders className="w-3.5 h-3.5 text-slate-600" />
                    <span>Coverage-Floor Rescaling Simulator (_apply_floor in fit_distributions.py)</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setCalmFloor(0.03);
                      setNormalFloor(0.04);
                      setExtremeFearFloor(0.07);
                      setPanicFloor(0.03);
                    }}
                    className="text-xs font-mono text-slate-600 hover:text-slate-900 underline"
                  >
                    Reset Floors
                  </button>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div>
                    <label className="block font-mono text-slate-600 mb-1">
                      CALM: {(calmFloor * 100).toFixed(0)}%
                    </label>
                    <input
                      type="range"
                      min="0.01"
                      max="0.15"
                      step="0.01"
                      value={calmFloor}
                      onChange={(e) => setCalmFloor(parseFloat(e.target.value))}
                      className="w-full accent-slate-900"
                    />
                  </div>
                  <div>
                    <label className="block font-mono text-slate-600 mb-1">
                      NORMAL: {(normalFloor * 100).toFixed(0)}%
                    </label>
                    <input
                      type="range"
                      min="0.01"
                      max="0.15"
                      step="0.01"
                      value={normalFloor}
                      onChange={(e) => setNormalFloor(parseFloat(e.target.value))}
                      className="w-full accent-slate-900"
                    />
                  </div>
                  <div>
                    <label className="block font-mono text-slate-600 mb-1">
                      EXTREME_FEAR: {(extremeFearFloor * 100).toFixed(0)}%
                    </label>
                    <input
                      type="range"
                      min="0.02"
                      max="0.20"
                      step="0.01"
                      value={extremeFearFloor}
                      onChange={(e) => setExtremeFearFloor(parseFloat(e.target.value))}
                      className="w-full accent-slate-900"
                    />
                  </div>
                  <div>
                    <label className="block font-mono text-slate-600 mb-1">
                      PANIC: {(panicFloor * 100).toFixed(0)}%
                    </label>
                    <input
                      type="range"
                      min="0.01"
                      max="0.15"
                      step="0.01"
                      value={panicFloor}
                      onChange={(e) => setPanicFloor(parseFloat(e.target.value))}
                      className="w-full accent-slate-900"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Right: ISABEL LILITH-Own n-Bucket Weights & Quantiles (5 cols) */}
            <div className="lg:col-span-5 space-y-4">
              <h3 className="text-xs font-semibold text-slate-900">
                2. LILITH-Own ISABEL Data-Sufficiency <code className="font-mono">n</code> Buckets
              </h3>
              <div className="overflow-x-auto border border-slate-200 rounded-lg">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-700 font-semibold">
                      <th className="py-2 px-3">n Bucket</th>
                      <th className="py-2 px-3">Range</th>
                      <th className="py-2 px-3 text-right">Empirical</th>
                      <th className="py-2 px-3 text-right">Applied</th>
                      <th className="py-2 px-3">Policy Rule</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 font-mono tabular-nums">
                    {(['0', '1-4', '5-9', '10+'] as const).map((b) => {
                      const emp = priors.isabel_lilith.n_bucket_weights.empirical[b] ?? 0;
                      const app = priors.isabel_lilith.n_bucket_weights.applied[b] ?? 0;
                      const range = priors.isabel_lilith.n_bucket_ranges[b];
                      return (
                        <tr key={b} className="hover:bg-slate-50/80">
                          <td className="py-2 px-3 font-semibold text-slate-900">n = {b}</td>
                          <td className="py-2 px-3 text-slate-600">
                            [{range[0]}, {range[1]}]
                          </td>
                          <td className="py-2 px-3 text-right text-slate-600">
                            {(emp * 100).toFixed(2)}%
                          </td>
                          <td className="py-2 px-3 text-right font-semibold text-slate-900">
                            {(app * 100).toFixed(2)}%
                          </td>
                          <td className="py-2 px-3 font-sans text-slate-600">
                            {b === '0' || b === '1-4'
                              ? 'Must NOT cite win-rate -> HOLD'
                              : 'Cite win-rate faithfully'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <h3 className="text-xs font-semibold text-slate-900 pt-1">
                3. Portfolio Cash % & ATR % of Price Quantiles (ECHIDNA Fitted)
              </h3>
              <div className="overflow-x-auto border border-slate-200 rounded-lg">
                <table className="w-full text-left border-collapse text-xs font-mono tabular-nums">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-700 font-sans font-semibold">
                      <th className="py-2 px-3">Metric</th>
                      <th className="py-2 px-3 text-right">p10</th>
                      <th className="py-2 px-3 text-right">p25</th>
                      <th className="py-2 px-3 text-right">p50</th>
                      <th className="py-2 px-3 text-right">p75</th>
                      <th className="py-2 px-3 text-right">p90</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    <tr>
                      <td className="py-2 px-3 font-sans font-medium text-slate-900">
                        Cash % Equity
                      </td>
                      <td className="py-2 px-3 text-right">{priors.macro.cash_pct_quantiles.p10}%</td>
                      <td className="py-2 px-3 text-right">{priors.macro.cash_pct_quantiles.p25}%</td>
                      <td className="py-2 px-3 text-right font-semibold">
                        {priors.macro.cash_pct_quantiles.p50}%
                      </td>
                      <td className="py-2 px-3 text-right">{priors.macro.cash_pct_quantiles.p75}%</td>
                      <td className="py-2 px-3 text-right">{priors.macro.cash_pct_quantiles.p90}%</td>
                    </tr>
                    <tr>
                      <td className="py-2 px-3 font-sans font-medium text-slate-900">
                        ATR % of Price
                      </td>
                      <td className="py-2 px-3 text-right">
                        {priors.technicals.atr_pct_of_price_quantiles.p10}%
                      </td>
                      <td className="py-2 px-3 text-right">
                        {priors.technicals.atr_pct_of_price_quantiles.p25}%
                      </td>
                      <td className="py-2 px-3 text-right font-semibold">
                        {priors.technicals.atr_pct_of_price_quantiles.p50}%
                      </td>
                      <td className="py-2 px-3 text-right">
                        {priors.technicals.atr_pct_of_price_quantiles.p75}%
                      </td>
                      <td className="py-2 px-3 text-right">
                        {priors.technicals.atr_pct_of_price_quantiles.p90}%
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

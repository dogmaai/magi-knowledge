import React, { useMemo, useState } from 'react';
import { Cpu, Database, Layers, Server, Shield } from 'lucide-react';
import type { BundlePayload } from '../types/okf.ts';

interface SystemMatrixViewProps {
  bundle: BundlePayload;
  onNavigateConcept: (conceptId: string) => void;
}

export const SystemMatrixView: React.FC<SystemMatrixViewProps> = ({
  bundle,
  onNavigateConcept,
}) => {
  const [activeSection, setActiveSection] = useState<
    'plm-units' | 'guards' | 'echidna-tables' | 'services' | 'constitution'
  >('plm-units');

  const plmUnits = useMemo(
    () => bundle.concepts.filter((c) => c.subtree === 'plm-units'),
    [bundle.concepts]
  );
  const guards = useMemo(
    () => bundle.concepts.filter((c) => c.subtree === 'guards'),
    [bundle.concepts]
  );
  const echidnaTables = useMemo(
    () => bundle.concepts.filter((c) => c.subtree === 'echidna-tables'),
    [bundle.concepts]
  );
  const services = useMemo(
    () => bundle.concepts.filter((c) => c.subtree === 'services'),
    [bundle.concepts]
  );
  const constitutionDocs = useMemo(
    () => bundle.concepts.filter((c) => c.subtree === 'constitution'),
    [bundle.concepts]
  );

  return (
    <div className="space-y-6">
      {/* Sub-navigation Tabs */}
      <div className="bg-white border border-slate-200 rounded-lg p-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-1 p-1 bg-slate-100 rounded-md">
          {[
            { id: 'plm-units', label: `PLM Units Roster (${plmUnits.length})`, icon: Cpu },
            { id: 'guards', label: `L0–L7 Guard Pipeline (${guards.length})`, icon: Shield },
            {
              id: 'echidna-tables',
              label: `ECHIDNA BigQuery Catalog (${echidnaTables.length})`,
              icon: Database,
            },
            { id: 'services', label: `Service Dependency Map (${services.length})`, icon: Server },
            {
              id: 'constitution',
              label: `Constitution Rules (${constitutionDocs.length})`,
              icon: Layers,
            },
          ].map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveSection(tab.id as any)}
                className={`px-3 py-1.5 text-xs font-medium rounded transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0 ${
                  activeSection === tab.id
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        <div className="text-xs font-mono text-slate-500">
          GCP Project: <span className="text-slate-800">screen-share-459802</span> · Dataset:{' '}
          <span className="text-slate-800">magi_core (US)</span>
        </div>
      </div>

      {/* Section 1: PLM Units Roster */}
      {activeSection === 'plm-units' && (
        <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-200 bg-slate-50/60">
            <h2 className="text-sm font-semibold text-slate-900">
              MAGI PLM Units Registry (system/plm-units/) — Cross-Unit Restricted (lilith_safe:
              false)
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Domain-specific runtime status is recorded in <code className="font-mono">unit_status</code>{' '}
              while OKF document lifecycle is tracked in <code className="font-mono">status</code>.
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-700 font-semibold">
                  <th className="py-2.5 px-4">Unit Concept</th>
                  <th className="py-2.5 px-4">Unit Status</th>
                  <th className="py-2.5 px-4">Provider / Model</th>
                  <th className="py-2.5 px-4">Cloud Run Job</th>
                  <th className="py-2.5 px-4 text-right">Budget Weight</th>
                  <th className="py-2.5 px-4">OKF Trust</th>
                  <th className="py-2.5 px-4">Description</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {plmUnits.map((u) => {
                  const fm = u.frontmatter;
                  return (
                    <tr key={u.conceptId} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-2.5 px-4 font-mono font-semibold">
                        <button
                          type="button"
                          onClick={() => onNavigateConcept(u.conceptId)}
                          className="text-slate-900 underline decoration-slate-300 hover:decoration-slate-900 text-left"
                        >
                          {u.title}
                        </button>
                      </td>
                      <td className="py-2.5 px-4 font-mono">
                        <span
                          className={
                            u.unitStatus === 'active'
                              ? 'text-emerald-700 font-semibold'
                              : u.unitStatus === 'shadow'
                                ? 'text-amber-700 font-semibold'
                                : 'text-slate-500'
                          }
                        >
                          {u.unitStatus || u.status}
                        </span>
                      </td>
                      <td className="py-2.5 px-4 font-mono text-slate-700">
                        {fm.provider || '—'} / {fm.model || '—'}
                      </td>
                      <td className="py-2.5 px-4 font-mono text-slate-600">
                        {fm.cloud_run_job || '—'}
                      </td>
                      <td className="py-2.5 px-4 font-mono text-right tabular-nums text-slate-800">
                        {fm.budget_weight_normal !== undefined
                          ? String(fm.budget_weight_normal)
                          : '—'}
                      </td>
                      <td className="py-2.5 px-4 font-mono text-slate-600">
                        {u.status} · {u.trustTier}
                      </td>
                      <td className="py-2.5 px-4 text-slate-600 max-w-xs truncate">
                        {u.description}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Section 2: L0-L7 Guard Pipeline */}
      {activeSection === 'guards' && (
        <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-200 bg-slate-50/60">
            <h2 className="text-sm font-semibold text-slate-900">
              Sequential Trade Guard Pipeline (system/guards/)
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Every trade tool-call passes through these layers in execution order. Classified into{' '}
              <code className="font-mono">risk-control</code>,{' '}
              <code className="font-mono">statistical-gate</code> (Optuna frozen), and{' '}
              <code className="font-mono">validator</code>.
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-700 font-semibold">
                  <th className="py-2.5 px-4">Guard Layer</th>
                  <th className="py-2.5 px-4">Concept ID</th>
                  <th className="py-2.5 px-4">Guard Class / Mode</th>
                  <th className="py-2.5 px-4">OKF Lifecycle & Verification</th>
                  <th className="py-2.5 px-4">Summary</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {guards.map((g) => (
                  <tr key={g.conceptId} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-2.5 px-4 font-semibold text-slate-900">
                      <button
                        type="button"
                        onClick={() => onNavigateConcept(g.conceptId)}
                        className="text-slate-900 underline decoration-slate-300 hover:decoration-slate-900 text-left"
                      >
                        {g.title}
                      </button>
                    </td>
                    <td className="py-2.5 px-4 font-mono text-slate-600">{g.conceptId}</td>
                    <td className="py-2.5 px-4 font-mono text-slate-700">
                      {g.frontmatter.guard_class || g.frontmatter.layer || g.type}
                    </td>
                    <td className="py-2.5 px-4 font-mono text-slate-600">
                      {g.status} · {g.trustTier}
                    </td>
                    <td className="py-2.5 px-4 text-slate-600 max-w-md">{g.description}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Section 3: ECHIDNA BigQuery Catalog */}
      {activeSection === 'echidna-tables' && (
        <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-200 bg-slate-50/60">
            <h2 className="text-sm font-semibold text-slate-900">
              ECHIDNA BigQuery Data Warehouse Catalog (system/echidna-tables/)
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              41 catalogued tables and views in <code className="font-mono">magi_core</code>{' '}
              (Core trading, HERMES/ISABEL intelligence, Ops/Governance, and ARC×SIG L0/L1/L2
              distillation corpus).
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-700 font-semibold">
                  <th className="py-2.5 px-4">Table / View Concept</th>
                  <th className="py-2.5 px-4">Dataset / Resource</th>
                  <th className="py-2.5 px-4">Status & Trust Tier</th>
                  <th className="py-2.5 px-4">Description</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {echidnaTables.map((t) => (
                  <tr key={t.conceptId} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-2.5 px-4 font-mono font-semibold">
                      <button
                        type="button"
                        onClick={() => onNavigateConcept(t.conceptId)}
                        className="text-slate-900 underline decoration-slate-300 hover:decoration-slate-900 text-left"
                      >
                        {t.title}
                      </button>
                    </td>
                    <td className="py-2.5 px-4 font-mono text-slate-600">
                      {t.frontmatter.dataset || 'magi_core'}.{t.frontmatter.table_name || t.conceptId.split('/').pop()}
                    </td>
                    <td className="py-2.5 px-4 font-mono text-slate-600">
                      <span
                        className={
                          t.status === 'stable'
                            ? 'text-emerald-700 font-medium'
                            : t.status === 'deprecated'
                              ? 'text-rose-700'
                              : 'text-amber-700'
                        }
                      >
                        {t.status}
                      </span>{' '}
                      · {t.trustTier}
                    </td>
                    <td className="py-2.5 px-4 text-slate-600 max-w-lg">{t.description}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Section 4: Services */}
      {activeSection === 'services' && (
        <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-200 bg-slate-50/60">
            <h2 className="text-sm font-semibold text-slate-900">
              Cross-Repo Microservices & Infrastructure Ledger (system/services/)
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Service topology, TIALA host inventory, Cloudflare tunnels/mirrors, and the carved-out
              secrets inventory.
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-700 font-semibold">
                  <th className="py-2.5 px-4">Service Concept</th>
                  <th className="py-2.5 px-4">Concept ID</th>
                  <th className="py-2.5 px-4">Status & Trust Tier</th>
                  <th className="py-2.5 px-4">Role & Scope</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {services.map((s) => (
                  <tr key={s.conceptId} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-2.5 px-4 font-semibold">
                      <button
                        type="button"
                        onClick={() => onNavigateConcept(s.conceptId)}
                        className="text-slate-900 underline decoration-slate-300 hover:decoration-slate-900 text-left"
                      >
                        {s.title}
                      </button>
                    </td>
                    <td className="py-2.5 px-4 font-mono text-slate-600">{s.conceptId}</td>
                    <td className="py-2.5 px-4 font-mono text-slate-600">
                      {s.status} · {s.trustTier}
                    </td>
                    <td className="py-2.5 px-4 text-slate-600 max-w-lg">{s.description}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Section 5: Constitution Rules (Both system/ and _lilith_safe/) */}
      {activeSection === 'constitution' && (
        <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-200 bg-slate-50/60">
            <h2 className="text-sm font-semibold text-slate-900">
              MAGI v3.0 Runtime Constitution & Clean-Source Rules ({constitutionDocs.length})
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Side-by-side comparison of <code className="font-mono">_lilith_safe/constitution/</code>{' '}
              and <code className="font-mono">system/constitution/</code>.
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-700 font-semibold">
                  <th className="py-2.5 px-4">Rule Title</th>
                  <th className="py-2.5 px-4">Boundary Tree</th>
                  <th className="py-2.5 px-4">LILITH Safe</th>
                  <th className="py-2.5 px-4">Status & Trust</th>
                  <th className="py-2.5 px-4">Description</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {constitutionDocs.map((c) => (
                  <tr key={c.conceptId} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-2.5 px-4 font-semibold">
                      <button
                        type="button"
                        onClick={() => onNavigateConcept(c.conceptId)}
                        className="text-slate-900 underline decoration-slate-300 hover:decoration-slate-900 text-left"
                      >
                        {c.title}
                      </button>
                    </td>
                    <td className="py-2.5 px-4 font-mono text-slate-700">{c.tree}/</td>
                    <td className="py-2.5 px-4 font-mono">
                      <span
                        className={
                          c.lilithSafe
                            ? 'text-emerald-700 font-semibold'
                            : 'text-slate-600'
                        }
                      >
                        {String(c.lilithSafe)}
                      </span>
                    </td>
                    <td className="py-2.5 px-4 font-mono text-slate-600">
                      {c.status} · {c.trustTier}
                    </td>
                    <td className="py-2.5 px-4 text-slate-600 max-w-lg">{c.description}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

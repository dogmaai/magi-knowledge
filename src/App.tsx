import React, { useCallback, useEffect, useState } from 'react';
import { RefreshCw, ShieldCheck } from 'lucide-react';
import type { BundlePayload } from './types/okf.ts';
import { ConceptExplorerView } from './components/ConceptExplorerView.tsx';
import { LinterGatesView } from './components/LinterGatesView.tsx';
import { SafeLoaderView } from './components/SafeLoaderView.tsx';
import { SystemMatrixView } from './components/SystemMatrixView.tsx';
import { ExportSyncView } from './components/ExportSyncView.tsx';
import { MarkdownViewer } from './components/MarkdownViewer.tsx';

type NavTab = 'explorer' | 'linter' | 'safe-loader' | 'system-matrix' | 'export-sync';

export function App() {
  const [bundle, setBundle] = useState<BundlePayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<NavTab>('explorer');
  const [selectedConceptId, setSelectedConceptId] = useState<string>(
    '_lilith_safe/constitution/clean-source-rule'
  );
  const [failOnStale, setFailOnStale] = useState(false);
  const [activeReservedDocPath, setActiveReservedDocPath] = useState<string | null>(null);

  const fetchBundle = useCallback(async (staleFlag = failOnStale) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/bundle?failOnStale=${staleFlag}`);
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: Failed to load OKF bundle`);
      }
      const data: BundlePayload = await res.json();
      setBundle(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load MAGI Knowledge bundle');
    } finally {
      setLoading(false);
    }
  }, [failOnStale]);

  useEffect(() => {
    fetchBundle(failOnStale);
  }, [fetchBundle, failOnStale]);

  const handleNavigateConcept = (conceptIdOrRelPath: string) => {
    const clean = conceptIdOrRelPath.replace(/\.md$/, '');
    const reservedMatch = bundle?.reservedDocs.find(
      (d) => d.relPath === conceptIdOrRelPath || d.relPath.replace(/\.md$/, '') === clean
    );
    if (reservedMatch) {
      setActiveReservedDocPath(reservedMatch.relPath);
      return;
    }
    setActiveReservedDocPath(null);
    setSelectedConceptId(clean);
    setActiveTab('explorer');
  };

  const reservedDoc = bundle?.reservedDocs.find((d) => d.relPath === activeReservedDocPath);

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
      {/* Top Bar Contract: Zone 1 (Brand) — Zone 2 (5 Single-Line Nav Links) — Zone 3 (1 Primary Action) */}
      <header className="sticky top-0 z-30 bg-white border-b border-slate-200 px-6 py-3.5 flex items-center justify-between gap-8">
        <a
          href="#explorer"
          onClick={(e) => {
            e.preventDefault();
            setActiveReservedDocPath(null);
            setActiveTab('explorer');
          }}
          className="text-base font-bold tracking-tight text-slate-900 whitespace-nowrap shrink-0 font-display"
        >
          magi-knowledge
        </a>

        <nav className="flex items-center gap-6 text-xs font-medium text-slate-600 overflow-x-auto">
          {[
            { id: 'explorer', label: 'Concept Explorer' },
            { id: 'linter', label: 'Linter & Gates' },
            { id: 'safe-loader', label: 'LILITH Safe Loader' },
            { id: 'system-matrix', label: 'System Matrix' },
            { id: 'export-sync', label: 'Export & R2 Sync' },
          ].map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                setActiveReservedDocPath(null);
                setActiveTab(item.id as NavTab);
              }}
              className={`py-1 transition-colors whitespace-nowrap shrink-0 border-b-2 ${
                activeTab === item.id && !activeReservedDocPath
                  ? 'border-slate-900 text-slate-900 font-semibold'
                  : 'border-transparent hover:text-slate-900'
              }`}
            >
              {item.label}
            </button>
          ))}
        </nav>

        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={() => fetchBundle(failOnStale)}
            className="px-3.5 py-1.5 text-xs font-medium text-white bg-slate-900 rounded-md hover:bg-slate-800 transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Re-verify Bundle</span>
          </button>
        </div>
      </header>

      {/* Main Content Container */}
      <main className="flex-1 max-w-[1440px] w-full mx-auto px-6 py-6 space-y-6">
        {/* Bundle Authority & Reference Strip */}
        {bundle && (
          <section className="bg-white border border-slate-200 rounded-lg p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center flex-wrap gap-2 text-xs text-slate-500 font-mono">
                <span className="text-slate-900 font-semibold">
                  Open Knowledge Format (OKF v{bundle.okfVersion})
                </span>
                <span aria-hidden="true">·</span>
                <span>Authority: dogmaai/magi-knowledge @ {bundle.gitRevision}</span>
                <span aria-hidden="true">·</span>
                <span className="tabular-nums">
                  {bundle.concepts.filter((c) => c.tree === '_lilith_safe').length} _lilith_safe
                  concepts
                </span>
                <span aria-hidden="true">·</span>
                <span className="tabular-nums">
                  {bundle.concepts.filter((c) => c.tree === 'system').length} system concepts
                </span>
              </div>
              <p className="text-xs text-slate-600 max-w-3xl leading-relaxed">
                Single source of truth for the MAGI trading system specification, ECHIDNA BigQuery
                catalog, L0–L7 guard layers, PLM unit roster, and the structurally enforced LILITH
                clean-source training boundary.
              </p>
            </div>

            {/* Entry-Point Quick Links (AGENTS.md / index.md / COLLABORATION.md / log.md) */}
            <div className="flex flex-wrap items-center gap-2 shrink-0">
              {[
                { label: 'index.md', target: 'index.md', reserved: true },
                { label: 'AGENTS.md', target: 'AGENTS', reserved: false },
                { label: 'COLLABORATION.md', target: 'COLLABORATION', reserved: false },
                { label: 'PROMPT.md', target: 'PROMPT', reserved: false },
                { label: 'log.md', target: 'log.md', reserved: true },
              ].map((doc) => (
                <button
                  key={doc.label}
                  type="button"
                  onClick={() => {
                    if (doc.reserved) {
                      setActiveReservedDocPath(doc.target);
                    } else {
                      setActiveReservedDocPath(null);
                      setSelectedConceptId(doc.target);
                      setActiveTab('explorer');
                    }
                  }}
                  className={`px-2.5 py-1 text-xs font-mono rounded border transition-colors whitespace-nowrap shrink-0 ${
                    activeReservedDocPath === doc.target ||
                    (!activeReservedDocPath &&
                      activeTab === 'explorer' &&
                      selectedConceptId === doc.target)
                      ? 'bg-slate-900 text-white border-slate-900'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {doc.label}
                </button>
              ))}
            </div>
          </section>
        )}

        {/* Loading / Error / Active View */}
        {loading && !bundle ? (
          <div className="bg-white border border-slate-200 rounded-lg p-12 text-center space-y-2">
            <div className="text-sm font-semibold text-slate-900">
              Parsing OKF v0.2 Knowledge Bundle & Running Boundary Checks...
            </div>
            <p className="text-xs text-slate-500">
              Scanning _lilith_safe/ and system/ concept trees and verifying cross-unit detector
              sync.
            </p>
          </div>
        ) : error ? (
          <div className="bg-rose-50 border border-rose-200 rounded-lg p-6 text-xs text-rose-900 space-y-2">
            <div className="font-semibold">Error Loading OKF Bundle</div>
            <div className="font-mono">{error}</div>
            <button
              type="button"
              onClick={() => fetchBundle(failOnStale)}
              className="px-3 py-1.5 bg-rose-900 text-white rounded-md font-medium"
            >
              Retry
            </button>
          </div>
        ) : bundle && reservedDoc ? (
          <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 bg-slate-50/60 flex items-center justify-between">
              <div>
                <div className="text-xs font-mono text-slate-500">
                  Reserved OKF Bundle Document · {reservedDoc.relPath}
                </div>
                <h1 className="text-lg font-bold text-slate-900 mt-0.5">{reservedDoc.title}</h1>
              </div>
              <button
                type="button"
                onClick={() => setActiveReservedDocPath(null)}
                className="px-3 py-1.5 text-xs font-medium bg-slate-900 text-white rounded-md hover:bg-slate-800 transition-colors"
              >
                Back to Workbench
              </button>
            </div>
            <div className="p-6 max-h-[750px] overflow-y-auto">
              <MarkdownViewer
                content={reservedDoc.body}
                currentRelPath={reservedDoc.relPath}
                onNavigateConcept={handleNavigateConcept}
              />
            </div>
          </div>
        ) : bundle ? (
          <>
            {activeTab === 'explorer' && (
              <ConceptExplorerView
                bundle={bundle}
                selectedConceptId={selectedConceptId}
                onSelectConceptId={setSelectedConceptId}
                onBundleUpdated={setBundle}
              />
            )}
            {activeTab === 'linter' && (
              <LinterGatesView
                bundle={bundle}
                failOnStale={failOnStale}
                onToggleFailOnStale={(val) => setFailOnStale(val)}
                onNavigateConcept={handleNavigateConcept}
              />
            )}
            {activeTab === 'safe-loader' && (
              <SafeLoaderView bundle={bundle} onNavigateConcept={handleNavigateConcept} />
            )}
            {activeTab === 'system-matrix' && (
              <SystemMatrixView bundle={bundle} onNavigateConcept={handleNavigateConcept} />
            )}
            {activeTab === 'export-sync' && (
              <ExportSyncView bundle={bundle} onNavigateConcept={handleNavigateConcept} />
            )}
          </>
        ) : null}
      </main>

      {/* Clean Quiet Footer */}
      <footer className="bg-white border-t border-slate-200 px-6 py-4 mt-12">
        <div className="max-w-[1440px] mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-slate-700" />
            <span>
              MAGI Knowledge Bundle (OKF v0.2) · LILITH Contamination Boundary Enforced
            </span>
          </div>
          <div className="font-mono">
            Repository: dogmaai/magi-knowledge · Revision: 383a61655330
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;

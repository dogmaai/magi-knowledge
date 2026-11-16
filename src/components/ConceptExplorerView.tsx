import React, { useMemo, useState } from 'react';
import {
  CheckCircle2,
  Edit3,
  ExternalLink,
  FileText,
  FolderTree,
  RotateCcw,
  Save,
  Search,
  ShieldAlert,
  ShieldCheck,
} from 'lucide-react';
import type { BundlePayload, LintDiagnostic, ParsedConcept, TreeScope } from '../types/okf.ts';
import { MarkdownViewer } from './MarkdownViewer.tsx';

interface ConceptExplorerViewProps {
  bundle: BundlePayload;
  selectedConceptId: string;
  onSelectConceptId: (conceptId: string) => void;
  onBundleUpdated: (payload: BundlePayload) => void;
}

export const ConceptExplorerView: React.FC<ConceptExplorerViewProps> = ({
  bundle,
  selectedConceptId,
  onSelectConceptId,
  onBundleUpdated,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [treeFilter, setTreeFilter] = useState<'ALL' | TreeScope>('ALL');
  const [subtreeFilter, setSubtreeFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'stable' | 'draft' | 'deprecated'>('ALL');
  const [trustFilter, setTrustFilter] = useState<
    'ALL' | 'human-reviewed' | 'machine-confirmed' | 'unverified'
  >('ALL');
  const [viewMode, setViewMode] = useState<'rendered' | 'raw' | 'edit'>('rendered');

  const [editorText, setEditorText] = useState('');
  const [liveDiags, setLiveDiags] = useState<LintDiagnostic[] | null>(null);
  const [savingStatus, setSavingStatus] = useState<string | null>(null);

  const subtrees = useMemo(() => {
    const set = new Set<string>();
    for (const c of bundle.concepts) {
      if (treeFilter === 'ALL' || c.tree === treeFilter) {
        set.add(c.subtree);
      }
    }
    return Array.from(set).sort();
  }, [bundle.concepts, treeFilter]);

  const filteredConcepts = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return bundle.concepts.filter((c) => {
      if (treeFilter !== 'ALL' && c.tree !== treeFilter) return false;
      if (subtreeFilter !== 'ALL' && c.subtree !== subtreeFilter) return false;
      if (statusFilter !== 'ALL' && c.status !== statusFilter) return false;
      if (trustFilter !== 'ALL' && c.trustTier !== trustFilter) return false;
      if (!q) return true;
      return (
        c.conceptId.toLowerCase().includes(q) ||
        c.title.toLowerCase().includes(q) ||
        c.description.toLowerCase().includes(q) ||
        c.type.toLowerCase().includes(q) ||
        c.tags.some((t) => t.toLowerCase().includes(q)) ||
        c.body.toLowerCase().includes(q)
      );
    });
  }, [bundle.concepts, searchQuery, treeFilter, subtreeFilter, statusFilter, trustFilter]);

  const selectedConcept: ParsedConcept | undefined = useMemo(() => {
    return (
      bundle.concepts.find(
        (c) => c.conceptId === selectedConceptId || c.relPath === selectedConceptId
      ) || filteredConcepts[0] || bundle.concepts[0]
    );
  }, [bundle.concepts, filteredConcepts, selectedConceptId]);

  const incomingLinks = useMemo(() => {
    if (!selectedConcept) return [];
    return bundle.concepts.filter((c) =>
      c.outgoingLinks.some(
        (link) =>
          link === selectedConcept.relPath ||
          link.replace(/\.md$/, '') === selectedConcept.conceptId
      )
    );
  }, [bundle.concepts, selectedConcept]);

  const conceptDiagnostics = useMemo(() => {
    if (!selectedConcept) return [];
    return bundle.lintReport.diagnostics.filter(
      (d) => d.relPath === selectedConcept.relPath || d.conceptId === selectedConcept.conceptId
    );
  }, [bundle.lintReport.diagnostics, selectedConcept]);

  const handleOpenEditMode = (concept: ParsedConcept) => {
    setEditorText(concept.rawText);
    setLiveDiags(null);
    setSavingStatus(null);
    setViewMode('edit');
  };

  const handleValidateDraft = async (relPath: string, rawText: string) => {
    const res = await fetch('/api/lint-document', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ relPath, rawText }),
    });
    const data = await res.json();
    if (data.diagnostics) {
      setLiveDiags(data.diagnostics);
    }
  };

  const handleSaveOverride = async () => {
    if (!selectedConcept) return;
    setSavingStatus('Validating & applying in-memory override...');
    const res = await fetch('/api/save-concept-override', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        relPath: selectedConcept.relPath,
        rawText: editorText,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      setLiveDiags(data.diagnostics || []);
      setSavingStatus(`Blocked by OKF gate: ${data.error}`);
      return;
    }
    setLiveDiags([]);
    setSavingStatus('Applied in-memory OKF override cleanly.');
    onBundleUpdated(data.payload);
    setViewMode('rendered');
  };

  const handleResetOverride = async () => {
    if (!selectedConcept) return;
    const res = await fetch('/api/reset-concept-override', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ relPath: selectedConcept.relPath }),
    });
    const data = await res.json();
    if (data.payload) {
      onBundleUpdated(data.payload);
      setSavingStatus('Restored canonical repository version.');
      setViewMode('rendered');
    }
  };

  const handleNavigateLink = (target: string) => {
    const normalized = target.replace(/\.md$/, '');
    const match = bundle.concepts.find(
      (c) =>
        c.conceptId === normalized ||
        c.relPath === target ||
        c.conceptId.endsWith(`/${normalized}`)
    );
    if (match) {
      onSelectConceptId(match.conceptId);
      setViewMode('rendered');
    }
  };

  return (
    <div className="space-y-6">
      {/* Filter & Search Toolbar */}
      <div className="bg-white border border-slate-200 rounded-lg p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search 139 concepts by ID, title, tag, BigQuery table, or body..."
            className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-md text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-slate-900 transition-colors"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Tree Segmented Control */}
          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-md">
            {(
              [
                { id: 'ALL', label: 'All Trees' },
                { id: '_lilith_safe', label: '_lilith_safe/ (Clean)' },
                { id: 'system', label: 'system/ (Restricted)' },
                { id: 'root', label: 'Root Workflow' },
                { id: 'skills', label: 'Agent Skills' },
              ] as const
            ).map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  setTreeFilter(item.id);
                  setSubtreeFilter('ALL');
                }}
                className={`px-2.5 py-1 text-xs font-medium rounded transition-colors whitespace-nowrap shrink-0 ${
                  treeFilter === item.id
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>

          {/* Subtree Selector */}
          <select
            value={subtreeFilter}
            onChange={(e) => setSubtreeFilter(e.target.value)}
            aria-label="Filter by subtree"
            className="px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-md text-slate-700 focus:outline-none focus:border-slate-900"
          >
            <option value="ALL">All Subtrees ({subtrees.length})</option>
            {subtrees.map((st) => (
              <option key={st} value={st}>
                {st}/
              </option>
            ))}
          </select>

          {/* Status Selector */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            aria-label="Filter by status"
            className="px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-md text-slate-700 focus:outline-none focus:border-slate-900"
          >
            <option value="ALL">All Lifecycle Statuses</option>
            <option value="stable">status: stable</option>
            <option value="draft">status: draft</option>
            <option value="deprecated">status: deprecated</option>
          </select>

          {/* Trust Tier Selector */}
          <select
            value={trustFilter}
            onChange={(e) => setTrustFilter(e.target.value as any)}
            aria-label="Filter by trust tier"
            className="px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-md text-slate-700 focus:outline-none focus:border-slate-900"
          >
            <option value="ALL">All Trust Tiers</option>
            <option value="human-reviewed">human-reviewed</option>
            <option value="machine-confirmed">machine-confirmed</option>
            <option value="unverified">unverified</option>
          </select>
        </div>
      </div>

      {/* Main Master-Detail Split */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Directory List (4 cols) */}
        <div className="lg:col-span-4 bg-white border border-slate-200 rounded-lg overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between bg-slate-50/60">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-900">
              <FolderTree className="w-3.5 h-3.5 text-slate-500" />
              <span>OKF Concept Directory</span>
            </div>
            <span className="text-xs font-mono text-slate-500 tabular-nums">
              {filteredConcepts.length} / {bundle.concepts.length}
            </span>
          </div>

          <div className="max-h-[720px] overflow-y-auto divide-y divide-slate-100">
            {filteredConcepts.length === 0 ? (
              <div className="p-8 text-center space-y-2">
                <p className="text-xs font-medium text-slate-700">No matching OKF concepts</p>
                <p className="text-xs text-slate-500">
                  Clear your search query or reset the tree and lifecycle filters.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    setTreeFilter('ALL');
                    setSubtreeFilter('ALL');
                    setStatusFilter('ALL');
                    setTrustFilter('ALL');
                  }}
                  className="mt-2 px-3 py-1.5 text-xs font-medium bg-slate-900 text-white rounded-md hover:bg-slate-800 transition-colors"
                >
                  Reset Filters
                </button>
              </div>
            ) : (
              filteredConcepts.map((c) => {
                const isSelected = selectedConcept?.conceptId === c.conceptId;
                return (
                  <button
                    key={c.conceptId}
                    type="button"
                    onClick={() => {
                      onSelectConceptId(c.conceptId);
                      if (viewMode === 'edit') setViewMode('rendered');
                    }}
                    className={`w-full text-left px-4 py-3 transition-colors block ${
                      isSelected ? 'bg-slate-900 text-white' : 'hover:bg-slate-50 text-slate-900'
                    }`}
                  >
                    <div className="flex items-baseline justify-between gap-2">
                      <span
                        className={`text-xs font-semibold truncate ${
                          isSelected ? 'text-white' : 'text-slate-900'
                        }`}
                      >
                        {c.title}
                      </span>
                      <span
                        className={`text-[11px] font-mono shrink-0 ${
                          isSelected
                            ? 'text-slate-300'
                            : c.status === 'stable'
                              ? 'text-emerald-700'
                              : c.status === 'deprecated'
                                ? 'text-rose-700'
                                : 'text-amber-700'
                        }`}
                      >
                        {c.status}
                      </span>
                    </div>

                    <div
                      className={`mt-0.5 text-[11px] font-mono truncate ${
                        isSelected ? 'text-slate-300' : 'text-slate-500'
                      }`}
                    >
                      {c.conceptId}
                    </div>

                    {/* Zero-Pill Metadata line */}
                    <div
                      className={`mt-1.5 flex items-center flex-wrap gap-1.5 text-[11px] ${
                        isSelected ? 'text-slate-300' : 'text-slate-500'
                      }`}
                    >
                      <span>{c.type}</span>
                      <span aria-hidden="true">·</span>
                      <span>
                        {c.lilithSafe === true
                          ? 'lilith_safe: true'
                          : c.lilithSafe === false
                            ? 'lilith_safe: false'
                            : 'unscoped'}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span>{c.trustTier}</span>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Right Concept Inspector & Editor (8 cols) */}
        <div className="lg:col-span-8 bg-white border border-slate-200 rounded-lg overflow-hidden">
          {selectedConcept ? (
            <div>
              {/* Concept Header */}
              <div className="p-6 border-b border-slate-200 bg-slate-50/40">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center flex-wrap gap-2 text-xs font-mono text-slate-500">
                      <span>{selectedConcept.relPath}</span>
                      <span aria-hidden="true">·</span>
                      <span>{selectedConcept.type}</span>
                      {selectedConcept.unitStatus && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span className="text-slate-700 font-semibold">
                            unit_status: {selectedConcept.unitStatus}
                          </span>
                        </>
                      )}
                    </div>
                    <h1 className="text-xl font-bold text-slate-900 tracking-tight">
                      {selectedConcept.title}
                    </h1>
                    {selectedConcept.description && (
                      <p className="text-xs text-slate-600 leading-relaxed max-w-2xl">
                        {selectedConcept.description}
                      </p>
                    )}
                  </div>

                  {/* View Mode Switcher */}
                  <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-md shrink-0">
                    <button
                      type="button"
                      onClick={() => setViewMode('rendered')}
                      className={`px-2.5 py-1 text-xs font-medium rounded transition-colors whitespace-nowrap shrink-0 ${
                        viewMode === 'rendered'
                          ? 'bg-white text-slate-900 shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Document
                    </button>
                    <button
                      type="button"
                      onClick={() => setViewMode('raw')}
                      className={`px-2.5 py-1 text-xs font-medium rounded transition-colors whitespace-nowrap shrink-0 ${
                        viewMode === 'raw'
                          ? 'bg-white text-slate-900 shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      YAML + Markdown
                    </button>
                    <button
                      type="button"
                      onClick={() => handleOpenEditMode(selectedConcept)}
                      className={`px-2.5 py-1 text-xs font-medium rounded transition-colors flex items-center gap-1 whitespace-nowrap shrink-0 ${
                        viewMode === 'edit'
                          ? 'bg-white text-slate-900 shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      <Edit3 className="w-3 h-3" />
                      <span>Sandbox Edit</span>
                    </button>
                  </div>
                </div>

                {/* OKF v0.2 Authority & Contamination Boundary Strip */}
                <div className="mt-5 pt-4 border-t border-slate-200/80 grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                  <div>
                    <div className="text-slate-500">Contamination Boundary</div>
                    <div className="mt-1 font-mono font-semibold flex items-center gap-1.5">
                      {selectedConcept.lilithSafe === true ? (
                        <>
                          <ShieldCheck className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                          <span className="text-emerald-800">LILITH_SAFE (true)</span>
                        </>
                      ) : selectedConcept.lilithSafe === false ? (
                        <>
                          <ShieldAlert className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                          <span className="text-slate-900">SYSTEM_ONLY (false)</span>
                        </>
                      ) : (
                        <span className="text-slate-500">Unscoped</span>
                      )}
                    </div>
                  </div>

                  <div>
                    <div className="text-slate-500">Lifecycle & Trust Tier</div>
                    <div className="mt-1 font-mono font-semibold text-slate-900">
                      {selectedConcept.status} · {selectedConcept.trustTier}
                    </div>
                  </div>

                  <div>
                    <div className="text-slate-500">Generated By (§7 Actor)</div>
                    <div className="mt-1 font-mono text-slate-800 truncate">
                      {selectedConcept.generated
                        ? `${selectedConcept.generated.by} (${selectedConcept.generated.at.slice(0, 10)})`
                        : '—'}
                    </div>
                  </div>

                  <div>
                    <div className="text-slate-500">Latest Verification / Stale After</div>
                    <div className="mt-1 font-mono text-slate-800 truncate tabular-nums">
                      {selectedConcept.verified.length > 0
                        ? `${selectedConcept.verified[selectedConcept.verified.length - 1].by} · ${
                            selectedConcept.staleAfter
                              ? `until ${selectedConcept.staleAfter.slice(0, 10)}`
                              : 'no expiry'
                          }`
                        : 'Unverified draft'}
                    </div>
                  </div>
                </div>

                {/* Tags & Diagnostics Notice */}
                {selectedConcept.tags.length > 0 && (
                  <div className="mt-3 flex items-center flex-wrap gap-1.5 text-xs text-slate-500">
                    <span className="font-medium text-slate-700">Tags:</span>
                    {selectedConcept.tags.map((tag, idx) => (
                      <React.Fragment key={tag}>
                        {idx > 0 && <span aria-hidden="true">·</span>}
                        <span className="font-mono">{tag}</span>
                      </React.Fragment>
                    ))}
                  </div>
                )}

                {conceptDiagnostics.length > 0 && (
                  <div className="mt-4 p-3 rounded-md bg-amber-50/80 border border-amber-200 text-xs text-amber-900 space-y-1">
                    {conceptDiagnostics.map((d, idx) => (
                      <div key={idx} className="font-mono">
                        [{d.level}] {d.message}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Body Area */}
              <div className="p-6">
                {viewMode === 'rendered' && (
                  <div className="space-y-6">
                    {/* Frontmatter Key-Value Table */}
                    <div className="border border-slate-200 rounded-lg overflow-hidden">
                      <div className="px-3.5 py-2 bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-700 flex items-center justify-between">
                        <span>OKF v0.2 Frontmatter Attributes</span>
                        <span className="font-mono text-slate-500 tabular-nums">
                          {Object.keys(selectedConcept.frontmatter).length} keys
                        </span>
                      </div>
                      <div className="divide-y divide-slate-100 text-xs">
                        {Object.entries(selectedConcept.frontmatter).map(([k, v]) => (
                          <div
                            key={k}
                            className="px-3.5 py-2 grid grid-cols-1 sm:grid-cols-4 gap-2 hover:bg-slate-50/60"
                          >
                            <span className="font-mono font-medium text-slate-700">{k}</span>
                            <span className="sm:col-span-3 font-mono text-slate-900 break-all">
                              {typeof v === 'object' ? JSON.stringify(v) : String(v)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Rendered Markdown Body */}
                    <div>
                      <MarkdownViewer
                        content={selectedConcept.body}
                        currentRelPath={selectedConcept.relPath}
                        onNavigateConcept={handleNavigateLink}
                      />
                    </div>

                    {/* Cross-Reference Graph Footer */}
                    {(selectedConcept.outgoingLinks.length > 0 || incomingLinks.length > 0) && (
                      <div className="pt-6 border-t border-slate-200 grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <h3 className="text-xs font-semibold text-slate-900 mb-2">
                            Outgoing Concept Links ({selectedConcept.outgoingLinks.length})
                          </h3>
                          {selectedConcept.outgoingLinks.length === 0 ? (
                            <p className="text-xs text-slate-500">None</p>
                          ) : (
                            <ul className="space-y-1.5 text-xs font-mono">
                              {selectedConcept.outgoingLinks.map((target) => (
                                <li key={target}>
                                  <button
                                    type="button"
                                    onClick={() => handleNavigateLink(target)}
                                    className="text-slate-700 hover:text-slate-900 underline decoration-slate-300 hover:decoration-slate-900 flex items-center gap-1"
                                  >
                                    <ExternalLink className="w-3 h-3 shrink-0" />
                                    <span>{target}</span>
                                  </button>
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>

                        <div>
                          <h3 className="text-xs font-semibold text-slate-900 mb-2">
                            Referenced By ({incomingLinks.length})
                          </h3>
                          {incomingLinks.length === 0 ? (
                            <p className="text-xs text-slate-500">No incoming concept links</p>
                          ) : (
                            <ul className="space-y-1.5 text-xs font-mono">
                              {incomingLinks.map((inc) => (
                                <li key={inc.conceptId}>
                                  <button
                                    type="button"
                                    onClick={() => onSelectConceptId(inc.conceptId)}
                                    className="text-slate-700 hover:text-slate-900 underline decoration-slate-300 hover:decoration-slate-900 flex items-center gap-1"
                                  >
                                    <FileText className="w-3 h-3 shrink-0" />
                                    <span>{inc.conceptId}</span>
                                  </button>
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {viewMode === 'raw' && (
                  <div className="rounded-lg border border-slate-200 bg-slate-900 text-slate-100 overflow-hidden">
                    <div className="px-4 py-2 bg-slate-800 border-b border-slate-700 text-xs font-mono text-slate-300 flex items-center justify-between">
                      <span>{selectedConcept.relPath}</span>
                      <span className="tabular-nums">{selectedConcept.rawText.length} bytes</span>
                    </div>
                    <pre className="p-4 text-xs font-mono leading-relaxed overflow-x-auto">
                      <code>{selectedConcept.rawText}</code>
                    </pre>
                  </div>
                )}

                {viewMode === 'edit' && (
                  <div className="space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-200">
                      <p className="text-xs text-slate-600">
                        Edit frontmatter or markdown below. Saving runs{' '}
                        <code className="font-mono bg-slate-100 px-1 py-0.5 rounded">
                          okf_lint
                        </code>{' '}
                        and refuses any change that violates OKF v0.2 or the LILITH contamination
                        boundary.
                      </p>
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() =>
                            handleValidateDraft(selectedConcept.relPath, editorText)
                          }
                          className="px-3 py-1.5 text-xs font-medium border border-slate-300 text-slate-800 rounded-md hover:bg-slate-50 transition-colors whitespace-nowrap shrink-0"
                        >
                          Check Conformance
                        </button>
                        <button
                          type="button"
                          onClick={handleResetOverride}
                          className="px-3 py-1.5 text-xs font-medium border border-slate-300 text-slate-700 rounded-md hover:bg-slate-50 transition-colors flex items-center gap-1 whitespace-nowrap shrink-0"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          <span>Reset</span>
                        </button>
                        <button
                          type="button"
                          onClick={handleSaveOverride}
                          className="px-3 py-1.5 text-xs font-medium bg-slate-900 text-white rounded-md hover:bg-slate-800 transition-colors flex items-center gap-1 whitespace-nowrap shrink-0"
                        >
                          <Save className="w-3.5 h-3.5" />
                          <span>Apply Validated Override</span>
                        </button>
                      </div>
                    </div>

                    {savingStatus && (
                      <div className="p-3 rounded-md bg-slate-100 border border-slate-200 text-xs font-mono text-slate-800">
                        {savingStatus}
                      </div>
                    )}

                    {liveDiags !== null && (
                      <div
                        className={`p-3.5 rounded-md border text-xs space-y-1.5 ${
                          liveDiags.some((d) => d.level === 'ERROR')
                            ? 'bg-rose-50 border-rose-200 text-rose-900'
                            : 'bg-emerald-50 border-emerald-200 text-emerald-900'
                        }`}
                      >
                        <div className="font-semibold flex items-center gap-1.5">
                          <CheckCircle2 className="w-4 h-4 shrink-0" />
                          <span>
                            {liveDiags.some((d) => d.level === 'ERROR')
                              ? `Validation Failed (${
                                  liveDiags.filter((d) => d.level === 'ERROR').length
                                } error(s))`
                              : `OKF Conformance & LILITH Boundary Passed (${liveDiags.length} warning(s))`}
                          </span>
                        </div>
                        {liveDiags.map((d, i) => (
                          <div key={i} className="font-mono text-[11px]">
                            [{d.level}] ({d.category}) {d.message}
                          </div>
                        ))}
                      </div>
                    )}

                    <textarea
                      value={editorText}
                      onChange={(e) => {
                        setEditorText(e.target.value);
                        handleValidateDraft(selectedConcept.relPath, e.target.value);
                      }}
                      rows={24}
                      className="w-full p-4 font-mono text-xs bg-slate-900 text-slate-100 rounded-lg border border-slate-700 focus:outline-none focus:border-slate-400 leading-relaxed"
                    />
                  </div>
                )}
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
};

import React, { useEffect, useState } from 'react';
import { Check, Cloud, Copy, Download, FileCode, ShieldAlert } from 'lucide-react';
import type { BundlePayload } from '../types/okf.ts';

interface ExportSyncViewProps {
  bundle: BundlePayload;
  onNavigateConcept: (conceptId: string) => void;
}

const CONSUMER_PREAMBLE = `MAGI の仕様の正本は GitHub dogmaai/magi-knowledge の main（OKF バンドル）だけです。
記憶・過去の会話・他 repo の README/コメント・旧仕様・ミラー（AI Search / R2）は派生物で、食い違えば main が勝ちます。
着手前に index.md → AGENTS.md → 対象の概念文書を読み、参照したコミットハッシュを成果物に記録してください。repo を読めなければ推測せず、最新 main のダイジェスト提供を依頼してください。
文書は frontmatter の status で扱いを変えます: stable かつ human: 検証済み = 正典 / draft = 仮説として明示 / deprecated = 参照禁止（後継へ）/ stale_after 超過 = 再検証待ちと明記。ミラー検索では trust_tier=human-reviewed かつ status=stable を優先します。
仕様（意図）と実装・デプロイ設定（実際）が食い違ったら、どちらも黙って直さず、両方のリビジョンを添えてドリフトとして報告してください。ポリシー・トレーディング方針・アーキテクチャの未解決事項は決めずにエスカレーションします。
magi-knowledge の外に仕様の別コピーを作らないこと、権限があってもデプロイ・本番操作をしないこと。`;

export const ExportSyncView: React.FC<ExportSyncViewProps> = ({
  bundle,
  onNavigateConcept,
}) => {
  const [selectedTree, setSelectedTree] = useState<'system' | '_lilith_safe'>('system');
  const [digestData, setDigestData] = useState<{
    tree: string;
    charCount: number;
    lineCount: number;
    digest: string;
  } | null>(null);
  const [copiedDigest, setCopiedDigest] = useState(false);
  const [copiedPreamble, setCopiedPreamble] = useState(false);
  const [r2Tab, setR2Tab] = useState<'ai-search' | 'iceberg'>('ai-search');
  const [r2Filter, setR2Filter] = useState('');

  useEffect(() => {
    fetch(`/api/export-digest?tree=${selectedTree}`)
      .then((r) => r.json())
      .then((data) => setDigestData(data));
  }, [selectedTree]);

  const handleCopyDigest = async () => {
    if (!digestData) return;
    await navigator.clipboard.writeText(digestData.digest);
    setCopiedDigest(true);
    setTimeout(() => setCopiedDigest(false), 2000);
  };

  const handleDownloadDigest = () => {
    if (!digestData) return;
    const blob = new Blob([digestData.digest], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `magi-spec-${selectedTree}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleCopyPreamble = async () => {
    await navigator.clipboard.writeText(CONSUMER_PREAMBLE);
    setCopiedPreamble(true);
    setTimeout(() => setCopiedPreamble(false), 2000);
  };

  const filteredR2Items = bundle.r2Preview.items.filter((item) => {
    if (!r2Filter.trim()) return true;
    const q = r2Filter.toLowerCase();
    return (
      item.conceptId.toLowerCase().includes(q) ||
      item.key.toLowerCase().includes(q) ||
      (item.icebergRow.type || '').toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      {/* Top Row: Consumer Preamble (PROMPT.md) + Single-Tree Digest Exporter (okf_export.py) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: PROMPT.md 6-line Consumer Preamble (5 cols) */}
        <div className="lg:col-span-5 bg-white border border-slate-200 rounded-lg p-5 space-y-4">
          <div className="flex items-start justify-between gap-2 border-b border-slate-200 pb-3">
            <div>
              <h2 className="text-sm font-semibold text-slate-900">
                LLM Consumer Preamble (PROMPT.md)
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Value-free 6-line system prompt preamble for external LLMs (GPT, Gemini,
                Antigravity).
              </p>
            </div>
            <button
              type="button"
              onClick={handleCopyPreamble}
              className="px-3 py-1.5 text-xs font-medium bg-slate-900 text-white rounded-md hover:bg-slate-800 transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0"
            >
              {copiedPreamble ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedPreamble ? 'Copied Preamble' : 'Copy Preamble'}</span>
            </button>
          </div>

          <pre className="p-3.5 rounded-lg bg-slate-900 text-slate-100 text-xs font-mono leading-relaxed overflow-x-auto whitespace-pre-wrap">
            <code>{CONSUMER_PREAMBLE}</code>
          </pre>

          <div className="pt-2 flex items-center justify-between text-xs text-slate-500">
            <span>Reference revision: 383a61655330</span>
            <button
              type="button"
              onClick={() => onNavigateConcept('PROMPT')}
              className="text-slate-900 underline font-medium"
            >
              Read full PROMPT.md protocol
            </button>
          </div>
        </div>

        {/* Right: Single-Tree OKF Digest Flattener (okf_export.py) (7 cols) */}
        <div className="lg:col-span-7 bg-white border border-slate-200 rounded-lg p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-3">
            <div>
              <div className="flex items-center gap-2">
                <FileCode className="w-4 h-4 text-slate-700" />
                <h2 className="text-sm font-semibold text-slate-900">
                  OKF Single-Tree Digest Exporter (scripts/okf_export.py)
                </h2>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Flattens exactly one tree per run. Aborts if any concept&apos;s{' '}
                <code className="font-mono">lilith_safe</code> flag contradicts the selected tree.
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-md">
                <button
                  type="button"
                  onClick={() => setSelectedTree('system')}
                  className={`px-2.5 py-1 text-xs font-medium rounded transition-colors whitespace-nowrap shrink-0 ${
                    selectedTree === 'system'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  --tree system
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedTree('_lilith_safe')}
                  className={`px-2.5 py-1 text-xs font-medium rounded transition-colors whitespace-nowrap shrink-0 ${
                    selectedTree === '_lilith_safe'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  --tree _lilith_safe
                </button>
              </div>

              <button
                type="button"
                onClick={handleCopyDigest}
                className="px-3 py-1.5 text-xs font-medium border border-slate-300 text-slate-800 rounded-md hover:bg-slate-50 transition-colors flex items-center gap-1 whitespace-nowrap shrink-0"
              >
                {copiedDigest ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedDigest ? 'Copied' : 'Copy'}</span>
              </button>

              <button
                type="button"
                onClick={handleDownloadDigest}
                className="px-3 py-1.5 text-xs font-medium bg-slate-900 text-white rounded-md hover:bg-slate-800 transition-colors flex items-center gap-1 whitespace-nowrap shrink-0"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download .md</span>
              </button>
            </div>
          </div>

          {digestData && (
            <div className="rounded-lg border border-slate-200 bg-slate-900 text-slate-100 overflow-hidden">
              <div className="px-4 py-2 bg-slate-800 border-b border-slate-700 text-xs font-mono text-slate-300 flex items-center justify-between">
                <span>
                  python scripts/okf_export.py --tree {digestData.tree}
                </span>
                <span className="tabular-nums">
                  {digestData.charCount.toLocaleString()} chars ·{' '}
                  {digestData.lineCount.toLocaleString()} lines
                </span>
              </div>
              <pre className="p-4 text-xs font-mono leading-relaxed overflow-x-auto max-h-72">
                <code>{digestData.digest.slice(0, 6000)}...</code>
              </pre>
            </div>
          )}
        </div>
      </div>

      {/* Bottom Row: Cloudflare R2 AI Search & Iceberg Data Catalog Mirror Preview */}
      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200 bg-slate-50/60 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Cloud className="w-4 h-4 text-slate-700" />
              <h2 className="text-sm font-semibold text-slate-900">
                Cloudflare R2 AI Search & Apache Iceberg Data Catalog Mirror (Dry-Run Inspector)
              </h2>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Bucket: <code className="font-mono">{bundle.r2Preview.bucket}</code> · Prefix:{' '}
              <code className="font-mono">{bundle.r2Preview.prefix}/</code> · Iceberg Table:{' '}
              <code className="font-mono">{bundle.r2Preview.namespace}.system</code> (
              {bundle.r2Preview.items.length} system concepts;{' '}
              <code className="font-mono">_lilith_safe</code> is blocked from R2 catalog sync).
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <input
              type="text"
              value={r2Filter}
              onChange={(e) => setR2Filter(e.target.value)}
              placeholder="Filter R2 keys or Iceberg rows..."
              className="px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-md text-slate-900 focus:outline-none focus:border-slate-900"
            />
            <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-md">
              <button
                type="button"
                onClick={() => setR2Tab('ai-search')}
                className={`px-2.5 py-1 text-xs font-medium rounded transition-colors whitespace-nowrap shrink-0 ${
                  r2Tab === 'ai-search'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                AI Search S3 Metadata (ai_search_r2_sync.py)
              </button>
              <button
                type="button"
                onClick={() => setR2Tab('iceberg')}
                className={`px-2.5 py-1 text-xs font-medium rounded transition-colors whitespace-nowrap shrink-0 ${
                  r2Tab === 'iceberg'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Iceberg Catalog Rows (r2_catalog_sync.py)
              </button>
            </div>
          </div>
        </div>

        {/* Boundary Guard Banner */}
        <div className="px-5 py-2.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between text-xs text-slate-600">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-3.5 h-3.5 text-amber-700 shrink-0" />
            <span>
              Boundary Guard: <code className="font-mono">--tree _lilith_safe</code> exits with code
              1/2 on both sync scripts because R2 Data Catalog and AI Search are cross-unit
              surfaces.
            </span>
          </div>
          <span className="font-mono tabular-nums">{filteredR2Items.length} objects</span>
        </div>

        {r2Tab === 'ai-search' ? (
          <div className="overflow-x-auto max-h-[480px]">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="sticky top-0 bg-slate-50 border-b border-slate-200 text-slate-700 font-semibold">
                <tr>
                  <th className="py-2.5 px-4">R2 Object Key</th>
                  <th className="py-2.5 px-4">Content MD5 (ETag)</th>
                  <th className="py-2.5 px-4">x-amz-meta-* Custom Metadata JSON</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 font-mono">
                {filteredR2Items.map((item) => (
                  <tr key={item.key} className="hover:bg-slate-50/80">
                    <td className="py-2.5 px-4">
                      <button
                        type="button"
                        onClick={() => onNavigateConcept(item.conceptId)}
                        className="text-slate-900 underline decoration-slate-300 hover:decoration-slate-900 text-left"
                      >
                        s3://{bundle.r2Preview.bucket}/{item.key}
                      </button>
                    </td>
                    <td className="py-2.5 px-4 text-slate-500 tabular-nums">{item.md5}</td>
                    <td className="py-2.5 px-4 text-slate-700 break-all">
                      {JSON.stringify(item.metadata)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="overflow-x-auto max-h-[480px]">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="sticky top-0 bg-slate-50 border-b border-slate-200 text-slate-700 font-semibold">
                <tr>
                  <th className="py-2.5 px-4">concept_id</th>
                  <th className="py-2.5 px-4">type</th>
                  <th className="py-2.5 px-4">status</th>
                  <th className="py-2.5 px-4">trust_tier</th>
                  <th className="py-2.5 px-4">verified_at</th>
                  <th className="py-2.5 px-4">stale_after</th>
                  <th className="py-2.5 px-4 text-right">body_chars</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 font-mono tabular-nums">
                {filteredR2Items.map((item) => {
                  const r = item.icebergRow;
                  return (
                    <tr key={r.concept_id} className="hover:bg-slate-50/80">
                      <td className="py-2 px-4">
                        <button
                          type="button"
                          onClick={() => onNavigateConcept(r.concept_id)}
                          className="text-slate-900 underline decoration-slate-300 hover:decoration-slate-900 text-left"
                        >
                          {r.concept_id}
                        </button>
                      </td>
                      <td className="py-2 px-4 text-slate-700">{r.type}</td>
                      <td className="py-2 px-4 text-slate-800">{r.status}</td>
                      <td className="py-2 px-4 text-slate-700">{r.trust_tier}</td>
                      <td className="py-2 px-4 text-slate-500">
                        {r.verified_at ? r.verified_at.slice(0, 10) : 'null'}
                      </td>
                      <td className="py-2 px-4 text-slate-500">
                        {r.stale_after ? r.stale_after.slice(0, 10) : 'null'}
                      </td>
                      <td className="py-2 px-4 text-right text-slate-700">
                        {r.bodyChars.toLocaleString()}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

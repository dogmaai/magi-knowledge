import React from 'react';

interface MarkdownViewerProps {
  content: string;
  currentRelPath?: string;
  onNavigateConcept?: (relPathOrConceptId: string) => void;
}

export const MarkdownViewer: React.FC<MarkdownViewerProps> = ({
  content,
  currentRelPath = '',
  onNavigateConcept,
}) => {
  const lines = content.split('\n');
  const elements: React.ReactNode[] = [];

  let i = 0;
  let keyCounter = 0;

  const resolveRelativeTarget = (href: string): string | null => {
    if (href.startsWith('http://') || href.startsWith('https://') || href.startsWith('mailto:')) {
      return null;
    }
    const cleanHref = href.split('#')[0];
    if (!cleanHref) return null;
    if (cleanHref.startsWith('/')) {
      return cleanHref.replace(/^\/+/, '');
    }
    const dirParts = currentRelPath.split('/').slice(0, -1);
    const targetParts = [...dirParts, ...cleanHref.split('/')];
    const resolved: string[] = [];
    for (const part of targetParts) {
      if (!part || part === '.') continue;
      if (part === '..') {
        resolved.pop();
      } else {
        resolved.push(part);
      }
    }
    return resolved.join('/');
  };

  const renderInline = (text: string): React.ReactNode[] => {
    const tokenRegex = /(\*\*[^*]+\*\*|`[^`]+`|\[[^\]]+\]\([^)]+\)|\*[^*\s][^*]*\*)/g;
    const parts = text.split(tokenRegex);
    return parts.map((part, idx) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return (
          <strong key={idx} className="font-semibold text-slate-900">
            {part.slice(2, -2)}
          </strong>
        );
      }
      if (part.startsWith('`') && part.endsWith('`')) {
        return (
          <code
            key={idx}
            className="font-mono text-xs bg-slate-100 text-slate-800 px-1.5 py-0.5 rounded border border-slate-200/80"
          >
            {part.slice(1, -1)}
          </code>
        );
      }
      if (part.startsWith('[') && part.includes('](') && part.endsWith(')')) {
        const splitIdx = part.indexOf('](');
        const label = part.slice(1, splitIdx);
        const href = part.slice(splitIdx + 2, -1);
        const internalTarget = resolveRelativeTarget(href);
        if (internalTarget && onNavigateConcept) {
          return (
            <button
              key={idx}
              type="button"
              onClick={() => onNavigateConcept(internalTarget)}
              className="text-slate-900 underline decoration-slate-400 underline-offset-2 hover:decoration-slate-900 font-medium transition-colors text-left inline"
            >
              {label}
            </button>
          );
        }
        return (
          <a
            key={idx}
            href={href}
            target="_blank"
            rel="noreferrer"
            className="text-slate-900 underline decoration-slate-400 underline-offset-2 hover:decoration-slate-900 font-medium transition-colors"
          >
            {label}
          </a>
        );
      }
      if (part.startsWith('*') && part.endsWith('*') && part.length > 2) {
        return (
          <em key={idx} className="italic text-slate-700">
            {part.slice(1, -1)}
          </em>
        );
      }
      return <React.Fragment key={idx}>{part}</React.Fragment>;
    });
  };

  while (i < lines.length) {
    const line = lines[i];

    if (line.trim().startsWith('```')) {
      const lang = line.trim().slice(3).trim();
      const codeLines: string[] = [];
      i += 1;
      while (i < lines.length && !lines[i].trim().startsWith('```')) {
        codeLines.push(lines[i]);
        i += 1;
      }
      i += 1;
      elements.push(
        <div key={keyCounter++} className="my-4 rounded-lg border border-slate-200 bg-slate-900 text-slate-100 overflow-hidden">
          {lang && (
            <div className="px-3.5 py-1.5 bg-slate-800/80 border-b border-slate-700/80 text-xs font-mono text-slate-400 flex items-center justify-between">
              <span>{lang}</span>
              <span className="tabular-nums">{codeLines.length} lines</span>
            </div>
          )}
          <pre className="p-3.5 text-xs font-mono leading-relaxed overflow-x-auto">
            <code>{codeLines.join('\n')}</code>
          </pre>
        </div>
      );
      continue;
    }

    if (line.trim().startsWith('|') && i + 1 < lines.length && lines[i + 1].trim().startsWith('|')) {
      const tableLines: string[] = [];
      while (i < lines.length && lines[i].trim().startsWith('|')) {
        tableLines.push(lines[i].trim());
        i += 1;
      }
      if (tableLines.length >= 2) {
        const parseRow = (r: string) =>
          r
            .replace(/^\|/, '')
            .replace(/\|$/, '')
            .split('|')
            .map((c) => c.trim());
        const headers = parseRow(tableLines[0]);
        const bodyRows = tableLines.slice(2).map(parseRow);
        elements.push(
          <div key={keyCounter++} className="my-4 overflow-x-auto border border-slate-200 rounded-lg">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-700 font-semibold">
                  {headers.map((h, hIdx) => (
                    <th key={hIdx} className="py-2.5 px-3">
                      {renderInline(h)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white">
                {bodyRows.map((r, rIdx) => (
                  <tr key={rIdx} className="hover:bg-slate-50/80 transition-colors">
                    {r.map((cell, cIdx) => (
                      <td key={cIdx} className="py-2 px-3 text-slate-700 align-top">
                        {renderInline(cell)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
        continue;
      }
    }

    if (line.startsWith('# ')) {
      elements.push(
        <h2 key={keyCounter++} className="text-lg font-semibold text-slate-900 mt-6 mb-2.5 tracking-tight">
          {renderInline(line.slice(2))}
        </h2>
      );
      i += 1;
      continue;
    }
    if (line.startsWith('## ')) {
      elements.push(
        <h3 key={keyCounter++} className="text-base font-semibold text-slate-900 mt-5 mb-2 tracking-tight">
          {renderInline(line.slice(3))}
        </h3>
      );
      i += 1;
      continue;
    }
    if (line.startsWith('### ')) {
      elements.push(
        <h4 key={keyCounter++} className="text-sm font-semibold text-slate-800 mt-4 mb-1.5">
          {renderInline(line.slice(4))}
        </h4>
      );
      i += 1;
      continue;
    }

    if (line.trim().startsWith('>')) {
      const quoteLines: string[] = [];
      while (i < lines.length && lines[i].trim().startsWith('>')) {
        quoteLines.push(lines[i].trim().replace(/^>\s?/, ''));
        i += 1;
      }
      elements.push(
        <blockquote
          key={keyCounter++}
          className="my-3 p-3.5 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-700 leading-relaxed"
        >
          {renderInline(quoteLines.join(' '))}
        </blockquote>
      );
      continue;
    }

    if (/^\s*([*-]|\d+\.)\s+/.test(line)) {
      const listItems: string[] = [];
      while (i < lines.length && /^\s*([*-]|\d+\.)\s+/.test(lines[i])) {
        listItems.push(lines[i].replace(/^\s*([*-]|\d+\.)\s+/, ''));
        i += 1;
      }
      elements.push(
        <ul key={keyCounter++} className="my-2.5 space-y-1.5 pl-4 list-disc text-sm text-slate-700">
          {listItems.map((item, idx) => (
            <li key={idx} className="leading-relaxed">
              {renderInline(item)}
            </li>
          ))}
        </ul>
      );
      continue;
    }

    if (!line.trim()) {
      i += 1;
      continue;
    }

    const paraLines: string[] = [];
    while (
      i < lines.length &&
      lines[i].trim() !== '' &&
      !lines[i].startsWith('#') &&
      !lines[i].trim().startsWith('```') &&
      !lines[i].trim().startsWith('|') &&
      !lines[i].trim().startsWith('>') &&
      !/^\s*([*-]|\d+\.)\s+/.test(lines[i])
    ) {
      paraLines.push(lines[i].trim());
      i += 1;
    }
    elements.push(
      <p key={keyCounter++} className="my-2.5 text-sm text-slate-700 leading-relaxed max-w-[75ch]">
        {renderInline(paraLines.join(' '))}
      </p>
    );
  }

  return <div className="space-y-1">{elements}</div>;
};

import { useEffect, useState } from 'react';
import ReactMarkdown from 'react-markdown';

interface ClaudeMdPreviewProps {
  refreshTrigger: number;
}

export default function ClaudeMdPreview({ refreshTrigger }: ClaudeMdPreviewProps) {
  const [content, setContent] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadClaudeMd();
  }, [refreshTrigger]);

  const loadClaudeMd = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/source/claude-md');
      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to load CLAUDE.md');
      }

      setContent(data.data.content);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-full flex flex-col bg-gradient-to-b from-slate-950 to-slate-900 border border-cyan-500/20 rounded-lg overflow-hidden">
      <div className="p-4 border-b border-cyan-500/30 bg-cyan-500/5 flex items-center justify-between">
        <h2 className="text-sm font-black text-cyan-400 font-mono uppercase tracking-wider">
          CLAUDE.md 预览
        </h2>
        <span className="text-xs font-bold text-orange-400 font-mono bg-orange-900/20 px-2 py-1 rounded border border-orange-500/30">
          只读
        </span>
      </div>

      <div className="flex-1 overflow-y-auto preview-scrollbar">
        {loading && (
          <div className="flex flex-col items-center justify-center h-full text-slate-400">
            <div className="w-8 h-8 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin mb-3"></div>
            <span className="text-sm font-mono">加载预览中...</span>
          </div>
        )}

        {error && (
          <div className="flex flex-col items-center justify-center h-full text-center p-8">
            <span className="text-4xl mb-3">⚠️</span>
            <p className="text-red-400 font-mono text-sm mb-4">{error}</p>
            <button
              onClick={loadClaudeMd}
              className="border-2 border-red-500 hover:bg-red-500/20 text-red-400 font-mono font-bold py-2 px-4 rounded transition-colors"
            >
              重试
            </button>
          </div>
        )}

        {!loading && !error && (
          <div className="p-6 preview-content">
            <ReactMarkdown>{content}</ReactMarkdown>
          </div>
        )}
      </div>

      <style>{`
        /* Custom scrollbar for preview */
        .preview-scrollbar::-webkit-scrollbar {
          width: 8px;
        }

        .preview-scrollbar::-webkit-scrollbar-track {
          background: rgba(6, 182, 212, 0.05);
        }

        .preview-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(6, 182, 212, 0.2);
          border-radius: 4px;
        }

        .preview-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(6, 182, 212, 0.3);
        }

        /* Markdown preview styling - Cyan theme */
        .preview-content h1 {
          color: #22d3ee;
          font-weight: 900;
          border-bottom: 2px solid rgba(34, 211, 238, 0.3);
          padding-bottom: 0.5rem;
          font-family: 'JetBrains Mono', monospace;
          margin-top: 2rem;
          margin-bottom: 1rem;
          font-size: 1.5rem;
        }

        .preview-content h2 {
          color: #22d3ee;
          font-weight: 800;
          border-bottom: 1px solid rgba(34, 211, 238, 0.2);
          padding-bottom: 0.375rem;
          font-family: 'JetBrains Mono', monospace;
          margin-top: 1.5rem;
          margin-bottom: 0.75rem;
          font-size: 1.25rem;
        }

        .preview-content h3 {
          color: #67e8f9;
          font-weight: 700;
          font-family: 'JetBrains Mono', monospace;
          margin-top: 1.25rem;
          margin-bottom: 0.5rem;
          font-size: 1.1rem;
        }

        .preview-content h4 {
          color: #67e8f9;
          font-weight: 700;
          font-family: 'JetBrains Mono', monospace;
          margin-top: 1rem;
          margin-bottom: 0.5rem;
          font-size: 1rem;
        }

        .preview-content p {
          color: #cbd5e1;
          margin-bottom: 1rem;
          line-height: 1.7;
        }

        .preview-content code {
          background: rgba(251, 146, 60, 0.1);
          color: #fb923c;
          padding: 0.2rem 0.4rem;
          border-radius: 0.25rem;
          font-family: 'JetBrains Mono', monospace;
          font-size: 0.875rem;
        }

        .preview-content pre {
          background: rgba(15, 23, 42, 0.8);
          border: 1px solid rgba(34, 211, 238, 0.2);
          border-radius: 0.5rem;
          padding: 1rem;
          overflow-x: auto;
          margin: 1rem 0;
        }

        .preview-content pre code {
          background: none;
          padding: 0;
          color: #e2e8f0;
        }

        .preview-content ul,
        .preview-content ol {
          color: #cbd5e1;
          margin-bottom: 1rem;
          padding-left: 2rem;
        }

        .preview-content li {
          margin-bottom: 0.5rem;
        }

        .preview-content li::marker {
          color: #22d3ee;
        }

        .preview-content a {
          color: #60a5fa;
          text-decoration: underline;
        }

        .preview-content a:hover {
          color: #22d3ee;
        }

        .preview-content blockquote {
          border-left: 3px solid rgba(34, 211, 238, 0.4);
          padding-left: 1rem;
          margin: 1rem 0;
          color: #94a3b8;
          font-style: italic;
        }

        .preview-content hr {
          border: none;
          border-top: 1px solid rgba(34, 211, 238, 0.2);
          margin: 2rem 0;
        }

        .preview-content table {
          width: 100%;
          border-collapse: collapse;
          margin: 1rem 0;
        }

        .preview-content th,
        .preview-content td {
          border: 1px solid rgba(34, 211, 238, 0.2);
          padding: 0.5rem;
          text-align: left;
        }

        .preview-content th {
          background: rgba(34, 211, 238, 0.1);
          color: #22d3ee;
          font-weight: 600;
        }

        .preview-content strong {
          color: #e2e8f0;
          font-weight: 700;
        }

        .preview-content em {
          color: #94a3b8;
          font-style: italic;
        }
      `}</style>
    </div>
  );
}

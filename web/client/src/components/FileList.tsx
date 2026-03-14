import { useEffect, useState } from 'react';

interface FileListProps {
  selectedFile: string | null;
  onFileSelect: (filename: string) => void;
}

export default function FileList({ selectedFile, onFileSelect }: FileListProps) {
  const [files, setFiles] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadFiles();
  }, []);

  const loadFiles = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/source/files');
      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to load files');
      }

      setFiles(data.data);

      // Auto-select first file if none selected
      if (!selectedFile && data.data.length > 0) {
        onFileSelect(data.data[0]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="border-4 border-slate-700 bg-slate-900 h-full">
        <div className="p-4 border-b-2 border-slate-700">
          <h2 className="text-sm font-black text-amber-500 font-mono uppercase tracking-wider">源文件列表</h2>
        </div>
        <div className="flex flex-col items-center justify-center p-8 text-slate-400">
          <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin mb-3"></div>
          <span className="text-sm font-mono">加载文件中...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="border-4 border-red-500 bg-slate-900 h-full">
        <div className="p-4 border-b-2 border-red-500">
          <h2 className="text-sm font-black text-amber-500 font-mono uppercase tracking-wider">源文件列表</h2>
        </div>
        <div className="flex flex-col items-center justify-center p-8 text-center">
          <span className="text-4xl mb-3">⚠️</span>
          <p className="text-red-400 font-mono text-sm mb-4">{error}</p>
          <button
            onClick={loadFiles}
            className="border-2 border-red-500 hover:bg-red-500/20 text-red-400 font-mono font-bold py-2 px-4 transition-colors"
          >
            重试
          </button>
        </div>
      </div>
    );
  }

  if (files.length === 0) {
    return (
      <div className="border-4 border-slate-700 bg-slate-900 h-full">
        <div className="p-4 border-b-2 border-slate-700">
          <h2 className="text-sm font-black text-amber-500 font-mono uppercase tracking-wider">源文件列表</h2>
        </div>
        <div className="flex flex-col items-center justify-center p-8">
          <span className="text-4xl mb-3 opacity-50">📄</span>
          <p className="text-slate-500 font-mono text-sm">暂无配置文件</p>
        </div>
      </div>
    );
  }

  return (
    <div className="border-4 border-slate-700 bg-slate-900 h-full flex flex-col">
      <div className="p-4 border-b-2 border-slate-700 flex items-center justify-between">
        <h2 className="text-sm font-black text-amber-500 font-mono uppercase tracking-wider">源文件</h2>
        <span className="text-xs text-slate-500 font-mono bg-slate-800 px-2 py-1 rounded">{files.length}</span>
      </div>

      <div className="flex-1 overflow-y-auto">
        {files.map((filename) => (
          <button
            key={filename}
            onClick={() => onFileSelect(filename)}
            className={`w-full text-left px-4 py-3 font-mono text-sm transition-colors border-l-4 ${
              selectedFile === filename
                ? 'border-amber-500 bg-amber-500/10 text-amber-500 font-bold'
                : 'border-transparent hover:bg-slate-800 text-slate-300 hover:border-slate-600'
            }`}
          >
            <div className="flex items-center gap-2">
              <span className="opacity-60">📝</span>
              <span>{filename}</span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

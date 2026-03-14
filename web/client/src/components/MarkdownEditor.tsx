import MDEditor from '@uiw/react-md-editor';

interface MarkdownEditorProps {
  filename: string | null;
  content: string;
  onChange: (value: string) => void;
  isDirty: boolean;
}

export default function MarkdownEditor({
  filename,
  content,
  onChange,
  isDirty,
}: MarkdownEditorProps) {
  if (!filename) {
    return (
      <div className="h-full flex flex-col items-center justify-center bg-slate-900 text-slate-500">
        <span className="text-6xl mb-4 opacity-30">✏️</span>
        <h3 className="text-lg font-bold font-mono mb-2">未选择文件</h3>
        <p className="text-sm">从列表中选择一个文件开始编辑</p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-slate-900" data-color-mode="dark">
      <div className="p-4 border-b-2 border-slate-700 bg-slate-900">
        <div className="flex items-center gap-3">
          <span className="text-lg">📝</span>
          <span className="font-mono font-bold text-slate-200">{filename}</span>
          {isDirty && (
            <span className="text-amber-500 text-xs animate-pulse" title="有未保存的修改">
              ● 未保存
            </span>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-hidden">
        <MDEditor
          value={content}
          onChange={(val) => onChange(val || '')}
          height="100%"
          preview="edit"
          hideToolbar={false}
          enableScroll={true}
          visibleDragbar={false}
        />
      </div>

      <style>{`
        /* MD Editor dark theme overrides */
        .w-md-editor {
          background-color: #0f172a !important;
          color: #e2e8f0 !important;
          border: none !important;
          box-shadow: none !important;
        }

        .w-md-editor-toolbar {
          background-color: #1e293b !important;
          border-bottom: 1px solid #334155 !important;
          padding: 0.5rem !important;
        }

        .w-md-editor-toolbar button {
          color: #94a3b8 !important;
        }

        .w-md-editor-toolbar button:hover {
          color: #f59e0b !important;
          background-color: rgba(245, 158, 11, 0.1) !important;
        }

        .w-md-editor-toolbar button.active {
          color: #f59e0b !important;
          background-color: rgba(245, 158, 11, 0.15) !important;
        }

        .w-md-editor-content {
          background-color: #0f172a !important;
        }

        .w-md-editor-text,
        .w-md-editor-text-pre,
        .w-md-editor-text-input {
          color: #e2e8f0 !important;
        }

        .w-md-editor-text-pre > code,
        .w-md-editor-text-input {
          color: #e2e8f0 !important;
        }

        /* Scrollbar */
        .w-md-editor ::-webkit-scrollbar {
          width: 8px;
          height: 8px;
        }

        .w-md-editor ::-webkit-scrollbar-track {
          background: #1e293b;
        }

        .w-md-editor ::-webkit-scrollbar-thumb {
          background: #475569;
          border-radius: 4px;
        }

        .w-md-editor ::-webkit-scrollbar-thumb:hover {
          background: #64748b;
        }
      `}</style>
    </div>
  );
}

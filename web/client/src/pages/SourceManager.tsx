import { useState, useEffect } from 'react';
import FileList from '../components/FileList';
import MarkdownEditor from '../components/MarkdownEditor';
import ClaudeMdPreview from '../components/ClaudeMdPreview';

export default function SourceManager() {
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [fileContent, setFileContent] = useState<string>('');
  const [originalContent, setOriginalContent] = useState<string>('');
  const [isDirty, setIsDirty] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [previewRefreshTrigger, setPreviewRefreshTrigger] = useState(0);

  // Load file content when selection changes
  useEffect(() => {
    if (selectedFile) {
      loadFileContent(selectedFile);
    }
  }, [selectedFile]);

  // Track dirty state
  useEffect(() => {
    setIsDirty(fileContent !== originalContent);
  }, [fileContent, originalContent]);

  // Warn before leaving with unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isDirty]);

  const loadFileContent = async (filename: string) => {
    try {
      const response = await fetch(`/api/source/files/${filename}`);
      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to load file');
      }

      const content = data.data.content;
      setFileContent(content);
      setOriginalContent(content);
      setIsDirty(false);
      setSaveError(null);
    } catch (err) {
      console.error('Failed to load file:', err);
      setSaveError(err instanceof Error ? err.message : 'Unknown error');
    }
  };

  const handleFileSelect = (filename: string) => {
    if (isDirty) {
      const confirmed = window.confirm(
        '当前文件有未保存的修改，是否放弃修改？\n\nUnsaved changes will be lost.'
      );
      if (!confirmed) {
        return;
      }
    }

    setSelectedFile(filename);
  };

  const handleSave = async () => {
    if (!selectedFile || !isDirty) return;

    try {
      setIsSaving(true);
      setSaveError(null);

      const response = await fetch(`/api/source/files/${selectedFile}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ content: fileContent }),
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to save file');
      }

      // Update original content to match current
      setOriginalContent(fileContent);
      setIsDirty(false);

      // Trigger preview refresh
      setPreviewRefreshTrigger((prev) => prev + 1);

      console.log('✓ File saved and CLAUDE.md regenerated');
    } catch (err) {
      console.error('Failed to save file:', err);
      setSaveError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      {/* Main Content */}
      <main className="px-6 py-8 h-[calc(100vh-5rem)]">
        <div className="flex gap-6 h-full">
          {/* Left: File List - Fixed Width */}
          <div className="w-64 flex-shrink-0">
            <FileList selectedFile={selectedFile} onFileSelect={handleFileSelect} />
          </div>

          {/* Center: Editor - Flex 1 */}
          <div className="flex-1 flex flex-col gap-4 min-w-0">
            <div className="border-4 border-slate-700 bg-slate-900 flex-1 overflow-hidden">
              <MarkdownEditor
                filename={selectedFile}
                content={fileContent}
                onChange={setFileContent}
                isDirty={isDirty}
              />
            </div>

            {/* Save Bar */}
            {selectedFile && (
              <div className={`border-4 ${isDirty ? 'border-amber-500' : 'border-slate-700'} bg-slate-900 p-4 transition-colors`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {isDirty ? (
                      <>
                        <span className="text-amber-500 text-sm animate-pulse">●</span>
                        <span className="text-sm font-mono text-slate-300">有未保存的修改</span>
                      </>
                    ) : (
                      <>
                        <span className="text-green-500 text-sm">✓</span>
                        <span className="text-sm font-mono text-slate-500">所有修改已保存</span>
                      </>
                    )}
                  </div>

                  {saveError && (
                    <div className="text-red-400 text-sm font-mono">
                      ⚠️ {saveError}
                    </div>
                  )}

                  <button
                    onClick={handleSave}
                    disabled={!isDirty || isSaving}
                    className="border-2 border-amber-500 bg-amber-500/10 hover:bg-amber-500/20 text-amber-500 font-mono font-bold py-2 px-6 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    {isSaving ? (
                      <>
                        <div className="w-4 h-4 border-2 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
                        保存中...
                      </>
                    ) : (
                      <>
                        <span>💾</span>
                        保存并重新生成
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Right: Preview - Larger Width */}
          <div className="w-[480px] flex-shrink-0">
            <ClaudeMdPreview refreshTrigger={previewRefreshTrigger} />
          </div>
        </div>
      </main>
    </>
  );
}

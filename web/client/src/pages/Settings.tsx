export default function Settings() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      {/* Header */}
      <header className="border-b-4 border-amber-500 bg-slate-900 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <h1 className="text-3xl font-black text-amber-500 tracking-tight" style={{ fontFamily: 'Archivo Black, sans-serif' }}>
            SYSTEM SETTINGS
          </h1>
          <p className="text-sm text-slate-400 font-mono mt-1">Configure scheduler, LLM, and notifications</p>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="border-4 border-slate-700 bg-slate-900 p-12 text-center">
          <div className="text-6xl mb-4">⚙️</div>
          <h2 className="text-2xl font-black text-slate-300 mb-2" style={{ fontFamily: 'Archivo Black, sans-serif' }}>
            SETTINGS PAGE
          </h2>
          <p className="text-slate-400 font-mono">
            Configuration interface coming soon.
          </p>
          <button
            onClick={() => window.location.href = '/'}
            className="mt-6 border-2 border-slate-600 hover:border-slate-400 text-slate-300 hover:text-slate-100 font-mono font-bold py-3 px-6 transition-colors"
          >
            ← BACK TO DASHBOARD
          </button>
        </div>
      </main>
    </div>
  );
}

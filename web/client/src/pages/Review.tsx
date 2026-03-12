export default function Review() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      {/* Header */}
      <header className="border-b-4 border-amber-500 bg-slate-900 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <h1 className="text-3xl font-black text-amber-500 tracking-tight" style={{ fontFamily: 'Archivo Black, sans-serif' }}>
            REVIEW SUGGESTIONS
          </h1>
          <p className="text-sm text-slate-400 font-mono mt-1">Approve or reject pending suggestions</p>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="border-4 border-amber-500 bg-slate-900 p-12 text-center">
          <div className="text-6xl mb-4">📋</div>
          <h2 className="text-2xl font-black text-amber-500 mb-2" style={{ fontFamily: 'Archivo Black, sans-serif' }}>
            REVIEW PAGE
          </h2>
          <p className="text-slate-400 font-mono">
            This page will display pending suggestions for review.
          </p>
          <button
            onClick={() => window.location.href = '/'}
            className="mt-6 border-2 border-amber-500 bg-amber-500/10 hover:bg-amber-500/20 text-amber-500 font-mono font-bold py-3 px-6 transition-colors"
          >
            ← BACK TO DASHBOARD
          </button>
        </div>
      </main>
    </div>
  );
}

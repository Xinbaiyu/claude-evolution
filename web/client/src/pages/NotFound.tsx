import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <main className="max-w-7xl mx-auto px-6 py-24 text-center">
      <div className="text-8xl font-black text-amber-500/20 mb-4" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
        404
      </div>
      <h2 className="text-2xl font-black text-amber-500 mb-4" style={{ fontFamily: '"Noto Sans SC", "Archivo Black", sans-serif' }}>
        页面不存在
      </h2>
      <p className="text-slate-400 font-mono mb-8">
        您访问的页面不存在或已被移除
      </p>
      <Link
        to="/"
        className="inline-block border-2 border-amber-500 bg-amber-500/10 hover:bg-amber-500/20 text-amber-500 font-mono font-bold py-3 px-6 transition-colors"
      >
        返回控制台
      </Link>
    </main>
  );
}

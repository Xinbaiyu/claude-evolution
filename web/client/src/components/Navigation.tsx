interface NavigationProps {
  currentPage: 'dashboard' | 'learning-review' | 'source-manager' | 'settings' | 'analysis-logs';
}

export default function Navigation({ currentPage }: NavigationProps) {
  const navItems = [
    { id: 'dashboard', label: '控制台', href: '/' },
    { id: 'learning-review', label: '学习观察', href: '/learning-review' },
    { id: 'analysis-logs', label: '分析日志', href: '/analysis-logs' },
    { id: 'source-manager', label: '配置编辑', href: '/source-manager' },
    { id: 'settings', label: '系统设置', href: '/settings' },
  ];

  return (
    <nav className="flex gap-2">
      {navItems.map((item) => (
        <a
          key={item.id}
          href={item.href}
          className={`px-4 py-2 font-mono font-semibold rounded transition-colors border ${
            currentPage === item.id
              ? 'text-amber-500 bg-amber-500/10 border-amber-500/30'
              : 'text-slate-400 hover:text-amber-500 hover:bg-amber-500/10 border-transparent hover:border-amber-500/30'
          }`}
        >
          {item.label}
        </a>
      ))}
    </nav>
  );
}

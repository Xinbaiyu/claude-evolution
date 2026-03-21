import { NavLink } from 'react-router-dom';

const navItems = [
  { label: '控制台', to: '/' },
  { label: '学习观察', to: '/learning-review' },
  { label: '分析日志', to: '/analysis-logs' },
  { label: '配置编辑', to: '/source-manager' },
  { label: '系统设置', to: '/settings' },
];

export default function Navigation() {
  return (
    <nav className="flex gap-2">
      {navItems.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.to === '/'}
          className={({ isActive }) =>
            `px-4 py-2 font-mono font-semibold rounded transition-colors border ${
              isActive
                ? 'text-amber-500 bg-amber-500/10 border-amber-500/30'
                : 'text-slate-400 hover:text-amber-500 hover:bg-amber-500/10 border-transparent hover:border-amber-500/30'
            }`
          }
        >
          {item.label}
        </NavLink>
      ))}
    </nav>
  );
}

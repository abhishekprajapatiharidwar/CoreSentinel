import Sidebar from './Sidebar';
import Titlebar from './Titlebar';
import { useAppStore } from '../../store/appStore';
import { useShallow } from 'zustand/shallow';

export default function Layout({ children }) {
  const { sidebarCollapsed, compactMode } = useAppStore(useShallow(s => ({
    sidebarCollapsed: s.sidebarCollapsed,
    compactMode: s.compactMode,
  })));

  // In compact mode, sidebar is always collapsed
  const effectiveCollapsed = sidebarCollapsed || compactMode;

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: 'var(--bg-primary)' }}>
      <Sidebar />
      <div
        className="flex flex-col flex-1 overflow-hidden transition-all duration-300"
        style={{ marginLeft: effectiveCollapsed ? '56px' : '220px' }}
      >
        <Titlebar />
        <main
          className="flex-1 overflow-auto transition-all duration-200"
          style={{ padding: compactMode ? '6px' : '16px' }}
        >
          {children}
        </main>
      </div>
    </div>
  );
}

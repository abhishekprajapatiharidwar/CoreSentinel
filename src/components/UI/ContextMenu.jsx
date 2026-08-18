import { useEffect, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useAppStore } from '../../store/appStore';
import { useShallow } from 'zustand/shallow';

export default function ContextMenu() {
  const { contextMenu, closeContextMenu } = useAppStore(useShallow(s => ({
    contextMenu: s.contextMenu,
    closeContextMenu: s.closeContextMenu,
  })));
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) {
        closeContextMenu();
      }
    };
    document.addEventListener('mousedown', handler);
    document.addEventListener('contextmenu', handler);
    return () => {
      document.removeEventListener('mousedown', handler);
      document.removeEventListener('contextmenu', handler);
    };
  }, [closeContextMenu]);

  return (
    <AnimatePresence>
      {contextMenu && (
        <motion.div
          ref={ref}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.1 }}
          className="context-menu fixed"
          style={{ left: contextMenu.x, top: contextMenu.y }}
        >
          {contextMenu.items.map((item, i) => (
            item.separator ? (
              <div key={i} className="context-menu-separator" />
            ) : (
              <div
                key={i}
                className={`context-menu-item ${item.danger ? 'danger' : ''}`}
                onClick={() => {
                  item.onClick?.();
                  closeContextMenu();
                }}
              >
                {item.icon && <span className="flex-shrink-0">{item.icon}</span>}
                <span>{item.label}</span>
                {item.shortcut && (
                  <span className="ml-auto text-[10px]" style={{ color: '#64748b' }}>{item.shortcut}</span>
                )}
              </div>
            )
          ))}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

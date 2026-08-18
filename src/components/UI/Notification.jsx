import { AnimatePresence, motion } from 'framer-motion';
import { CheckCircle, AlertTriangle, XCircle, Info, X } from 'lucide-react';
import { useAppStore } from '../../store/appStore';

const ICONS = {
  success: <CheckCircle size={16} color="#10b981" />,
  warning: <AlertTriangle size={16} color="#f59e0b" />,
  error: <XCircle size={16} color="#ef4444" />,
  info: <Info size={16} color="#3b82f6" />,
};

const COLORS = {
  success: 'rgba(16, 185, 129, 0.15)',
  warning: 'rgba(245, 158, 11, 0.15)',
  error: 'rgba(239, 68, 68, 0.15)',
  info: 'rgba(59, 130, 246, 0.15)',
};

export default function Notification() {
  const notification = useAppStore(s => s.notification);

  return (
    <AnimatePresence>
      {notification && (
        <motion.div
          key={notification.id}
          initial={{ opacity: 0, y: 40, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 10, scale: 0.95 }}
          className="fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-lg"
          style={{
            background: COLORS[notification.type] || COLORS.info,
            border: '1px solid rgba(255,255,255,0.12)',
            backdropFilter: 'blur(12px)',
            boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
            maxWidth: '360px',
          }}
        >
          {ICONS[notification.type] || ICONS.info}
          <span className="text-sm" style={{ color: '#e2e8f0' }}>{notification.msg}</span>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

import { useAppStore } from '../store/appStore';

export function useSystemStats() {
  return useAppStore(s => s.systemStats);
}

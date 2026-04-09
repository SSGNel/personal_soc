import { create } from 'zustand';
import type { ProcessRecord, Alert, StartupEntry, SystemOverview } from '@/types';

export type ProcessSortKey = 'name' | 'pid' | 'risk_score' | 'current_status' | 'last_seen_at' | 'signer_status' | 'first_seen_at';

interface AppStore {
  // Data
  overview: SystemOverview | null;
  processes: ProcessRecord[];
  alerts: Alert[];
  startupEntries: StartupEntry[];

  // UI state
  selectedProcessId: string | null;
  isMonitoringPaused: boolean;

  // Persistent process list filter state
  processSearch: string;
  processSortKey: ProcessSortKey;
  processSortAsc: boolean;
  processStatusFilter: string;

  // Setters
  setOverview: (overview: SystemOverview) => void;
  setProcesses: (processes: ProcessRecord[]) => void;
  removeProcess: (id: string) => void;
  removeProcesses: (ids: string[]) => void;
  setAlerts: (alerts: Alert[]) => void;
  setStartupEntries: (entries: StartupEntry[]) => void;
  removeStartupEntry: (id: string) => void;
  setSelectedProcessId: (id: string | null) => void;
  setMonitoringPaused: (paused: boolean) => void;
  setProcessSearch: (q: string) => void;
  setProcessSort: (key: ProcessSortKey, asc: boolean) => void;
  setProcessStatusFilter: (f: string) => void;

  // Derived
  getProcessById: (id: string) => ProcessRecord | undefined;
  getAlertsForProcess: (processId: string) => Alert[];
}

export const useAppStore = create<AppStore>((set, get) => ({
  overview: null,
  processes: [],
  alerts: [],
  startupEntries: [],
  selectedProcessId: null,
  isMonitoringPaused: false,

  processSearch: '',
  processSortKey: 'first_seen_at',
  processSortAsc: false,
  processStatusFilter: '',

  setOverview: (overview) => set({ overview }),
  setProcesses: (processes) => set({ processes }),
  removeProcess: (id) => set((s) => ({ processes: s.processes.filter(p => p.id !== id) })),
  removeProcesses: (ids) => set((s) => ({ processes: s.processes.filter(p => !ids.includes(p.id)) })),
  setAlerts: (alerts) => set({ alerts }),
  setStartupEntries: (entries) => set({ startupEntries: entries }),
  removeStartupEntry: (id) => set((s) => ({ startupEntries: s.startupEntries.filter(e => e.id !== id) })),
  setSelectedProcessId: (id) => set({ selectedProcessId: id }),
  setMonitoringPaused: (paused) => set({ isMonitoringPaused: paused }),
  setProcessSearch: (q) => set({ processSearch: q }),
  setProcessSort: (key, asc) => set({ processSortKey: key, processSortAsc: asc }),
  setProcessStatusFilter: (f) => set({ processStatusFilter: f }),

  getProcessById: (id) => get().processes.find(p => p.id === id),
  getAlertsForProcess: (processId) => get().alerts.filter(a => a.process_id === processId),
}));

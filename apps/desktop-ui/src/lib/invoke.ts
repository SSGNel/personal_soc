import { invoke } from '@tauri-apps/api/core';
import type { ProcessRecord, ProcessMetric, Alert, StartupEntry, SystemOverview, ActivityEvent } from '@/types';

const HTTP_BACKEND_URL = 'http://127.0.0.1:3420/api';
const isTauriAvailable = typeof window !== 'undefined' && (window as any).__TAURI__ !== undefined;

async function fetchBackend<T>(path: string, options: RequestInit = {}): Promise<T> {
  const init: RequestInit = {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string> | undefined),
    },
  };

  const response = await fetch(`${HTTP_BACKEND_URL}${path}`, init);
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`HTTP backend error ${response.status}: ${body}`);
  }
  return response.json();
}

async function invokeOrFetch<T>(
  cmd: string,
  args: Record<string, unknown> | undefined,
  path: string,
  options?: RequestInit,
): Promise<T> {
  if (isTauriAvailable) {
    try {
      return await invoke<T>(cmd, args);
    } catch (error) {
      console.warn('Tauri invoke failed, falling back to HTTP backend', error);
    }
  }
  return fetchBackend<T>(path, options);
}

export async function getSystemOverview(): Promise<SystemOverview> {
  return invoke('get_system_overview');
}

export async function listProcesses(): Promise<ProcessRecord[]> {
  return invoke('list_processes');
}

export async function listProcessesPaged(
  search: string,
  statusFilter: string,
  sortKey: string,
  sortAsc: boolean,
  limit: number,
  offset: number,
): Promise<{ processes: ProcessRecord[]; total: number }> {
  return invoke('list_processes_paged', { search, statusFilter, sortKey, sortAsc, limit, offset });
}

export async function getProcessDetails(processId: string): Promise<ProcessRecord | null> {
  return invoke('get_process_details', { processId });
}

export async function getProcessMetrics(processId: string, limit?: number): Promise<ProcessMetric[]> {
  return invoke('get_process_metrics', { processId, limit });
}

export async function listAlerts(limit?: number): Promise<Alert[]> {
  return invoke('list_alerts', { limit });
}

export async function updateAlertStatus(alertId: string, status: string): Promise<void> {
  return invoke('update_alert_status', { alertId, status });
}

export async function killProcess(pid: number, processId: string): Promise<void> {
  return invoke('kill_process', { pid, processId });
}

export async function trustProcess(processId: string, ruleType: string, value: string): Promise<void> {
  return invoke('trust_process', { processId, ruleType, value });
}

export async function listStartupEntries(): Promise<StartupEntry[]> {
  return invoke('list_startup_entries');
}

export async function removeStartupEntry(entryId: string, name: string, locationType: string): Promise<void> {
  return invoke('remove_startup_entry', { entryId, name, locationType });
}

export async function askAiAboutProcess(
  processId: string,
  question: string,
): Promise<string> {
  return invoke('ask_ai_about_process', { processId, question });
}

export async function pauseMonitoring(): Promise<void> {
  return invoke('pause_monitoring');
}

export async function resumeMonitoring(): Promise<void> {
  return invoke('resume_monitoring');
}

export async function getSetting(key: string): Promise<string | null> {
  return invoke('get_setting', { key });
}

export async function saveSetting(key: string, value: string): Promise<void> {
  return invoke('save_setting', { key, value });
}

export async function runCleanupNow(hours: number): Promise<number> {
  return invoke('run_cleanup_now', { hours });
}

export async function listActivityEvents(limit?: number): Promise<ActivityEvent[]> {
  return invoke('list_activity_events', { limit });
}

export async function listActivityEventsPaged(
  limit: number,
  offset: number,
): Promise<{ events: ActivityEvent[]; total: number }> {
  return invoke('list_activity_events_paged', { limit, offset });
}

export async function askAi(question: string): Promise<string> {
  return invoke('ask_ai', { question });
}

// Password Manager commands
export async function saveCredential(
  site: string,
  username: string,
  passwordEncrypted: string,
): Promise<string> {
  return invokeOrFetch<string>(
    'save_credential',
    { site, username, passwordEncrypted },
    '/credentials',
    {
      method: 'POST',
      body: JSON.stringify({ site, username, password: passwordEncrypted }),
    },
  );
}

export async function listCredentials(): Promise<
  Array<{ id: string; site: string; username: string }>
> {
  return invokeOrFetch('list_credentials', undefined, '/credentials', { method: 'GET' });
}

export async function getCredentialsForDomain(
  site: string,
): Promise<Array<{ id: string; username: string; passwordEncrypted: string }>> {
  return invokeOrFetch(
    'get_credentials_for_domain',
    { site },
    `/credentials?site=${encodeURIComponent(site)}`,
    { method: 'GET' },
  );
}

export async function deleteCredential(id: string): Promise<void> {
  await invokeOrFetch('delete_credential', { id }, `/credentials/${encodeURIComponent(id)}`, { method: 'DELETE' });
}

export async function updateAutofillTimestamp(id: string): Promise<void> {
  await invokeOrFetch('update_autofill_timestamp', { id }, `/credentials/${encodeURIComponent(id)}/autofill`, { method: 'POST' });
}


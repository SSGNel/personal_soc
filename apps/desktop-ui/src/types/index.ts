export type SignerStatus = 'Signed' | 'Unsigned' | 'InvalidSignature' | 'Unknown';
export type PathCategory = 'System' | 'ProgramFiles' | 'UserWritable' | 'Temp' | 'Downloads' | 'AppData' | 'Unknown';
export type ProcessStatus = 'Running' | 'Terminated' | 'Suspicious' | 'Trusted';
export type Severity = 'info' | 'low' | 'medium' | 'high';
export type AlertStatus = 'open' | 'acknowledged' | 'ignored' | 'resolved';

export interface TriggeredRule {
  rule_key: string;
  explanation: string;
  evidence: Record<string, unknown>;
  weight: number;
}

export interface ProcessRecord {
  id: string;
  pid: number;
  parent_pid: number | null;
  name: string;
  exe_path: string | null;
  command_line: string | null;
  signer_status: SignerStatus;
  file_hash: string | null;
  first_seen_at: string;
  last_seen_at: string;
  user_name: string | null;
  integrity_level: string | null;
  current_status: ProcessStatus;
  risk_score: number;
  path_category: PathCategory;
}

export interface ProcessMetric {
  id: string;
  process_id: string;
  timestamp: string;
  cpu_percent: number;
  memory_bytes: number;
  network_bytes_sent: number;
  network_bytes_received: number;
}

export interface Alert {
  id: string;
  process_id: string;
  timestamp: string;
  severity: Severity;
  title: string;
  summary: string;
  status: AlertStatus;
  risk_score: number;
  triggered_rules: TriggeredRule[];
}

export interface StartupEntry {
  id: string;
  name: string;
  path: string;
  location_type: string;
  signer_status: SignerStatus;
  first_seen_at: string;
  last_seen_at: string;
  enabled: boolean;
  is_new: boolean;
}

export interface ActivityEvent {
  event_type: 'process_created' | 'process_terminated' | 'alert' | 'startup' | 'user_action';
  id: string;
  timestamp: string;
  title: string;
  description: string;
  severity: 'info' | 'low' | 'medium' | 'high';
  related_id: string | null;
}

export interface SystemOverview {
  health_score: number;
  active_alerts_count: number;
  suspicious_processes_count: number;
  startup_changes_count: number;
  monitored_processes_count: number;
  cpu_usage: number;
  memory_usage: number;
  timestamp: string;
}

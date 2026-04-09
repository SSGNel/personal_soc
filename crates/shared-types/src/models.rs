use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum SignerStatus {
    Signed,
    Unsigned,
    InvalidSignature,
    Unknown,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum PathCategory {
    System,
    ProgramFiles,
    UserWritable,
    Temp,
    Downloads,
    AppData,
    Unknown,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum ProcessStatus {
    Running,
    Terminated,
    Suspicious,
    Trusted,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "snake_case")]
pub enum Severity {
    Info,
    Low,
    Medium,
    High,
}

impl Severity {
    pub fn from_score(score: u32) -> Self {
        match score {
            0..=24 => Severity::Info,
            25..=49 => Severity::Low,
            50..=74 => Severity::Medium,
            _ => Severity::High,
        }
    }

    pub fn as_str(&self) -> &'static str {
        match self {
            Severity::Info => "info",
            Severity::Low => "low",
            Severity::Medium => "medium",
            Severity::High => "high",
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProcessRecord {
    pub id: String,
    pub pid: u32,
    pub parent_pid: Option<u32>,
    pub name: String,
    pub exe_path: Option<String>,
    pub command_line: Option<String>,
    pub signer_status: SignerStatus,
    pub file_hash: Option<String>,
    pub first_seen_at: DateTime<Utc>,
    pub last_seen_at: DateTime<Utc>,
    pub user_name: Option<String>,
    pub integrity_level: Option<String>,
    pub current_status: ProcessStatus,
    pub risk_score: u32,
    pub path_category: PathCategory,
}

impl ProcessRecord {
    pub fn new(pid: u32) -> Self {
        let now = Utc::now();
        Self {
            id: Uuid::new_v4().to_string(),
            pid,
            parent_pid: None,
            name: String::new(),
            exe_path: None,
            command_line: None,
            signer_status: SignerStatus::Unknown,
            file_hash: None,
            first_seen_at: now,
            last_seen_at: now,
            user_name: None,
            integrity_level: None,
            current_status: ProcessStatus::Running,
            risk_score: 0,
            path_category: PathCategory::Unknown,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProcessMetric {
    pub id: String,
    pub process_id: String,
    pub timestamp: DateTime<Utc>,
    pub cpu_percent: f64,
    pub memory_bytes: u64,
    pub network_bytes_sent: u64,
    pub network_bytes_received: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Alert {
    pub id: String,
    pub process_id: String,
    pub timestamp: DateTime<Utc>,
    pub severity: Severity,
    pub title: String,
    pub summary: String,
    pub status: AlertStatus,
    pub risk_score: u32,
    pub triggered_rules: Vec<TriggeredRule>,
}

impl Alert {
    pub fn new(process_id: String, title: String, summary: String, risk_score: u32) -> Self {
        Self {
            id: Uuid::new_v4().to_string(),
            process_id,
            timestamp: Utc::now(),
            severity: Severity::from_score(risk_score),
            title,
            summary,
            status: AlertStatus::Open,
            risk_score,
            triggered_rules: Vec::new(),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "snake_case")]
pub enum AlertStatus {
    Open,
    Acknowledged,
    Ignored,
    Resolved,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TriggeredRule {
    pub rule_key: String,
    pub explanation: String,
    pub evidence: serde_json::Value,
    pub weight: u32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StartupEntry {
    pub id: String,
    pub name: String,
    pub path: String,
    pub location_type: StartupLocationType,
    pub signer_status: SignerStatus,
    pub first_seen_at: DateTime<Utc>,
    pub last_seen_at: DateTime<Utc>,
    pub enabled: bool,
    pub is_new: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum StartupLocationType {
    RegistryRunKey,
    RegistryRunOnceKey,
    StartupFolder,
    ScheduledTask,
    Service,
    Unknown,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TrustRule {
    pub id: String,
    pub rule_type: TrustRuleType,
    pub value: String,
    pub scope: String,
    pub created_at: DateTime<Utc>,
    pub created_by: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum TrustRuleType {
    ProcessName,
    ExePath,
    FileHash,
    Signer,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SystemOverview {
    pub health_score: u32,
    pub active_alerts_count: u32,
    pub suspicious_processes_count: u32,
    pub startup_changes_count: u32,
    pub monitored_processes_count: u32,
    pub cpu_usage: f64,
    pub memory_usage: f64,
    pub timestamp: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProcessListFilters {
    pub search: Option<String>,
    pub signed_only: Option<bool>,
    pub system_path_only: Option<bool>,
    pub min_risk_score: Option<u32>,
    pub status: Option<ProcessStatus>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AiConversation {
    pub id: String,
    pub process_id: Option<String>,
    pub created_at: DateTime<Utc>,
    pub prompt: String,
    pub response: String,
    pub context_json: serde_json::Value,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AiContext {
    pub process_name: String,
    pub exe_path: Option<String>,
    pub signer_status: SignerStatus,
    pub file_hash: Option<String>,
    pub parent_process_name: Option<String>,
    pub command_line: Option<String>,
    pub triggered_rules: Vec<TriggeredRule>,
    pub risk_score: u32,
    pub recent_cpu_avg: f64,
    pub recent_memory_mb: f64,
    pub startup_linked: bool,
    pub network_active: bool,
    pub path_category: PathCategory,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UserAction {
    pub id: String,
    pub timestamp: DateTime<Utc>,
    pub action_type: UserActionType,
    pub target_type: String,
    pub target_id: String,
    pub note: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum UserActionType {
    TrustProcess,
    IgnoreAlert,
    KillProcess,
    DisableStartup,
    AcknowledgeAlert,
    ResolveAlert,
}

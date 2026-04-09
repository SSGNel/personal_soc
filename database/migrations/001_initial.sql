-- Processes table
CREATE TABLE IF NOT EXISTS processes (
    id TEXT PRIMARY KEY,
    pid INTEGER NOT NULL,
    parent_pid INTEGER,
    name TEXT NOT NULL,
    exe_path TEXT,
    command_line TEXT,
    signer_status TEXT NOT NULL DEFAULT 'Unknown',
    file_hash TEXT,
    first_seen_at TEXT NOT NULL,
    last_seen_at TEXT NOT NULL,
    user_name TEXT,
    integrity_level TEXT,
    current_status TEXT NOT NULL DEFAULT 'Running',
    risk_score INTEGER NOT NULL DEFAULT 0,
    path_category TEXT NOT NULL DEFAULT 'Unknown',
    cpu_percent REAL DEFAULT 0.0,
    memory_bytes INTEGER DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_processes_pid ON processes(pid);
CREATE INDEX IF NOT EXISTS idx_processes_risk ON processes(risk_score DESC);
CREATE INDEX IF NOT EXISTS idx_processes_status ON processes(current_status);

-- Process metrics table
CREATE TABLE IF NOT EXISTS process_metrics (
    id TEXT PRIMARY KEY,
    process_id TEXT NOT NULL REFERENCES processes(id),
    timestamp TEXT NOT NULL,
    cpu_percent REAL NOT NULL DEFAULT 0.0,
    memory_bytes INTEGER NOT NULL DEFAULT 0,
    network_bytes_sent INTEGER NOT NULL DEFAULT 0,
    network_bytes_received INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_metrics_process_time ON process_metrics(process_id, timestamp DESC);

-- Alerts table
CREATE TABLE IF NOT EXISTS alerts (
    id TEXT PRIMARY KEY,
    process_id TEXT NOT NULL,
    timestamp TEXT NOT NULL,
    severity TEXT NOT NULL DEFAULT 'info',
    title TEXT NOT NULL,
    summary TEXT NOT NULL DEFAULT '',
    status TEXT NOT NULL DEFAULT 'open',
    risk_score INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_alerts_timestamp ON alerts(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_alerts_status ON alerts(status);
CREATE INDEX IF NOT EXISTS idx_alerts_severity ON alerts(severity);

-- Alert rules triggered table
CREATE TABLE IF NOT EXISTS alert_rules_triggered (
    id TEXT PRIMARY KEY,
    alert_id TEXT NOT NULL REFERENCES alerts(id),
    rule_key TEXT NOT NULL,
    explanation TEXT NOT NULL,
    evidence_json TEXT NOT NULL DEFAULT '{}'
);

CREATE INDEX IF NOT EXISTS idx_rules_alert ON alert_rules_triggered(alert_id);

-- Trust rules table
CREATE TABLE IF NOT EXISTS trust_rules (
    id TEXT PRIMARY KEY,
    rule_type TEXT NOT NULL,
    value TEXT NOT NULL,
    scope TEXT NOT NULL DEFAULT 'global',
    created_at TEXT NOT NULL,
    created_by TEXT NOT NULL DEFAULT 'user'
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_trust_type_value ON trust_rules(rule_type, value);

-- Ignore rules table
CREATE TABLE IF NOT EXISTS ignore_rules (
    id TEXT PRIMARY KEY,
    rule_type TEXT NOT NULL,
    value TEXT NOT NULL,
    scope TEXT NOT NULL DEFAULT 'global',
    expires_at TEXT,
    created_at TEXT NOT NULL
);

-- Startup entries table
CREATE TABLE IF NOT EXISTS startup_entries (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    path TEXT NOT NULL,
    location_type TEXT NOT NULL DEFAULT 'Unknown',
    signer_status TEXT NOT NULL DEFAULT 'Unknown',
    first_seen_at TEXT NOT NULL,
    last_seen_at TEXT NOT NULL,
    enabled INTEGER NOT NULL DEFAULT 1
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_startup_name_path ON startup_entries(name, path);

-- User actions audit log
CREATE TABLE IF NOT EXISTS user_actions (
    id TEXT PRIMARY KEY,
    timestamp TEXT NOT NULL,
    action_type TEXT NOT NULL,
    target_type TEXT NOT NULL,
    target_id TEXT NOT NULL,
    note TEXT
);

CREATE INDEX IF NOT EXISTS idx_actions_timestamp ON user_actions(timestamp DESC);

-- AI conversations table
CREATE TABLE IF NOT EXISTS ai_conversations (
    id TEXT PRIMARY KEY,
    process_id TEXT,
    created_at TEXT NOT NULL,
    prompt TEXT NOT NULL,
    response TEXT NOT NULL,
    context_json TEXT NOT NULL DEFAULT '{}'
);

CREATE INDEX IF NOT EXISTS idx_conversations_process ON ai_conversations(process_id);
CREATE INDEX IF NOT EXISTS idx_conversations_created ON ai_conversations(created_at DESC);

-- Schema migrations tracking
CREATE TABLE IF NOT EXISTS schema_migrations (
    version INTEGER PRIMARY KEY,
    applied_at TEXT NOT NULL DEFAULT (datetime('now'))
);

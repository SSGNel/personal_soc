use thiserror::Error;

#[derive(Error, Debug)]
pub enum MonitorError {
    #[error("Database error: {0}")]
    Database(#[from] rusqlite::Error),

    #[error("IO error: {0}")]
    Io(#[from] std::io::Error),

    #[error("Serialization error: {0}")]
    Serialization(#[from] serde_json::Error),

    #[error("Windows API error: {0}")]
    WindowsApi(String),

    #[error("Permission denied: {0}")]
    PermissionDenied(String),

    #[error("Process not found: {0}")]
    ProcessNotFound(u32),

    #[error("Invalid configuration: {0}")]
    InvalidConfig(String),

    #[error(transparent)]
    Other(#[from] anyhow::Error),
}

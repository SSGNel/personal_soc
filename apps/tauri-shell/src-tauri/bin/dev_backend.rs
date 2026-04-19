use std::path::PathBuf;
use std::sync::Arc;

use monitor_core::services::monitor_service::MonitorService;
use http_backend::run_http_backend;

fn main() {
    let current_dir = std::env::current_dir().expect("Failed to determine current directory");
    let db_path = current_dir.join("dev-psa.db");
    let (monitor, _event_rx) = MonitorService::new(db_path).expect("Failed to initialize monitor service");
    let monitor = Arc::new(monitor);

    let runtime = tokio::runtime::Builder::new_current_thread()
        .enable_all()
        .build()
        .expect("Failed to create Tokio runtime");

    runtime.block_on(run_http_backend(monitor));
}

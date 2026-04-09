use std::sync::Arc;
use monitor_core::services::monitor_service::MonitorService;

pub struct AppState {
    pub monitor: Arc<MonitorService>,
}

impl AppState {
    pub fn new(monitor: Arc<MonitorService>) -> Self {
        Self { monitor }
    }
}

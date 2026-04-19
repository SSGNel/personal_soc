use tauri::State;
use serde_json::Value;
use shared_types::models::{
    AlertStatus, AiConversation,
    TrustRule, TrustRuleType, UserAction, UserActionType,
    StartupLocationType,
};
use chrono::Utc;
use uuid::Uuid;
use crate::state::AppState;

type CmdResult<T> = Result<T, String>;

fn to_cmd_err(e: impl std::fmt::Display) -> String {
    e.to_string()
}

#[tauri::command]
pub async fn get_system_overview(state: State<'_, AppState>) -> CmdResult<Value> {
    let overview = state.monitor.get_system_overview().await;
    serde_json::to_value(overview).map_err(to_cmd_err)
}

#[tauri::command]
pub async fn list_processes(state: State<'_, AppState>) -> CmdResult<Value> {
    let db = state.monitor.get_db();
    let processes = db.list_processes().map_err(to_cmd_err)?;
    serde_json::to_value(processes).map_err(to_cmd_err)
}

#[tauri::command]
pub async fn list_processes_paged(
    state: State<'_, AppState>,
    search: String,
    status_filter: String,
    sort_key: String,
    sort_asc: bool,
    limit: u32,
    offset: u32,
) -> CmdResult<Value> {
    let db = state.monitor.get_db();
    let (processes, total) = db
        .list_processes_paged(&search, &status_filter, &sort_key, sort_asc, limit, offset)
        .map_err(to_cmd_err)?;
    serde_json::to_value(serde_json::json!({ "processes": processes, "total": total }))
        .map_err(to_cmd_err)
}

#[tauri::command]
pub async fn get_process_details(state: State<'_, AppState>, process_id: String) -> CmdResult<Value> {
    let db = state.monitor.get_db();
    let mut process = db.get_process_by_id(&process_id).map_err(to_cmd_err)?;
    if let Some(ref mut p) = process {
        state.monitor.enrich_process(p);
    }
    serde_json::to_value(process).map_err(to_cmd_err)
}

#[tauri::command]
pub async fn get_process_metrics(
    state: State<'_, AppState>,
    process_id: String,
    limit: Option<u32>,
) -> CmdResult<Value> {
    let db = state.monitor.get_db();
    let metrics = db.get_process_metrics(&process_id, limit.unwrap_or(60)).map_err(to_cmd_err)?;
    serde_json::to_value(metrics).map_err(to_cmd_err)
}

#[tauri::command]
pub async fn list_alerts(
    state: State<'_, AppState>,
    limit: Option<u32>,
) -> CmdResult<Value> {
    let db = state.monitor.get_db();
    let alerts = db.list_alerts(limit.unwrap_or(100)).map_err(to_cmd_err)?;
    serde_json::to_value(alerts).map_err(to_cmd_err)
}

#[tauri::command]
pub async fn update_alert_status(
    state: State<'_, AppState>,
    alert_id: String,
    status: String,
) -> CmdResult<()> {
    let db = state.monitor.get_db();
    let alert_status = match status.as_str() {
        "acknowledged" => AlertStatus::Acknowledged,
        "ignored" => AlertStatus::Ignored,
        "resolved" => AlertStatus::Resolved,
        _ => AlertStatus::Open,
    };
    db.update_alert_status(&alert_id, &alert_status).map_err(to_cmd_err)?;

    let action = UserAction {
        id: Uuid::new_v4().to_string(),
        timestamp: Utc::now(),
        action_type: UserActionType::AcknowledgeAlert,
        target_type: "alert".to_string(),
        target_id: alert_id,
        note: Some(format!("Status changed to {}", status)),
    };
    db.log_user_action(&action).map_err(to_cmd_err)?;
    Ok(())
}

#[tauri::command]
pub async fn kill_process(
    state: State<'_, AppState>,
    pid: u32,
    process_id: String,
) -> CmdResult<()> {
    state.monitor.kill_process(pid).map_err(to_cmd_err)?;

    let action = UserAction {
        id: Uuid::new_v4().to_string(),
        timestamp: Utc::now(),
        action_type: UserActionType::KillProcess,
        target_type: "process".to_string(),
        target_id: process_id,
        note: Some(format!("Killed PID {}", pid)),
    };
    state.monitor.get_db().log_user_action(&action).map_err(to_cmd_err)?;
    Ok(())
}

#[tauri::command]
pub async fn trust_process(
    state: State<'_, AppState>,
    process_id: String,
    rule_type: String,
    value: String,
) -> CmdResult<()> {
    let db = state.monitor.get_db();

    let trust_type = match rule_type.as_str() {
        "process_name" => TrustRuleType::ProcessName,
        "exe_path" => TrustRuleType::ExePath,
        "file_hash" => TrustRuleType::FileHash,
        "signer" => TrustRuleType::Signer,
        _ => return Err("Invalid trust rule type".to_string()),
    };

    let rule = TrustRule {
        id: Uuid::new_v4().to_string(),
        rule_type: trust_type,
        value: value.clone(),
        scope: "global".to_string(),
        created_at: Utc::now(),
        created_by: "user".to_string(),
    };
    db.insert_trust_rule(&rule).map_err(to_cmd_err)?;

    let action = UserAction {
        id: Uuid::new_v4().to_string(),
        timestamp: Utc::now(),
        action_type: UserActionType::TrustProcess,
        target_type: "process".to_string(),
        target_id: process_id,
        note: Some(format!("Trusted by {}: {}", rule_type, value)),
    };
    db.log_user_action(&action).map_err(to_cmd_err)?;
    Ok(())
}

#[tauri::command]
pub async fn list_startup_entries(state: State<'_, AppState>) -> CmdResult<Value> {
    let db = state.monitor.get_db();
    let entries = db.list_startup_entries().map_err(to_cmd_err)?;
    serde_json::to_value(entries).map_err(to_cmd_err)
}

#[tauri::command]
pub async fn ask_ai_about_process(
    state: State<'_, AppState>,
    process_id: String,
    question: String,
) -> CmdResult<String> {
    use ai_explainer::{AiClient, ContextBuilder};
    use ai_explainer::client::{AiClientConfig, AiProvider};

    // Compiled-in key (from .env at build time) — users never need to configure anything.
    // Settings DB can override it (e.g. if someone wants to use their own key).
    const COMPILED_KEY: Option<&str> = option_env!("GROQ_API_KEY");

    let db = state.monitor.get_db();

    let api_key = db.get_setting("groq_api_key")
        .map_err(to_cmd_err)?
        .filter(|k| !k.trim().is_empty())
        .or_else(|| COMPILED_KEY.map(String::from))
        .filter(|k| !k.trim().is_empty());

    if api_key.is_none() {
        return Err("AI not configured. Add your Groq API key in Settings.".to_string());
    }

    let process = db.get_process_by_id(&process_id)
        .map_err(to_cmd_err)?
        .ok_or_else(|| "Process not found".to_string())?;

    let metrics = db.get_process_metrics(&process_id, 20).map_err(to_cmd_err)?;
    let alerts = db.list_alerts(10).map_err(to_cmd_err)?;
    let process_alerts: Vec<_> = alerts.into_iter()
        .filter(|a| a.process_id == process_id)
        .collect();

    let parent_name = process.parent_pid.and_then(|ppid| {
        db.list_processes().ok().and_then(|procs| {
            procs.into_iter().find(|p| p.pid == ppid).map(|p| p.name)
        })
    });

    let ctx = ContextBuilder::build(
        &process,
        parent_name,
        &metrics,
        &process_alerts,
        false,
        false,
    );

    let config = AiClientConfig {
        provider: AiProvider::Groq,
        api_key,
        model: "llama-3.3-70b-versatile".to_string(),
        base_url: None,
    };

    let client = AiClient::new(config);
    let response = client.ask_about_process(&ctx, &question).await.map_err(to_cmd_err)?;

    // Save conversation
    let conv = AiConversation {
        id: Uuid::new_v4().to_string(),
        process_id: Some(process_id),
        created_at: Utc::now(),
        prompt: question,
        response: response.clone(),
        context_json: serde_json::to_value(&ctx).unwrap_or_default(),
    };
    let _ = db.insert_ai_conversation(&conv);

    Ok(response)
}

#[tauri::command]
pub async fn remove_startup_entry(
    state: State<'_, AppState>,
    entry_id: String,
    name: String,
    location_type: String,
) -> CmdResult<()> {
    let loc = match location_type.as_str() {
        "RegistryRunKey" => StartupLocationType::RegistryRunKey,
        "RegistryRunOnceKey" => StartupLocationType::RegistryRunOnceKey,
        "StartupFolder" => StartupLocationType::StartupFolder,
        "ScheduledTask" => StartupLocationType::ScheduledTask,
        "Service" => StartupLocationType::Service,
        _ => StartupLocationType::Unknown,
    };
    state.monitor.remove_startup_entry(&entry_id, &name, &loc).await.map_err(to_cmd_err)
}

#[tauri::command]
pub async fn get_setting(state: State<'_, AppState>, key: String) -> CmdResult<Option<String>> {
    state.monitor.get_db().get_setting(&key).map_err(to_cmd_err)
}

#[tauri::command]
pub async fn save_setting(state: State<'_, AppState>, key: String, value: String) -> CmdResult<()> {
    state.monitor.get_db().set_setting(&key, &value).map_err(to_cmd_err)
}

#[tauri::command]
pub async fn run_cleanup_now(state: State<'_, AppState>, hours: u32) -> CmdResult<usize> {
    state.monitor.get_db().cleanup_old_processes(hours).map_err(to_cmd_err)
}

#[tauri::command]
pub async fn list_activity_events(
    state: State<'_, AppState>,
    limit: Option<u32>,
) -> CmdResult<Value> {
    let db = state.monitor.get_db();
    let events = db.list_events(limit.unwrap_or(300)).map_err(to_cmd_err)?;
    serde_json::to_value(events).map_err(to_cmd_err)
}

#[tauri::command]
pub async fn list_activity_events_paged(
    state: State<'_, AppState>,
    limit: u32,
    offset: u32,
) -> CmdResult<Value> {
    let db = state.monitor.get_db();
    let (events, total) = db.list_events_paged(limit, offset).map_err(to_cmd_err)?;
    serde_json::to_value(serde_json::json!({ "events": events, "total": total }))
        .map_err(to_cmd_err)
}

#[tauri::command]
pub async fn ask_ai(
    state: State<'_, AppState>,
    question: String,
) -> CmdResult<String> {
    use ai_explainer::client::{AiClientConfig, AiProvider};
    use ai_explainer::AiClient;
    use ai_explainer::prompts::{build_general_system_prompt, build_system_context_prompt};

    const COMPILED_KEY: Option<&str> = option_env!("GROQ_API_KEY");

    let db = state.monitor.get_db();

    let api_key = db.get_setting("groq_api_key")
        .map_err(to_cmd_err)?
        .filter(|k| !k.trim().is_empty())
        .or_else(|| COMPILED_KEY.map(String::from))
        .filter(|k| !k.trim().is_empty());

    if api_key.is_none() {
        return Err("AI not configured. Add your Groq API key in Settings.".to_string());
    }

    // Build a rich system context snapshot
    let overview = state.monitor.get_system_overview().await;
    let top_procs = db.list_processes_paged("", "", "risk_score", false, 10, 0)
        .map_err(to_cmd_err)?;
    let alerts = db.list_alerts(20).map_err(to_cmd_err)?;
    let startup = db.list_startup_entries().map_err(to_cmd_err)?;
    let events = db.list_events(50).map_err(to_cmd_err)?;

    let mut context = format!(
        "Health: {}/100  CPU: {:.1}%  Memory: {:.1}%  Processes Monitored: {}  Active Alerts: {}  Suspicious: {}  Startup Changes: {}\n",
        overview.health_score,
        overview.cpu_usage,
        overview.memory_usage,
        overview.monitored_processes_count,
        overview.active_alerts_count,
        overview.suspicious_processes_count,
        overview.startup_changes_count,
    );

    // Top risky processes
    let risky: Vec<_> = top_procs.0.iter().filter(|p| p.risk_score > 0).collect();
    if !risky.is_empty() {
        context.push_str("\nTop Risky Processes:\n");
        for p in risky.iter().take(8) {
            context.push_str(&format!(
                "  {} (PID {}, risk {}, {:?}, {:?})\n",
                p.name, p.pid, p.risk_score, p.signer_status, p.path_category
            ));
        }
    } else {
        context.push_str("\nNo risky processes detected.\n");
    }

    // Open alerts
    let open_alerts: Vec<_> = alerts.iter()
        .filter(|a| matches!(a.status, AlertStatus::Open))
        .collect();
    if !open_alerts.is_empty() {
        context.push_str("\nOpen Alerts:\n");
        for a in open_alerts.iter().take(8) {
            context.push_str(&format!("  [{:?}] {} (risk {})\n", a.severity, a.title, a.risk_score));
        }
    } else {
        context.push_str("\nNo open alerts.\n");
    }

    // Startup entries
    if !startup.is_empty() {
        context.push_str("\nStartup Entries:\n");
        for e in &startup {
            let flag = if e.is_new { " [NEW]" } else { "" };
            context.push_str(&format!(
                "  {} — {} ({:?}){}\n",
                e.name, e.path, e.signer_status, flag
            ));
        }
    }

    // Recent events summary
    let event_counts = events.iter().fold((0u32, 0u32, 0u32, 0u32), |acc, e| {
        match e.event_type.as_str() {
            "process_created" => (acc.0 + 1, acc.1, acc.2, acc.3),
            "alert" => (acc.0, acc.1 + 1, acc.2, acc.3),
            "startup" => (acc.0, acc.1, acc.2 + 1, acc.3),
            "user_action" => (acc.0, acc.1, acc.2, acc.3 + 1),
            _ => acc,
        }
    });
    context.push_str(&format!(
        "\nRecent Activity (last 30 days): {} process starts, {} alerts, {} startup entries, {} user actions\n",
        event_counts.0, event_counts.1, event_counts.2, event_counts.3
    ));

    let config = AiClientConfig {
        provider: AiProvider::Groq,
        api_key,
        model: "llama-3.3-70b-versatile".to_string(),
        base_url: None,
    };

    let client = AiClient::new(config);
    let system = build_general_system_prompt();
    let prompt = build_system_context_prompt(&context, &question);

    let response = client
        .call_raw(&system, &prompt)
        .await
        .map_err(to_cmd_err)?;

    // Log the conversation
    let conv = AiConversation {
        id: Uuid::new_v4().to_string(),
        process_id: None,
        created_at: Utc::now(),
        prompt: question,
        response: response.clone(),
        context_json: serde_json::json!({ "type": "general", "context": context }),
    };
    let _ = db.insert_ai_conversation(&conv);

    Ok(response)
}

#[tauri::command]
pub async fn pause_monitoring(state: State<'_, AppState>) -> CmdResult<()> {
    state.monitor.pause().await;
    Ok(())
}

#[tauri::command]
pub async fn resume_monitoring(state: State<'_, AppState>) -> CmdResult<()> {
    state.monitor.resume().await;
    Ok(())
}

// ---- Password Manager Commands ----

#[tauri::command]
pub async fn save_credential(
    state: State<'_, AppState>,
    site: String,
    username: String,
    password_encrypted: String,
) -> CmdResult<String> {
    let db = state.monitor.get_db();
    db.save_credential(&site, &username, &password_encrypted).map_err(to_cmd_err)
}

#[tauri::command]
pub async fn list_credentials(state: State<'_, AppState>) -> CmdResult<Value> {
    let db = state.monitor.get_db();
    let creds = db.list_credentials().map_err(to_cmd_err)?;
    let result: Vec<_> = creds.iter().map(|(id, site, username, _password_encrypted)| {
        serde_json::json!({
            "id": id,
            "site": site,
            "username": username,
        })
    }).collect();
    serde_json::to_value(result).map_err(to_cmd_err)
}

#[tauri::command]
pub async fn get_credentials_for_domain(
    state: State<'_, AppState>,
    site: String,
) -> CmdResult<Value> {
    let db = state.monitor.get_db();
    let creds = db.get_credentials_for_domain(&site).map_err(to_cmd_err)?;
    let result: Vec<_> = creds.iter().map(|(id, username, password_encrypted)| {
        serde_json::json!({
            "id": id,
            "username": username,
            "password_encrypted": password_encrypted,
        })
    }).collect();
    serde_json::to_value(result).map_err(to_cmd_err)
}

#[tauri::command]
pub async fn delete_credential(state: State<'_, AppState>, id: String) -> CmdResult<()> {
    let db = state.monitor.get_db();
    db.delete_credential(&id).map_err(to_cmd_err)
}

#[tauri::command]
pub async fn update_autofill_timestamp(state: State<'_, AppState>, id: String) -> CmdResult<()> {
    let db = state.monitor.get_db();
    db.update_autofill_timestamp(&id).map_err(to_cmd_err)
}


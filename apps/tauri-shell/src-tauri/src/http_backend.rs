use std::collections::HashMap;
use std::sync::Arc;

use monitor_core::services::monitor_service::MonitorService;
use serde::{Deserialize, Serialize};
use warp::http::StatusCode;
use warp::Filter;

#[derive(Deserialize)]
pub struct SaveCredentialRequest {
    pub site: String,
    pub username: String,
    pub password: String,
}

#[derive(Serialize)]
pub struct CredentialEntry {
    pub id: String,
    pub site: String,
    pub username: String,
}

fn build_routes(
    monitor: Arc<MonitorService>,
) -> impl warp::Filter<Extract = impl warp::Reply, Error = warp::Rejection> + Clone {
    let monitor_filter = warp::any().map(move || monitor.clone());

    let status = warp::path!("api" / "status")
        .and(warp::get())
        .map(|| warp::reply::json(&serde_json::json!({ "status": "ok" })));

    let list_credentials = warp::path!("api" / "credentials")
        .and(warp::get())
        .and(warp::query::<HashMap<String, String>>())
        .and(monitor_filter.clone())
        .map(|query: HashMap<String, String>, monitor: Arc<MonitorService>| {
            let db = monitor.get_db();
            let entries = if let Some(site) = query.get("site") {
                db.get_credentials_for_domain(site)
                    .unwrap_or_default()
                    .into_iter()
                    .map(|(id, username, _password_encrypted)| CredentialEntry {
                        id,
                        site: site.clone(),
                        username,
                    })
                    .collect::<Vec<_>>()
            } else {
                db.list_credentials()
                    .unwrap_or_default()
                    .into_iter()
                    .map(|(id, site, username, _password_encrypted)| CredentialEntry {
                        id,
                        site,
                        username,
                    })
                    .collect::<Vec<_>>()
            };
            warp::reply::json(&entries)
        });

    let save_credential = warp::path!("api" / "credentials")
        .and(warp::post())
        .and(monitor_filter.clone())
        .and(warp::body::json())
        .map(|monitor: Arc<MonitorService>, body: SaveCredentialRequest| {
            let db = monitor.get_db();
            match db.save_credential(&body.site, &body.username, &body.password) {
                Ok(id) => warp::reply::json(&id),
                Err(err) => warp::reply::with_status(
                    warp::reply::json(&serde_json::json!({ "error": err.to_string() })),
                    StatusCode::INTERNAL_SERVER_ERROR,
                ),
            }
        });

    let delete_credential = warp::path!("api" / "credentials" / String)
        .and(warp::delete())
        .and(monitor_filter.clone())
        .map(|id: String, monitor: Arc<MonitorService>| {
            let db = monitor.get_db();
            match db.delete_credential(&id) {
                Ok(()) => warp::reply::with_status(warp::reply(), StatusCode::NO_CONTENT),
                Err(err) => warp::reply::with_status(
                    warp::reply::json(&serde_json::json!({ "error": err.to_string() })),
                    StatusCode::INTERNAL_SERVER_ERROR,
                ),
            }
        });

    let autofill_timestamp = warp::path!("api" / "credentials" / String / "autofill")
        .and(warp::post())
        .and(monitor_filter)
        .map(|id: String, monitor: Arc<MonitorService>| {
            let db = monitor.get_db();
            match db.update_autofill_timestamp(&id) {
                Ok(()) => warp::reply::with_status(warp::reply(), StatusCode::NO_CONTENT),
                Err(err) => warp::reply::with_status(
                    warp::reply::json(&serde_json::json!({ "error": err.to_string() })),
                    StatusCode::INTERNAL_SERVER_ERROR,
                ),
            }
        });

    status
        .or(list_credentials)
        .or(save_credential)
        .or(delete_credential)
        .or(autofill_timestamp)
        .with(
            warp::cors()
                .allow_any_origin()
                .allow_methods(vec!["GET", "POST", "DELETE", "OPTIONS"])
                .allow_headers(vec!["content-type"]),
        )
}

pub fn spawn_http_backend(monitor: Arc<MonitorService>) {
    let routes = build_routes(monitor);

    tauri::async_runtime::spawn(async move {
        warp::serve(routes)
            .run(([127, 0, 0, 1], 3420))
            .await;
    });
}

pub async fn run_http_backend(monitor: Arc<MonitorService>) {
    let routes = build_routes(monitor);
    warp::serve(routes)
        .run(([127, 0, 0, 1], 3420))
        .await;
}

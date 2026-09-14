#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]
use creed_desktop::{
    mcp::{self, Shared},
    workspace::{self, Workspace},
};
use serde_json::{json, Value};
use std::{
    collections::HashMap,
    fs,
    sync::{
        atomic::{AtomicBool, Ordering},
        Arc, Mutex, OnceLock,
    },
};
use tauri::{Emitter, Manager, State};
use tauri_plugin_dialog::DialogExt;
use tauri_plugin_opener::OpenerExt;
static QUIT_READY: AtomicBool = AtomicBool::new(false);
static FRONTEND_READY: AtomicBool = AtomicBool::new(false);

#[tauri::command]
fn frontend_ready(window: tauri::WebviewWindow) {
    FRONTEND_READY.store(true, Ordering::SeqCst);
    let _ = window.show();
    let _ = window.set_focus();
}

#[tauri::command]
fn finish_quit(app: tauri::AppHandle) {
    QUIT_READY.store(true, Ordering::SeqCst);
    app.exit(0);
}

fn key() -> Result<keyring::Entry, String> {
    keyring::Entry::new("md.creed.desktop", "openrouter").map_err(|e| e.to_string())
}

type KeyResult = Result<Option<String>, String>;

// Cache failures too: background callers must not reopen a dismissed Keychain prompt.
fn key_cache() -> &'static Mutex<Option<KeyResult>> {
    static CACHE: OnceLock<Mutex<Option<KeyResult>>> = OnceLock::new();
    CACHE.get_or_init(|| Mutex::new(None))
}

fn cached_key() -> KeyResult {
    let mut cache = key_cache().lock().map_err(|e| e.to_string())?;
    if let Some(result) = cache.as_ref() {
        return result.clone();
    }
    // Serialize silent reads with user-initiated writes, which may authorize access.
    let _interaction =
        security_framework::os::macos::keychain::SecKeychain::disable_user_interaction()
            .map_err(|e| e.to_string())?;
    read_cached_key(&mut cache, || {
        match key()?.get_password() {
        Ok(value) => Ok(Some(value)),
        Err(keyring::Error::NoEntry) => Ok(None),
        Err(_) => {
            Err("Your saved key is unavailable. Save your OpenRouter key in Settings to use it for this session.".into())
        }
    }
    })
}

fn read_cached_key(cache: &mut Option<KeyResult>, read: impl FnOnce() -> KeyResult) -> KeyResult {
    cache.get_or_insert_with(read).clone()
}

fn required_key() -> Result<String, String> {
    cached_key()?
        .filter(|value| !value.is_empty())
        .ok_or_else(|| "Add your OpenRouter key in Settings.".into())
}

fn display_key_suffix(value: &str) -> String {
    value.chars().rev().take(4).collect::<String>().chars().rev().collect()
}
#[tauri::command]
fn open_external_link(app: tauri::AppHandle, url: String) -> Result<(), String> {
    let parsed = reqwest::Url::parse(&url).map_err(|_| "Invalid link")?;
    let goose_install = parsed.scheme() == "goose"
        && parsed.host_str() == Some("extension")
        && parsed
            .query_pairs()
            .any(|(name, value)| name == "url" && value.starts_with("http://127.0.0.1:38473/mcp/"));
    if !matches!(parsed.scheme(), "http" | "https" | "mailto") && !goose_install {
        return Err("This link type is not supported.".into());
    }
    app.opener()
        .open_url(url, None::<&str>)
        .map_err(|e| e.to_string())
}
#[tauri::command]
fn update_configured(app: tauri::AppHandle) -> bool {
    updater_enabled(app.config().plugins.0.get("updater"))
}
fn updater_enabled(config: Option<&Value>) -> bool {
    config
        .and_then(|value| {
            serde_json::from_value::<tauri_plugin_updater::Config>(value.clone()).ok()
        })
        .is_some_and(|config| !config.pubkey.trim().is_empty() && !config.endpoints.is_empty())
}
#[tauri::command]
fn bridge_path() -> Result<String, String> {
    let path = std::env::current_exe()
        .map_err(|e| e.to_string())?
        .parent()
        .ok_or("Application location is unavailable")?
        .join("creed-mcp");
    if !path.is_file() {
        return Err("The stdio bridge is available in the packaged application. Use the HTTP endpoint during development.".into());
    }
    Ok(path.to_string_lossy().into_owned())
}
#[tauri::command]
async fn get_workspace(state: State<'_, Shared>) -> Result<Workspace, String> {
    let mut s = state.lock().map_err(|e| e.to_string())?;
    s.refresh()?;
    Ok(s.clone())
}
#[tauri::command]
async fn export_file(
    app: tauri::AppHandle,
    filename: String,
    content: String,
) -> Result<(), String> {
    let name = std::path::Path::new(&filename)
        .file_name()
        .and_then(|name| name.to_str())
        .ok_or("Invalid file name")?;
    let Some(selected) = app.dialog().file().set_file_name(name).blocking_save_file() else {
        return Ok(());
    };
    let path = selected.into_path().map_err(|_| "Choose a local file.")?;
    fs::write(path, content).map_err(|error| error.to_string())
}
#[tauri::command]
async fn choose_document_path(
    app: tauri::AppHandle,
    create: bool,
) -> Result<Option<String>, String> {
    let mut dialog = app
        .dialog()
        .file()
        .add_filter("Markdown", &["md", "markdown"]);
    if let Some(window) = app.get_webview_window("main") {
        dialog = dialog.set_parent(&window);
    }
    let (send, receive) = tokio::sync::oneshot::channel();
    if create {
        dialog.set_file_name("creed.md").save_file(move |path| {
            let _ = send.send(path);
        });
    } else {
        dialog.pick_file(move |path| {
            let _ = send.send(path);
        });
    }
    receive
        .await
        .map_err(|e| e.to_string())?
        .map(|path| {
            path.into_path()
                .map(|path| path.to_string_lossy().into_owned())
                .map_err(|e| e.to_string())
        })
        .transpose()
}
#[tauri::command]
async fn pick_document(
    app: tauri::AppHandle,
    state: State<'_, Shared>,
    create: bool,
    locate: Option<String>,
) -> Result<Option<Workspace>, String> {
    let Some(path) = choose_document_path(app, create).await? else {
        return Ok(None);
    };
    open_document_path(state, path, create, locate)
        .await
        .map(Some)
}
#[tauri::command]
async fn open_document_path(
    state: State<'_, Shared>,
    path: String,
    create: bool,
    locate: Option<String>,
) -> Result<Workspace, String> {
    let path = std::path::PathBuf::from(path);
    if !path
        .extension()
        .and_then(|value| value.to_str())
        .is_some_and(|value| {
            value.eq_ignore_ascii_case("md") || value.eq_ignore_ascii_case("markdown")
        })
    {
        return Err("Choose a Markdown file (.md or .markdown).".into());
    }
    if create {
        let mut files = creed_desktop::files::Documents::default();
        files.create(&path, "## Identity\n\n<!-- creed:accent=stack -->\n\n")?;
    }
    let mut s = state.lock().map_err(|e| e.to_string())?;
    if let Some(document_id) = locate {
        let path = fs::canonicalize(&path).map_err(|e| e.to_string())?;
        if s.documents
            .iter()
            .any(|d| d.path == path && d.id != document_id)
        {
            return Err("This file is already associated with another Creed.".into());
        }
        relocate_document(&mut s, document_id, path)?;
    } else {
        s.open(&path)?;
    }
    Ok(s.clone())
}

fn relocate_document(
    workspace: &mut Workspace,
    document_id: String,
    path: std::path::PathBuf,
) -> Result<(), String> {
    let mut relocated = workspace.clone();
    relocated.document_mut(&document_id)?.path = path;
    relocated.refresh()?;
    if relocated.document(&document_id)?.missing {
        return Err("This file could not be read. Choose an available Markdown file.".into());
    }
    relocated.document_mut(&document_id)?.listed = true;
    relocated.active_id = Some(document_id);
    relocated.persist()?;
    *workspace = relocated;
    Ok(())
}
#[tauri::command]
async fn document_action(
    state: State<'_, Shared>,
    document_id: String,
    action: Value,
) -> Result<Workspace, String> {
    let mut shared = state.lock().map_err(|e| e.to_string())?;
    shared.refresh()?;
    let mut s = shared.clone();
    match action["kind"].as_str().unwrap_or("") {
        "edit-agent" => {
            s.document(&document_id)?;
            s.edit_agent(
                action["agentId"].as_str().unwrap_or(""),
                action["name"].as_str().unwrap_or(""),
                action["icon"].as_str(),
            )?;
        }
        "remove-agent" => {
            s.document(&document_id)?;
            s.remove_agent(action["agentId"].as_str().unwrap_or(""))?;
        }
        "add-agent" => {
            s.document(&document_id)?;
            s.add_agent(
                action["name"].as_str().unwrap_or(""),
                action["icon"].as_str(),
            )?;
        }
        "switch" => {
            if s.document(&document_id)?.missing {
                return Err("Locate this file to open it.".into());
            }
            s.active_id = Some(document_id.clone());
        }
        "remove" => {
            if s.active_id.as_deref() == Some(&document_id) {
                return Err("Switch to another Creed before removing this one.".into());
            }
            let d = s.document_mut(&document_id)?;
            d.listed = false;
            d.connections.clear();
        }
        "delete-file" => {
            let doc = s.document(&document_id)?;
            if action["baseline"].as_str() != Some(&doc.revision) {
                return Err("The file changed. Review it before deleting.".into());
            }
            trash::delete(&doc.path).map_err(|e| e.to_string())?;
            s.documents.retain(|d| d.id != document_id);
            if s.active_id.as_deref() == Some(&document_id) {
                s.active_id = s.documents.iter().find(|d| d.listed).map(|d| d.id.clone());
            }
        }
        "rename-file" => {
            let name = action["name"].as_str().ok_or("Missing name")?;
            let d = s.document_mut(&document_id)?;
            d.path = creed_desktop::files::rename_file(&d.path, name)?;
        }
        "save-source" => s.write(
            &document_id,
            action["baseline"].as_str().ok_or("Missing revision")?,
            action["source"].as_str().ok_or("Missing source")?.into(),
            "Edited in Creed",
        )?,
        "review" => s.review(
            &document_id,
            action["proposalId"].as_str().ok_or("Missing proposal")?,
            action["accept"].as_bool().unwrap_or(false),
        )?,
        "review-many" => {
            let ids = action["proposalIds"]
                .as_array()
                .ok_or("Missing proposals")?
                .iter()
                .map(|id| id.as_str().map(String::from).ok_or("Invalid proposal ID"))
                .collect::<Result<Vec<_>, _>>()?;
            s.review_many(&document_id, &ids)?;
        }
        "revoke" => {
            let connection = action["connectionId"].as_str().unwrap_or("");
            s.document_mut(&document_id)?
                .connections
                .retain(|c| c.id != connection);
        }
        "analysis" => {
            let doc = s.document_mut(&document_id)?;
            if action["baseline"].as_str() != Some(&doc.revision) {
                return Err(
                    "The file changed during analysis. Run it again for the current content."
                        .into(),
                );
            }
            doc.analysis = Some(action["report"].clone());
        }
        "restore-section" => {
            let d = s.document(&document_id)?;
            let section_id = action["sectionId"].as_str().ok_or("Section required")?;
            let revision = d
                .history
                .iter()
                .find(|r| Some(r.id.as_str()) == action["revisionId"].as_str())
                .ok_or("Revision not found")?;
            let historical = revision
                .sections
                .iter()
                .find(|section| section.id == section_id)
                .ok_or("This revision has no saved version of this section.")?;
            let body = historical.body.clone();
            s.operate(
                &document_id,
                &json!({"kind":"body","sectionId":section_id,"body":body}),
                None,
            )?;
        }
        "restore-revision" => {
            let d = s.document(&document_id)?;
            let source = d
                .history
                .iter()
                .find(|r| Some(r.id.as_str()) == action["revisionId"].as_str())
                .ok_or("Revision not found")?
                .source
                .clone();
            let baseline = d.revision.clone();
            s.write(&document_id, &baseline, source, "Restored revision")?;
        }
        _ => {
            s.operate(&document_id, &action, None)?;
        }
    }
    s.persist()?;
    *shared = s;
    Ok(shared.clone())
}
#[tauri::command]
async fn key_status() -> Result<bool, String> {
    let enabled = cached_key()?.is_some_and(|value| !value.is_empty());
    mcp::ANALYSIS_ENABLED.store(enabled, Ordering::SeqCst);
    Ok(enabled)
}

#[tauri::command]
async fn key_last_four() -> Result<Option<String>, String> {
    Ok(cached_key()?
        .filter(|value| !value.is_empty())
        .map(|value| display_key_suffix(&value)))
}

#[tauri::command]
fn propose_from_panel(
    state: State<Shared>,
    document_id: String,
    baseline: String,
    operation: Value,
) -> Result<String, String> {
    let mut state = state.lock().map_err(|e| e.to_string())?;
    state.refresh()?;
    state.propose(&document_id, &baseline, &operation, "Creed")
}
#[tauri::command]
async fn save_key(value: String) -> Result<bool, String> {
    if !value.trim().is_empty() {
        read_openrouter_key(value.trim()).await?;
    }
    tauri::async_runtime::spawn_blocking(move || {
        let mut cache = key_cache().lock().map_err(|e| e.to_string())?;
        let value = value.trim();
        if value.is_empty() {
            let _interaction =
                security_framework::os::macos::keychain::SecKeychain::disable_user_interaction()
                    .map_err(|e| e.to_string())?;
            match key()?.delete_credential() {
                Ok(()) | Err(keyring::Error::NoEntry) => {
                    *cache = Some(Ok(None));
                    mcp::ANALYSIS_ENABLED.store(false, Ordering::SeqCst);
                    if let Ok(active) = requests().lock() {
                        for cancel in active.values() { cancel.notify_one(); }
                    }
                    Ok(true)
                }
                Err(e) => Err(e.to_string()),
            }
        } else {
            persist_cached_key(&mut cache, value, || {
                // Update directly: reading the old secret first can request a second authorization.
                security_framework::passwords::set_generic_password(
                    "md.creed.desktop", "openrouter", value.as_bytes(),
                ).map_err(|_| "Your key was not saved to Keychain. Try Save again and allow access when macOS asks.".to_owned())
            })?;
            mcp::ANALYSIS_ENABLED.store(true, Ordering::SeqCst);
            Ok(true)
        }
    }).await.map_err(|e| e.to_string())?
}

fn persist_cached_key(
    cache: &mut Option<KeyResult>,
    value: &str,
    write: impl FnOnce() -> Result<(), String>,
) -> Result<(), String> {
    if matches!(cache, Some(Ok(Some(existing))) if existing == value) {
        return Ok(());
    }
    write()?;
    *cache = Some(Ok(Some(value.to_owned())));
    Ok(())
}
async fn read_openrouter_key(value: &str) -> Result<Value, String> {
    let response = reqwest::Client::new()
        .get("https://openrouter.ai/api/v1/key")
        .bearer_auth(value)
        .timeout(std::time::Duration::from_secs(20))
        .send()
        .await
        .map_err(|_| "Could not reach OpenRouter. Check your connection.")?;
    if !response.status().is_success() {
        return Err(format!(
            "OpenRouter could not validate this key ({}).",
            response.status()
        ));
    }
    response
        .json::<Value>()
        .await
        .map_err(|_| "OpenRouter returned an invalid key response.".into())
}
#[tauri::command]
async fn openrouter_balance() -> Result<Value, String> {
    let credential = required_key()?;
    let response = read_openrouter_key(&credential).await?;
    let data = &response["data"];
    Ok(
        json!({"usageUsd":data["usage"],"limitUsd":data["limit"],"remainingUsd":data["limit_remaining"]}),
    )
}
#[tauri::command]
fn set_model(state: State<Shared>, model: String) -> Result<(), String> {
    if model.trim().is_empty() || model.len() > 200 {
        return Err("Enter a model identifier.".into());
    }
    let mut s = state.lock().map_err(|e| e.to_string())?;
    s.model = model;
    s.persist()
}
fn requests() -> &'static Mutex<HashMap<String, Arc<tokio::sync::Notify>>> {
    static REQUESTS: OnceLock<Mutex<HashMap<String, Arc<tokio::sync::Notify>>>> = OnceLock::new();
    REQUESTS.get_or_init(Mutex::default)
}
#[tauri::command]
fn cancel_ai(request_id: String) {
    if let Ok(requests) = requests().lock() {
        if let Some(request) = requests.get(&request_id) {
            request.notify_one();
        }
    }
}
#[tauri::command]
async fn ai_request(
    state: State<'_, Shared>,
    document_id: String,
    messages: Value,
    request_id: String,
    channel: tauri::ipc::Channel<String>,
    feature: Option<String>,
    response_format: Option<Value>,
) -> Result<Value, String> {
    let feature = feature.unwrap_or_else(|| "panel".into());
    if !["analysis", "panel", "tab", "agent"].contains(&feature.as_str()) {
        return Err("Unknown AI feature.".into());
    }
    let cancel = Arc::new(tokio::sync::Notify::new());
    {
        let mut active = requests().lock().map_err(|e| e.to_string())?;
        if active.len() >= 8 || active.contains_key(&request_id) {
            return Err("Wait for an active request to finish.".into());
        }
        active.insert(request_id.clone(), cancel.clone());
    }
    let result = tokio::select! {
        _ = cancel.notified() => Err("Request cancelled.".into()),
        _ = tokio::time::sleep(std::time::Duration::from_secs(180)) => Err("The model took too long to respond. Try again.".into()),
        result = run_ai_request(state, document_id, messages, request_id.clone(), channel, feature, response_format) => result,
    };
    if let Ok(mut active) = requests().lock() {
        active.remove(&request_id);
    }
    result
}
async fn run_ai_request(
    state: State<'_, Shared>,
    document_id: String,
    messages: Value,
    request_id: String,
    channel: tauri::ipc::Channel<String>,
    feature: String,
    response_format: Option<Value>,
) -> Result<Value, String> {
    let (model, baseline) = {
        let s = state.lock().map_err(|e| e.to_string())?;
        (s.model.clone(), s.document(&document_id)?.revision.clone())
    };
    let credential = required_key()?;
    let mut request = json!({"model":model,"messages":messages,"stream":true,"stream_options":{"include_usage":true}});
    if let Some(response_format) = response_format {
        request["response_format"] = response_format;
    }
    let response=reqwest::Client::new().post("https://openrouter.ai/api/v1/chat/completions").bearer_auth(credential).json(&request).send().await.map_err(|e|e.to_string())?;
    if !response.status().is_success() {
        return Err(format!(
            "OpenRouter returned {}. Check your key, model and provider balance.",
            response.status()
        ));
    }
    use futures_util::StreamExt;
    let mut stream = response.bytes_stream();
    let mut pending = Vec::new();
    let mut answer = String::new();
    let mut usage = json!({});
    let mut finished = false;
    while let Some(chunk) = stream.next().await {
        pending.extend_from_slice(&chunk.map_err(|e| e.to_string())?);
        while let Some(end) = pending.iter().position(|b| *b == b'\n') {
            let line = String::from_utf8_lossy(&pending[..end]).to_string();
            pending.drain(..=end);
            if let Some(data) = line.strip_prefix("data: ") {
                if data.trim() == "[DONE]" {
                    finished = true;
                }
                if let Ok(value) = serde_json::from_str::<Value>(data) {
                    if !value["error"].is_null() {
                        return Err(
                            "The model provider could not complete this request. Please try again."
                                .into(),
                        );
                    }
                    if let Some(delta) = value["choices"][0]["delta"]["content"].as_str() {
                        answer.push_str(delta);
                        let _ = channel.send(delta.to_owned());
                    }
                    if value["usage"].is_object() {
                        usage = value["usage"].clone();
                    }
                }
            }
        }
    }
    if !finished {
        return Err("The model response was interrupted. Please try again.".into());
    }
    let cost = usage["cost"].as_f64().unwrap_or(0.);
    {
        let mut s = state.lock().map_err(|e| e.to_string())?;
        let doc = s.document_mut(&document_id)?;
        doc.spend += cost;
        doc.activity.push(json!({"id":request_id,"timestamp":workspace::now(),"reason":"AI request","model":model,"cost":cost,"feature":feature}));
        s.persist()?;
    }
    Ok(json!({"text":answer,"usage":usage,"baseline":baseline}))
}
#[tauri::command]
async fn send_feedback(message: String) -> Result<(), String> {
    if message.trim().is_empty() || message.len() > 10000 {
        return Err("Write feedback between 1 and 10,000 characters.".into());
    }
    let response = reqwest::Client::new()
        .post("https://creed.md/api/feedback")
        .timeout(std::time::Duration::from_secs(20))
        .json(&json!({"message":message,"version":env!("CARGO_PKG_VERSION")}))
        .send()
        .await
        .map_err(|e| e.to_string())?;
    if response.status().is_success() {
        Ok(())
    } else {
        Err("Feedback could not be sent. Please try again.".into())
    }
}
fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_single_instance::init(|app, _, _| {
            #[cfg(target_os = "macos")]
            let _ = app.show();
            if let Some(window) = app.get_webview_window("main") {
                let _ = window.show();
                let _ = window.set_focus();
            }
        }))
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            mcp::ANALYSIS_ENABLED.store(cached_key().ok().flatten().is_some_and(|key| !key.is_empty()), Ordering::SeqCst);
            if updater_enabled(app.config().plugins.0.get("updater")) {
                app.handle()
                    .plugin(tauri_plugin_updater::Builder::new().build())?;
            }
            let directory = app.path().app_data_dir()?;
            let state = Arc::new(Mutex::new(
                Workspace::load(directory).map_err(std::io::Error::other)?,
            ));
            app.manage(state.clone());
            let handle = app.handle().clone();
            let health = state.clone();
            tauri::async_runtime::spawn(async move {
                if let Err(message) = mcp::serve(state).await {
                    if let Ok(mut state) = health.lock() {
                        state.mcp_error = Some(message.clone());
                    }
                    let _ = handle.emit("mcp-error", message);
                }
            });
            Ok(())
        })
        .on_window_event(|window, event| {
            if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                api.prevent_close();
                #[cfg(target_os = "macos")]
                let _ = window.app_handle().hide();
                #[cfg(not(target_os = "macos"))]
                let _ = window.hide();
            }
        })
        .invoke_handler(tauri::generate_handler![
            get_workspace,
            pick_document,
            choose_document_path,
            open_document_path,
            export_file,
            document_action,
            key_status,
            key_last_four,
            save_key,
            openrouter_balance,
            set_model,
            ai_request,
            cancel_ai,
            send_feedback,
            propose_from_panel,
            update_configured,
            bridge_path,
            open_external_link,
            finish_quit,
            frontend_ready
        ])
        .build(tauri::generate_context!())
        .expect("Creed could not start")
        .run(|app, event| {
            if let tauri::RunEvent::ExitRequested {
                code: None, api, ..
            } = &event
            {
                if FRONTEND_READY.load(Ordering::SeqCst) && !QUIT_READY.load(Ordering::SeqCst) {
                    api.prevent_exit();
                    #[cfg(target_os = "macos")]
                    let _ = app.show();
                    if let Some(window) = app.get_webview_window("main") {
                        let _ = window.show();
                    }
                    let _ = app.emit("before-quit", ());
                }
            }
            #[cfg(target_os = "macos")]
            if let tauri::RunEvent::Reopen { .. } = event {
                let _ = app.show();
                if let Some(window) = app.get_webview_window("main") {
                    let _ = window.show();
                    let _ = window.set_focus();
                }
            }
        });
}

#[cfg(test)]
mod startup_tests {
    use super::*;

    #[test]
    fn relocation_preserves_file_content_and_opens_the_existing_creed() {
        let directory = tempfile::tempdir().unwrap();
        let original = directory.path().join("original.md");
        let moved = directory.path().join("moved.md");
        let other = directory.path().join("other.md");
        let source = "## Identity\n\nKeep **everything**.\n";
        fs::write(&original, source).unwrap();
        fs::write(&other, "## Identity\n\nOther\n").unwrap();
        let mut workspace = Workspace::load(directory.path().join("state")).unwrap();
        let id = workspace.open(&original).unwrap();
        workspace.open(&other).unwrap();
        fs::rename(&original, &moved).unwrap();
        workspace.refresh().unwrap();
        assert!(workspace.document(&id).unwrap().missing);
        relocate_document(&mut workspace, id.clone(), moved.clone()).unwrap();
        assert_eq!(workspace.active_id.as_deref(), Some(id.as_str()));
        assert!(!workspace.document(&id).unwrap().missing);
        assert_eq!(fs::read_to_string(moved).unwrap(), source);
        assert!(!original.exists());
        assert_eq!(workspace.documents.len(), 2);
    }

    #[test]
    fn failed_relocation_leaves_the_association_and_active_creed_unchanged() {
        let directory = tempfile::tempdir().unwrap();
        let original = directory.path().join("original.md");
        fs::write(&original, "## Identity\n\nOriginal\n").unwrap();
        let mut workspace = Workspace::load(directory.path().join("state")).unwrap();
        let id = workspace.open(&original).unwrap();
        let before = serde_json::to_value(&workspace).unwrap();
        let missing = directory.path().join("missing.md");
        assert!(relocate_document(&mut workspace, id, missing.clone()).is_err());
        assert_eq!(serde_json::to_value(&workspace).unwrap(), before);
        assert!(!missing.exists());
    }

    #[test]
    fn credential_access_suppresses_macos_password_dialogs() {
        use security_framework::os::macos::keychain::SecKeychain;
        let _cache = key_cache().lock().unwrap();
        let interaction = SecKeychain::disable_user_interaction().unwrap();
        assert!(!SecKeychain::user_interaction_allowed().unwrap());
        drop(interaction);
        assert!(SecKeychain::user_interaction_allowed().unwrap());
    }

    #[test]
    fn keychain_is_read_once_including_missing_keys_and_denials() {
        for result in [Ok(Some("test-key".into())), Ok(None), Err("denied".into())] {
            let mut cache = None;
            assert_eq!(read_cached_key(&mut cache, || result.clone()), result);
            assert_eq!(
                read_cached_key(&mut cache, || panic!("must not reopen Keychain")),
                result
            );
        }
    }

    #[test]
    fn key_display_suffix_never_exposes_more_than_four_characters() {
        assert_eq!(display_key_suffix("sk-or-v1-abcdef"), "cdef");
        assert_eq!(display_key_suffix("abc"), "abc");
    }

    #[test]
    fn saving_a_key_authorizes_once_and_populates_the_read_cache() {
        let mut cache = None;
        let mut writes = 0;
        for value in ["first", "first", "second", "second"] {
            persist_cached_key(&mut cache, value, || {
                writes += 1;
                Ok(())
            })
            .unwrap();
            assert_eq!(
                read_cached_key(&mut cache, || panic!("must use saved cache")),
                Ok(Some(value.into()))
            );
        }
        assert_eq!(writes, 2);
    }

    #[test]
    fn cancelled_save_preserves_the_existing_key_and_allows_explicit_retry() {
        let mut cache = Some(Ok(Some("existing".into())));
        assert!(persist_cached_key(&mut cache, "replacement", || Err("cancelled".into())).is_err());
        assert_eq!(cache, Some(Ok(Some("existing".into()))));
        persist_cached_key(&mut cache, "replacement", || Ok(())).unwrap();
        assert_eq!(cache, Some(Ok(Some("replacement".into()))));
    }

    #[test]
    fn local_build_starts_without_updater_configuration() {
        let config: Value = serde_json::from_str(include_str!("../tauri.conf.json")).unwrap();
        assert!(!updater_enabled(config["plugins"].get("updater")));
        assert!(!updater_enabled(Some(&Value::Null)));
        assert!(!updater_enabled(Some(&json!({}))));
    }

    #[test]
    fn updater_requires_a_key_and_feed() {
        assert!(!updater_enabled(Some(&json!({"pubkey":""}))));
        assert!(!updater_enabled(Some(&json!({"pubkey":"test-key"}))));
        assert!(updater_enabled(Some(&json!({
            "pubkey":"test-key", "endpoints":["https://example.com/updates.json"]
        }))));
    }
}

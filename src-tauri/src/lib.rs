mod desktop_state;
mod integrations;
mod pet_store;
mod runtime;

use desktop_state::{DesktopState, DesktopStateSnapshot};
use integrations::{IntegrationManager, IntegrationSummary};
use pet_store::{PetStore, UserPet};
use runtime::{RuntimeEventBatch, RuntimeManager, RuntimeStatus};
use std::path::PathBuf;
use tauri::{
    menu::{Menu, MenuItem, PredefinedMenuItem},
    tray::TrayIconBuilder,
    AppHandle, Emitter, Manager, RunEvent, State, WindowEvent,
};

fn nuzzle_root() -> Result<PathBuf, String> {
    dirs::home_dir()
        .map(|home| home.join(".nuzzle"))
        .ok_or_else(|| "Could not find the home directory".to_string())
}

#[tauri::command]
fn show_companion(app: AppHandle) -> Result<(), String> {
    let window = app
        .get_webview_window("companion")
        .ok_or_else(|| "Companion window is unavailable".to_string())?;
    window.show().map_err(|error| error.to_string())?;
    window
        .set_always_on_top(true)
        .map_err(|error| error.to_string())?;
    Ok(())
}

#[tauri::command]
fn hide_companion(app: AppHandle) -> Result<(), String> {
    app.get_webview_window("companion")
        .ok_or_else(|| "Companion window is unavailable".to_string())?
        .hide()
        .map_err(|error| error.to_string())
}

#[tauri::command]
fn show_studio(app: AppHandle) -> Result<(), String> {
    let window = app
        .get_webview_window("main")
        .ok_or_else(|| "Studio window is unavailable".to_string())?;
    window.show().map_err(|error| error.to_string())?;
    window.set_focus().map_err(|error| error.to_string())
}

#[tauri::command]
fn set_companion_always_on_top(app: AppHandle, enabled: bool) -> Result<(), String> {
    app.get_webview_window("companion")
        .ok_or_else(|| "Companion window is unavailable".to_string())?
        .set_always_on_top(enabled)
        .map_err(|error| error.to_string())
}

#[tauri::command]
fn set_companion_size(app: AppHandle, width: f64, height: f64) -> Result<(), String> {
    let window = app
        .get_webview_window("companion")
        .ok_or_else(|| "Companion window is unavailable".to_string())?;
    window
        .set_size(tauri::Size::Logical(tauri::LogicalSize { width, height }))
        .map_err(|error| error.to_string())
}

#[tauri::command]
fn set_companion_position(app: AppHandle, x: f64, y: f64) -> Result<(), String> {
    let window = app
        .get_webview_window("companion")
        .ok_or_else(|| "Companion window is unavailable".to_string())?;
    window
        .set_position(tauri::Position::Logical(tauri::LogicalPosition { x, y }))
        .map_err(|error| error.to_string())
}

#[tauri::command]
fn set_companion_ignore_cursor(app: AppHandle, ignore: bool) -> Result<(), String> {
    let window = app
        .get_webview_window("companion")
        .ok_or_else(|| "Companion window is unavailable".to_string())?;
    window
        .set_ignore_cursor_events(ignore)
        .map_err(|error| error.to_string())
}

#[tauri::command]
fn get_runtime_status(runtime: State<'_, RuntimeManager>) -> RuntimeStatus {
    runtime.status()
}

#[tauri::command]
fn get_runtime_events(
    runtime: State<'_, RuntimeManager>,
    after_sequence: u64,
) -> RuntimeEventBatch {
    runtime.events_after(after_sequence)
}

#[tauri::command]
fn get_desktop_state(state: State<'_, DesktopState>) -> DesktopStateSnapshot {
    state.snapshot()
}

#[tauri::command]
fn select_native_pet(
    app: AppHandle,
    state: State<'_, DesktopState>,
    id: String,
) -> Result<DesktopStateSnapshot, String> {
    let snapshot = state.select_pet(&id).map_err(|error| error.to_string())?;
    // Push the change so other windows update instantly instead of polling.
    let _ = app.emit("nuzzle-pet-selected", &snapshot);
    Ok(snapshot)
}

async fn with_pet_store<T: Send + 'static>(
    task: impl FnOnce(PetStore) -> std::io::Result<T> + Send + 'static,
) -> Result<T, String> {
    tauri::async_runtime::spawn_blocking(move || task(PetStore::from_codex_home()?))
        .await
        .map_err(|error| error.to_string())?
        .map_err(|error| error.to_string())
}

#[tauri::command]
async fn list_user_pets() -> Result<Vec<UserPet>, String> {
    with_pet_store(|store| store.list()).await
}

#[tauri::command]
async fn install_catalog_pet(
    app: AppHandle,
    slug: String,
    name: String,
    description: String,
    sheet: String,
) -> Result<UserPet, String> {
    let pet =
        with_pet_store(move |store| store.install_from_catalog(&slug, &name, &description, &sheet))
            .await?;
    let _ = app.emit("nuzzle-user-pets-changed", &pet.id);
    Ok(pet)
}

#[tauri::command]
async fn save_custom_pet(
    app: AppHandle,
    name: String,
    description: String,
    image: String,
) -> Result<UserPet, String> {
    let pet = with_pet_store(move |store| store.save_custom(&name, &description, &image)).await?;
    let _ = app.emit("nuzzle-user-pets-changed", &pet.id);
    Ok(pet)
}

#[tauri::command]
async fn remove_user_pet(app: AppHandle, id: String) -> Result<(), String> {
    let removed = id.clone();
    with_pet_store(move |store| store.remove(&id)).await?;
    let _ = app.emit("nuzzle-user-pets-changed", &removed);
    Ok(())
}

/// Open a link in the default browser. Only known project and catalog hosts are allowed.
#[tauri::command]
fn open_url(url: String) -> Result<(), String> {
    const ALLOWED: [&str; 3] = [
        "https://codexpets.net/",
        "https://github.com/",
        "https://codex-pet-share.pages.dev/",
    ];
    if !ALLOWED.iter().any(|prefix| url.starts_with(prefix)) || url.chars().any(char::is_whitespace) {
        return Err("This link is not allowed".into());
    }
    std::process::Command::new("/usr/bin/open")
        .arg(url)
        .spawn()
        .map(|_| ())
        .map_err(|error| error.to_string())
}

#[tauri::command]
async fn reveal_user_pets() -> Result<(), String> {
    with_pet_store(|store| {
        std::fs::create_dir_all(store.root())?;
        std::process::Command::new("/usr/bin/open")
            .arg(store.root())
            .spawn()
            .map(|_| ())
    })
    .await
}

#[tauri::command]
fn list_integrations(
    manager: State<'_, IntegrationManager>,
) -> Result<Vec<IntegrationSummary>, String> {
    manager.list().map_err(|error| error.to_string())
}

#[tauri::command]
fn install_integration(
    manager: State<'_, IntegrationManager>,
    id: String,
) -> Result<IntegrationSummary, String> {
    manager.install(&id).map_err(|error| error.to_string())
}

#[tauri::command]
fn uninstall_integration(
    manager: State<'_, IntegrationManager>,
    id: String,
) -> Result<IntegrationSummary, String> {
    manager.uninstall(&id).map_err(|error| error.to_string())
}

fn build_tray(app: &tauri::App) -> tauri::Result<()> {
    let open_studio =
        MenuItem::with_id(app, "open-studio", "Open Nuzzle Studio", true, None::<&str>)?;
    let show_pet = MenuItem::with_id(
        app,
        "show-pet",
        "Show Floating Companion",
        true,
        None::<&str>,
    )?;
    let hide_pet = MenuItem::with_id(
        app,
        "hide-pet",
        "Hide Floating Companion",
        true,
        None::<&str>,
    )?;
    let quit = MenuItem::with_id(app, "quit", "Quit Nuzzle", true, None::<&str>)?;
    let separator = PredefinedMenuItem::separator(app)?;
    let menu = Menu::with_items(
        app,
        &[&open_studio, &show_pet, &hide_pet, &separator, &quit],
    )?;

    let mut builder = TrayIconBuilder::new()
        .tooltip("Nuzzle")
        .menu(&menu)
        .show_menu_on_left_click(true);
    if let Some(icon) = app.default_window_icon() {
        builder = builder.icon(icon.clone());
    }
    builder
        .on_menu_event(|app, event| match event.id().as_ref() {
            "open-studio" => {
                let _ = show_studio(app.clone());
            }
            "show-pet" => {
                let _ = show_companion(app.clone());
            }
            "hide-pet" => {
                let _ = hide_companion(app.clone());
            }
            "quit" => {
                if let Some(runtime) = app.try_state::<RuntimeManager>() {
                    runtime.shutdown();
                }
                app.exit(0);
            }
            _ => {}
        })
        .build(app)?;
    Ok(())
}

pub fn run() {
    tauri::Builder::default()
        .setup(|app| {
            let root = nuzzle_root().map_err(io_error)?;
            let manager = IntegrationManager::from_home(root.clone()).map_err(io_error)?;
            let emitter = app.handle().clone();
            let runtime = RuntimeManager::start(&root.join("runtime"), move |event| {
                let _ = emitter.emit("nuzzle-agent-event", event);
            })
            .map_err(io_error)?;
            app.manage(manager);
            app.manage(runtime);
            app.manage(DesktopState::load(&root));
            // Let the webviews load user pet sheets from the Codex pets folder only.
            if let Ok(store) = PetStore::from_codex_home() {
                let _ = std::fs::create_dir_all(store.root());
                let _ = app
                    .asset_protocol_scope()
                    .allow_directory(store.root(), true);
            }
            build_tray(app)?;

            if let Some(companion) = app.get_webview_window("companion") {
                let comp_to_hide = companion.clone();
                let comp_emitter = companion.clone();
                let last_x = std::sync::Arc::new(std::sync::atomic::AtomicI32::new(i32::MIN));

                companion.on_window_event(move |event| match event {
                    WindowEvent::CloseRequested { api, .. } => {
                        api.prevent_close();
                        let _ = comp_to_hide.hide();
                    }
                    WindowEvent::Moved(pos) => {
                        let prev = last_x.swap(pos.x, std::sync::atomic::Ordering::Relaxed);
                        let dx = if prev == i32::MIN { 0 } else { pos.x - prev };
                        let _ = comp_emitter.emit(
                            "companion-moved",
                            serde_json::json!({
                                "x": pos.x,
                                "y": pos.y,
                                "dx": dx
                            }),
                        );
                    }
                    _ => {}
                });
            }

            if let Some(main) = app.get_webview_window("main") {
                let main_to_hide = main.clone();
                main.on_window_event(move |event| {
                    if let WindowEvent::CloseRequested { api, .. } = event {
                        api.prevent_close();
                        let _ = main_to_hide.hide();
                    }
                });
            }
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            show_companion,
            hide_companion,
            show_studio,
            set_companion_always_on_top,
            set_companion_size,
            set_companion_position,
            set_companion_ignore_cursor,
            get_runtime_status,
            get_runtime_events,
            get_desktop_state,
            select_native_pet,
            list_integrations,
            install_integration,
            uninstall_integration,
            list_user_pets,
            install_catalog_pet,
            save_custom_pet,
            remove_user_pet,
            reveal_user_pets,
            open_url
        ])
        .build(tauri::generate_context!())
        .expect("failed to build Nuzzle")
        .run(|app, event| {
            if let RunEvent::Exit = event {
                if let Some(runtime) = app.try_state::<RuntimeManager>() {
                    runtime.shutdown();
                }
            }
        });
}

fn io_error(error: impl std::fmt::Display) -> Box<dyn std::error::Error> {
    Box::new(std::io::Error::other(error.to_string()))
}

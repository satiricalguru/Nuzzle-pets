mod desktop_state;
mod integrations;
mod runtime;

use desktop_state::{DesktopState, DesktopStateSnapshot};
use integrations::{IntegrationManager, IntegrationSummary};
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
    state: State<'_, DesktopState>,
    id: String,
) -> Result<DesktopStateSnapshot, String> {
    state.select_pet(&id).map_err(|error| error.to_string())
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
            set_companion_ignore_cursor,
            get_runtime_status,
            get_runtime_events,
            get_desktop_state,
            select_native_pet,
            list_integrations,
            install_integration,
            uninstall_integration
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

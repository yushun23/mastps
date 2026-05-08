// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::fs;
use std::path::Path;

// Learn more about Tauri commands at https://tauri.app/v1/guides/features/command
#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[tauri::command]
async fn create_project(name: String, path: String) -> Result<String, String> {
    let project_path = Path::new(&path).join(format!("{}.storyproj", name));

    // Create project directory
    fs::create_dir_all(&project_path).map_err(|e| e.to_string())?;

    // Create basic project structure
    let config = format!(r#"{{
  "name": "{}",
  "version": "1.0.0",
  "created": "{}",
  "chapters": []
}}"#, name, chrono::Utc::now().to_rfc3339());

    fs::write(project_path.join("project.json"), config).map_err(|e| e.to_string())?;

    Ok(format!("Project '{}' created successfully", name))
}

fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![greet, create_project])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
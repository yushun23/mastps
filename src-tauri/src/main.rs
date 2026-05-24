#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use chrono::Utc;
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::{Path, PathBuf};
use std::process::Command;
use tauri::Manager;
use uuid::Uuid;

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct ProjectManifest {
    id: String,
    name: String,
    created_at: String,
    updated_at: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct ProjectRecord {
    id: String,
    name: String,
    path: String,
    created_at: String,
    updated_at: String,
    exists: bool,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
struct DocumentRecord {
    id: String,
    title: String,
    created_at: String,
    updated_at: String,
}

fn manifest_path(project_path: &str) -> PathBuf {
    Path::new(project_path).join("project.json")
}

fn documents_dir(project_path: &str) -> PathBuf {
    Path::new(project_path).join("documents")
}

fn documents_index_path(project_path: &str) -> PathBuf {
    documents_dir(project_path).join("documents.json")
}

fn document_file_path(project_path: &str, document_id: &str) -> PathBuf {
    documents_dir(project_path).join(format!("{}.html", document_id))
}

fn legacy_document_path(project_path: &str) -> PathBuf {
    documents_dir(project_path).join("main.txt")
}

fn read_manifest_from(project_path: &str) -> Result<ProjectManifest, String> {
    let raw = fs::read_to_string(manifest_path(project_path)).map_err(|_| "项目文件未找到".to_string())?;
    serde_json::from_str(&raw).map_err(|e| format!("项目文件损坏：{}", e))
}

fn write_manifest(project_path: &str, manifest: &ProjectManifest) -> Result<(), String> {
    let raw = serde_json::to_string_pretty(manifest).map_err(|e| e.to_string())?;
    fs::write(manifest_path(project_path), raw).map_err(|e| e.to_string())
}

fn touch_project(project_path: &str) -> Result<ProjectManifest, String> {
    let mut manifest = read_manifest_from(project_path)?;
    manifest.updated_at = Utc::now().to_rfc3339();
    write_manifest(project_path, &manifest)?;
    Ok(manifest)
}

fn to_project_record(project_path: String, manifest: ProjectManifest) -> ProjectRecord {
    ProjectRecord {
        id: manifest.id,
        name: manifest.name,
        path: project_path,
        created_at: manifest.created_at,
        updated_at: manifest.updated_at,
        exists: true,
    }
}

fn safe_document_id(document_id: &str) -> Result<String, String> {
    let clean = document_id.trim();
    if clean.is_empty() {
        return Err("文档编号不能为空".to_string());
    }
    if clean.chars().all(|c| c.is_ascii_alphanumeric() || c == '-' || c == '_') {
        Ok(clean.to_string())
    } else {
        Err("文档编号非法".to_string())
    }
}

fn read_documents_index(project_path: &str) -> Result<Vec<DocumentRecord>, String> {
    fs::create_dir_all(documents_dir(project_path)).map_err(|e| e.to_string())?;
    let index_path = documents_index_path(project_path);
    if index_path.exists() {
        let raw = fs::read_to_string(index_path).map_err(|e| e.to_string())?;
        let docs: Vec<DocumentRecord> = serde_json::from_str(&raw).map_err(|e| format!("文档目录损坏：{}", e))?;
        return Ok(docs);
    }

    let now = Utc::now().to_rfc3339();
    let initial = DocumentRecord {
        id: "main".to_string(),
        title: "正文".to_string(),
        created_at: now.clone(),
        updated_at: now.clone(),
    };

    let legacy_path = legacy_document_path(project_path);
    let main_file = document_file_path(project_path, "main");
    if !main_file.exists() {
        let legacy_content = fs::read_to_string(&legacy_path).unwrap_or_default();
        fs::write(&main_file, legacy_content).map_err(|e| e.to_string())?;
    }

    write_documents_index(project_path, &[initial.clone()])?;
    Ok(vec![initial])
}

fn write_documents_index(project_path: &str, docs: &[DocumentRecord]) -> Result<(), String> {
    fs::create_dir_all(documents_dir(project_path)).map_err(|e| e.to_string())?;
    let raw = serde_json::to_string_pretty(docs).map_err(|e| e.to_string())?;
    fs::write(documents_index_path(project_path), raw).map_err(|e| e.to_string())
}

#[tauri::command]
fn choose_folder(prompt: Option<String>) -> Result<Option<String>, String> {
    #[cfg(target_os = "macos")]
    {
        let message = prompt.unwrap_or_else(|| "请选择文件夹".to_string()).replace('"', "'");
        let script = format!("POSIX path of (choose folder with prompt \"{}\")", message);
        let output = Command::new("osascript")
            .arg("-e")
            .arg(script)
            .output()
            .map_err(|e| format!("无法打开文件夹选择器：{}", e))?;

        if output.status.success() {
            let path = String::from_utf8_lossy(&output.stdout).trim().to_string();
            if path.is_empty() { Ok(None) } else { Ok(Some(path.trim_end_matches('/').to_string())) }
        } else {
            let err = String::from_utf8_lossy(&output.stderr).to_string();
            if err.contains("User canceled") || err.contains("-128") {
                Ok(None)
            } else {
                Err(format!("选择文件夹失败：{}", err.trim()))
            }
        }
    }

    #[cfg(not(target_os = "macos"))]
    {
        let _ = prompt;
        Err("当前补丁的文件夹选择器只针对 macOS。".to_string())
    }
}

#[tauri::command]
fn create_project(name: String, parent_path: String) -> Result<ProjectRecord, String> {
    let clean_name = name.trim();
    if clean_name.is_empty() {
        return Err("项目名称不能为空".to_string());
    }

    let parent = Path::new(parent_path.trim());
    if parent.as_os_str().is_empty() {
        return Err("存档位置不能为空".to_string());
    }

    let id = Uuid::new_v4().to_string();
    let safe_name: String = clean_name
        .chars()
        .map(|ch| match ch {
            '/' | '\\' | ':' | '*' | '?' | '"' | '<' | '>' | '|' => '_',
            _ => ch,
        })
        .collect();
    let project_path = parent.join(format!("{} - {}.masterpiece", safe_name, &id[..8]));
    fs::create_dir_all(documents_dir(project_path.to_string_lossy().as_ref())).map_err(|e| e.to_string())?;

    let now = Utc::now().to_rfc3339();
    let manifest = ProjectManifest {
        id: id.clone(),
        name: clean_name.to_string(),
        created_at: now.clone(),
        updated_at: now.clone(),
    };
    write_manifest(project_path.to_string_lossy().as_ref(), &manifest)?;

    let initial_doc = DocumentRecord {
        id: "main".to_string(),
        title: "正文".to_string(),
        created_at: now.clone(),
        updated_at: now.clone(),
    };
    write_documents_index(project_path.to_string_lossy().as_ref(), &[initial_doc])?;
    fs::write(document_file_path(project_path.to_string_lossy().as_ref(), "main"), "").map_err(|e| e.to_string())?;

    Ok(ProjectRecord {
        id,
        name: clean_name.to_string(),
        path: project_path.to_string_lossy().to_string(),
        created_at: now.clone(),
        updated_at: now,
        exists: true,
    })
}

#[tauri::command]
fn import_project(path: String) -> Result<ProjectRecord, String> {
    let clean_path = path.trim().to_string();
    let manifest = read_manifest_from(&clean_path)?;
    let _ = read_documents_index(&clean_path)?;
    Ok(to_project_record(clean_path, manifest))
}

#[tauri::command]
fn read_project_manifest(path: String) -> Result<ProjectManifest, String> {
    read_manifest_from(&path)
}

#[tauri::command]
fn rename_project(path: String, name: String) -> Result<ProjectManifest, String> {
    let clean_name = name.trim();
    if clean_name.is_empty() {
        return Err("项目名称不能为空".to_string());
    }
    let mut manifest = read_manifest_from(&path)?;
    manifest.name = clean_name.to_string();
    manifest.updated_at = Utc::now().to_rfc3339();
    write_manifest(&path, &manifest)?;
    Ok(manifest)
}

#[tauri::command]
fn list_documents(path: String) -> Result<Vec<DocumentRecord>, String> {
    read_documents_index(&path)
}

#[tauri::command]
fn create_document(path: String, title: String) -> Result<Vec<DocumentRecord>, String> {
    let clean_title = title.trim();
    if clean_title.is_empty() {
        return Err("文档名称不能为空".to_string());
    }
    let mut docs = read_documents_index(&path)?;
    let now = Utc::now().to_rfc3339();
    let doc = DocumentRecord {
        id: Uuid::new_v4().to_string(),
        title: clean_title.to_string(),
        created_at: now.clone(),
        updated_at: now.clone(),
    };
    fs::write(document_file_path(&path, &doc.id), "").map_err(|e| e.to_string())?;
    docs.push(doc);
    write_documents_index(&path, &docs)?;
    let _ = touch_project(&path)?;
    Ok(docs)
}

#[tauri::command]
fn rename_document(path: String, document_id: String, title: String) -> Result<Vec<DocumentRecord>, String> {
    let doc_id = safe_document_id(&document_id)?;
    let clean_title = title.trim();
    if clean_title.is_empty() {
        return Err("文档名称不能为空".to_string());
    }
    let mut docs = read_documents_index(&path)?;
    let now = Utc::now().to_rfc3339();
    let mut found = false;
    for doc in &mut docs {
        if doc.id == doc_id {
            doc.title = clean_title.to_string();
            doc.updated_at = now.clone();
            found = true;
        }
    }
    if !found {
        return Err("文档未找到".to_string());
    }
    write_documents_index(&path, &docs)?;
    let _ = touch_project(&path)?;
    Ok(docs)
}

#[tauri::command]
fn delete_document(path: String, document_id: String) -> Result<Vec<DocumentRecord>, String> {
    let doc_id = safe_document_id(&document_id)?;
    if doc_id == "main" {
        return Err("正文文档不能删除".to_string());
    }
    let mut docs = read_documents_index(&path)?;
    let before = docs.len();
    docs.retain(|doc| doc.id != doc_id);
    if docs.len() == before {
        return Err("文档未找到".to_string());
    }
    let file_path = document_file_path(&path, &doc_id);
    if file_path.exists() {
        fs::remove_file(file_path).map_err(|e| e.to_string())?;
    }
    write_documents_index(&path, &docs)?;
    let _ = touch_project(&path)?;
    Ok(docs)
}

#[tauri::command]
fn read_document(path: String, document_id: String) -> Result<String, String> {
    let doc_id = safe_document_id(&document_id)?;
    let doc_path = document_file_path(&path, &doc_id);
    if !doc_path.exists() {
        return Ok(String::new());
    }
    fs::read_to_string(doc_path).map_err(|e| e.to_string())
}

#[tauri::command]
fn save_document(path: String, document_id: String, content: String) -> Result<ProjectManifest, String> {
    let doc_id = safe_document_id(&document_id)?;
    fs::create_dir_all(documents_dir(&path)).map_err(|e| e.to_string())?;
    fs::write(document_file_path(&path, &doc_id), content).map_err(|e| e.to_string())?;

    let mut docs = read_documents_index(&path)?;
    let now = Utc::now().to_rfc3339();
    for doc in &mut docs {
        if doc.id == doc_id {
            doc.updated_at = now.clone();
        }
    }
    write_documents_index(&path, &docs)?;
    touch_project(&path)
}

#[tauri::command]
fn read_main_document(path: String) -> Result<String, String> {
    read_document(path, "main".to_string())
}

#[tauri::command]
fn save_main_document(path: String, content: String) -> Result<ProjectManifest, String> {
    save_document(path, "main".to_string(), content)
}

fn main() {
    // 崩溃日志：捕获 panic 并输出到 stderr
    std::panic::set_hook(Box::new(|info| {
        eprintln!("[mastps PANIC] {}", info);
        if let Some(loc) = info.location() {
            eprintln!("[mastps PANIC] at {}:{}", loc.file(), loc.line());
        }
        let bt = std::backtrace::Backtrace::force_capture();
        eprintln!("[mastps PANIC] backtrace:\n{}", bt);
    }));

    eprintln!("[mastps] main() starting...");

    tauri::Builder::default()
        .setup(|app| {
            eprintln!("[mastps] setup() called");
            // 手动创建窗口，使用外部 URL 指向 Vite dev server
            match tauri::WebviewWindowBuilder::new(
                app,
                "main",
                tauri::WebviewUrl::External("http://localhost:1420/".parse().unwrap()),
            )
            .title("MasterPieces")
            .inner_size(1280.0, 820.0)
            .center()
            .resizable(true)
            .visible(true)
            .build()
            {
                Ok(win) => {
                    eprintln!("[mastps] Window created OK: {:?}", win.label());
                    let label = win.label().to_string();
                    win.on_window_event(move |event| {
                        if let tauri::WindowEvent::CloseRequested { .. } = event {
                            eprintln!("[mastps] Window '{}' close requested!", label);
                        }
                    });
                }
                Err(e) => {
                    eprintln!("[mastps] Window build ERROR: {:?}", e);
                    return Err(Box::new(e));
                }
            }
            eprintln!("[mastps] setup() complete.");
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            choose_folder,
            create_project,
            import_project,
            read_project_manifest,
            rename_project,
            list_documents,
            create_document,
            rename_document,
            delete_document,
            read_document,
            save_document,
            read_main_document,
            save_main_document
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

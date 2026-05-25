use chrono::Utc;
use serde::{Deserialize, Serialize};
use std::{
    fs,
    path::{Path, PathBuf},
    process::Command,
};
use uuid::Uuid;

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
struct ProjectRecord {
    id: String,
    name: String,
    path: String,
    created_at: String,
    updated_at: String,
    exists: Option<bool>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
struct ProjectManifest {
    id: String,
    name: String,
    created_at: String,
    updated_at: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
struct DocumentRecord {
    id: String,
    title: String,
    created_at: String,
    updated_at: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
struct BinderNode {
    id: String,
    title: String,
    icon: String,
    created_at: String,
    updated_at: String,
    children: Vec<BinderNode>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
struct BinderRoot {
    id: String,
    title: String,
    icon: String,
    children: Vec<BinderNode>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
struct BinderState {
    draft: BinderRoot,
    outline: BinderRoot,
}

#[derive(Debug, Clone, Copy)]
enum CollectionKind {
    Manuscript,
    Outline,
}

impl CollectionKind {
    fn from_binder_collection(value: &str) -> Result<Self, String> {
        match value {
            "draft" => Ok(Self::Manuscript),
            "outline" => Ok(Self::Outline),
            _ => Err(format!("未知写作集合：{}", value)),
        }
    }
}

fn now() -> String {
    Utc::now().to_rfc3339()
}

fn clean_component(value: &str) -> String {
    value
        .trim()
        .chars()
        .map(|ch| match ch {
            '/' | '\\' | ':' | '*' | '?' | '"' | '<' | '>' | '|' => '_',
            _ => ch,
        })
        .collect()
}

fn manifest_path(project_path: &str) -> PathBuf {
    Path::new(project_path).join("manifest.json")
}

fn documents_dir(project_path: &str) -> PathBuf {
    Path::new(project_path).join("documents")
}

fn outlines_dir(project_path: &str) -> PathBuf {
    Path::new(project_path).join("outlines")
}

fn binder_documents_dir(project_path: &str) -> PathBuf {
    Path::new(project_path).join("binder_documents")
}

fn binder_path(project_path: &str) -> PathBuf {
    Path::new(project_path).join("binder.json")
}

fn collection_dir(project_path: &str, kind: CollectionKind) -> PathBuf {
    match kind {
        CollectionKind::Manuscript => documents_dir(project_path),
        CollectionKind::Outline => outlines_dir(project_path),
    }
}

fn collection_index_path(project_path: &str, kind: CollectionKind) -> PathBuf {
    collection_dir(project_path, kind).join("index.json")
}

fn collection_document_path(project_path: &str, kind: CollectionKind, document_id: &str) -> PathBuf {
    collection_dir(project_path, kind).join(format!("{}.html", document_id))
}

fn binder_document_path(project_path: &str, document_id: &str) -> PathBuf {
    binder_documents_dir(project_path).join(format!("{}.html", document_id))
}

fn read_manifest_from(path: &str) -> Result<ProjectManifest, String> {
    let file = manifest_path(path);
    let raw = fs::read_to_string(&file).map_err(|e| format!("无法读取项目清单 {}：{}", file.display(), e))?;
    serde_json::from_str(&raw).map_err(|e| format!("项目清单格式错误：{}", e))
}

fn write_manifest(path: &str, manifest: &ProjectManifest) -> Result<(), String> {
    let file = manifest_path(path);
    fs::create_dir_all(Path::new(path)).map_err(|e| e.to_string())?;
    let raw = serde_json::to_string_pretty(manifest).map_err(|e| e.to_string())?;
    fs::write(&file, raw).map_err(|e| format!("无法写入项目清单 {}：{}", file.display(), e))
}

fn touch_manifest(path: &str) -> Result<ProjectManifest, String> {
    let mut manifest = read_manifest_from(path)?;
    manifest.updated_at = now();
    write_manifest(path, &manifest)?;
    Ok(manifest)
}

fn manifest_to_record(path: &str, manifest: ProjectManifest) -> ProjectRecord {
    ProjectRecord {
        id: manifest.id,
        name: manifest.name,
        path: path.to_string(),
        created_at: manifest.created_at,
        updated_at: manifest.updated_at,
        exists: Some(true),
    }
}

fn ensure_project_dirs(project_path: &str) -> Result<(), String> {
    fs::create_dir_all(documents_dir(project_path)).map_err(|e| e.to_string())?;
    fs::create_dir_all(outlines_dir(project_path)).map_err(|e| e.to_string())?;
    fs::create_dir_all(binder_documents_dir(project_path)).map_err(|e| e.to_string())?;
    Ok(())
}

fn read_collection_index(project_path: &str, kind: CollectionKind) -> Result<Vec<DocumentRecord>, String> {
    let file = collection_index_path(project_path, kind);
    if !file.exists() {
        return Ok(Vec::new());
    }
    let raw = fs::read_to_string(&file).map_err(|e| format!("无法读取文档索引 {}：{}", file.display(), e))?;
    serde_json::from_str(&raw).map_err(|e| format!("文档索引格式错误：{}", e))
}

fn write_collection_index(project_path: &str, kind: CollectionKind, documents: &[DocumentRecord]) -> Result<(), String> {
    let dir = collection_dir(project_path, kind);
    fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    let file = collection_index_path(project_path, kind);
    let raw = serde_json::to_string_pretty(documents).map_err(|e| e.to_string())?;
    fs::write(&file, raw).map_err(|e| format!("无法写入文档索引 {}：{}", file.display(), e))
}

fn create_collection_document(project_path: &str, kind: CollectionKind, title: String) -> Result<Vec<DocumentRecord>, String> {
    let clean_title = title.trim();
    if clean_title.is_empty() {
        return Err("文档标题不能为空".to_string());
    }
    ensure_project_dirs(project_path)?;
    let mut documents = read_collection_index(project_path, kind)?;
    let timestamp = now();
    let id = Uuid::new_v4().to_string();
    let record = DocumentRecord {
        id: id.clone(),
        title: clean_title.to_string(),
        created_at: timestamp.clone(),
        updated_at: timestamp,
    };
    let file = collection_document_path(project_path, kind, &id);
    fs::write(&file, "").map_err(|e| format!("无法创建文档 {}：{}", file.display(), e))?;
    documents.push(record);
    write_collection_index(project_path, kind, &documents)?;
    let _ = touch_manifest(project_path);
    Ok(documents)
}

fn rename_collection_document(project_path: &str, kind: CollectionKind, document_id: String, title: String) -> Result<Vec<DocumentRecord>, String> {
    let clean_title = title.trim();
    if clean_title.is_empty() {
        return Err("文档标题不能为空".to_string());
    }
    let mut documents = read_collection_index(project_path, kind)?;
    let mut found = false;
    for doc in &mut documents {
        if doc.id == document_id {
            doc.title = clean_title.to_string();
            doc.updated_at = now();
            found = true;
            break;
        }
    }
    if !found {
        return Err("未找到该文档".to_string());
    }
    write_collection_index(project_path, kind, &documents)?;
    let _ = touch_manifest(project_path);
    Ok(documents)
}

fn delete_collection_document(project_path: &str, kind: CollectionKind, document_id: String) -> Result<Vec<DocumentRecord>, String> {
    let mut documents = read_collection_index(project_path, kind)?;
    documents.retain(|doc| doc.id != document_id);
    let file = collection_document_path(project_path, kind, &document_id);
    if file.exists() {
        let _ = fs::remove_file(file);
    }
    write_collection_index(project_path, kind, &documents)?;
    let _ = touch_manifest(project_path);
    Ok(documents)
}

fn read_collection_document(project_path: &str, kind: CollectionKind, document_id: String) -> Result<String, String> {
    let file = collection_document_path(project_path, kind, &document_id);
    if !file.exists() {
        return Ok(String::new());
    }
    fs::read_to_string(&file).map_err(|e| format!("无法读取文档 {}：{}", file.display(), e))
}

fn save_collection_document(project_path: &str, kind: CollectionKind, document_id: String, content: String) -> Result<ProjectManifest, String> {
    ensure_project_dirs(project_path)?;
    let file = collection_document_path(project_path, kind, &document_id);
    fs::write(&file, content).map_err(|e| format!("无法保存文档 {}：{}", file.display(), e))?;
    let mut documents = read_collection_index(project_path, kind)?;
    for doc in &mut documents {
        if doc.id == document_id {
            doc.updated_at = now();
        }
    }
    write_collection_index(project_path, kind, &documents)?;
    touch_manifest(project_path)
}

fn default_node(project_path: &str, title: &str, icon: &str) -> Result<BinderNode, String> {
    let timestamp = now();
    let id = Uuid::new_v4().to_string();
    let file = binder_document_path(project_path, &id);
    fs::write(&file, "").map_err(|e| format!("无法创建文稿 {}：{}", file.display(), e))?;
    Ok(BinderNode {
        id,
        title: title.to_string(),
        icon: icon.to_string(),
        created_at: timestamp.clone(),
        updated_at: timestamp,
        children: Vec::new(),
    })
}

fn legacy_nodes(project_path: &str, kind: CollectionKind) -> Vec<BinderNode> {
    let docs = read_collection_index(project_path, kind).unwrap_or_default();
    docs.into_iter()
        .map(|doc| {
            let legacy = collection_document_path(project_path, kind, &doc.id);
            let target = binder_document_path(project_path, &doc.id);
            if legacy.exists() && !target.exists() {
                let _ = fs::copy(&legacy, &target);
            }
            BinderNode {
                id: doc.id,
                title: doc.title,
                icon: match kind {
                    CollectionKind::Manuscript => "▦".to_string(),
                    CollectionKind::Outline => "◇".to_string(),
                },
                created_at: doc.created_at,
                updated_at: doc.updated_at,
                children: Vec::new(),
            }
        })
        .collect()
}

fn build_default_binder_state(project_path: &str) -> Result<BinderState, String> {
    ensure_project_dirs(project_path)?;
    let mut draft_children = legacy_nodes(project_path, CollectionKind::Manuscript);
    let mut outline_children = legacy_nodes(project_path, CollectionKind::Outline);

    if draft_children.is_empty() {
        draft_children.push(default_node(project_path, "正文", "▦")?);
    }
    if outline_children.is_empty() {
        outline_children.push(default_node(project_path, "自由写作", "◇")?);
    }

    Ok(BinderState {
        draft: BinderRoot {
            id: "draft-root".to_string(),
            title: "草稿".to_string(),
            icon: "📚".to_string(),
            children: draft_children,
        },
        outline: BinderRoot {
            id: "outline-root".to_string(),
            title: "大纲".to_string(),
            icon: "🧭".to_string(),
            children: outline_children,
        },
    })
}

fn read_binder_state(project_path: &str) -> Result<BinderState, String> {
    ensure_project_dirs(project_path)?;
    let file = binder_path(project_path);
    if !file.exists() {
        let state = build_default_binder_state(project_path)?;
        write_binder_state(project_path, &state)?;
        return Ok(state);
    }
    let raw = fs::read_to_string(&file).map_err(|e| format!("无法读取 Binder {}：{}", file.display(), e))?;
    serde_json::from_str(&raw).map_err(|e| format!("Binder 格式错误：{}", e))
}

fn write_binder_state(project_path: &str, state: &BinderState) -> Result<(), String> {
    ensure_project_dirs(project_path)?;
    let file = binder_path(project_path);
    let raw = serde_json::to_string_pretty(state).map_err(|e| e.to_string())?;
    fs::write(&file, raw).map_err(|e| format!("无法写入 Binder {}：{}", file.display(), e))
}

fn root_mut<'a>(state: &'a mut BinderState, collection: &str) -> Result<&'a mut BinderRoot, String> {
    match collection {
        "draft" => Ok(&mut state.draft),
        "outline" => Ok(&mut state.outline),
        _ => Err(format!("未知写作集合：{}", collection)),
    }
}

fn add_child_to(nodes: &mut Vec<BinderNode>, parent_id: &str, child: BinderNode) -> bool {
    for node in nodes.iter_mut() {
        if node.id == parent_id {
            node.children.push(child);
            node.updated_at = now();
            return true;
        }
        if add_child_to(&mut node.children, parent_id, child.clone()) {
            return true;
        }
    }
    false
}

fn rename_node(nodes: &mut [BinderNode], document_id: &str, title: &str, icon: &str) -> bool {
    for node in nodes.iter_mut() {
        if node.id == document_id {
            node.title = title.to_string();
            node.icon = icon.to_string();
            node.updated_at = now();
            return true;
        }
        if rename_node(&mut node.children, document_id, title, icon) {
            return true;
        }
    }
    false
}

fn touch_node(nodes: &mut [BinderNode], document_id: &str) -> bool {
    for node in nodes.iter_mut() {
        if node.id == document_id {
            node.updated_at = now();
            return true;
        }
        if touch_node(&mut node.children, document_id) {
            return true;
        }
    }
    false
}

fn collect_node_ids(node: &BinderNode, ids: &mut Vec<String>) {
    ids.push(node.id.clone());
    for child in &node.children {
        collect_node_ids(child, ids);
    }
}

fn remove_node(nodes: &mut Vec<BinderNode>, document_id: &str, removed_ids: &mut Vec<String>) -> bool {
    if let Some(position) = nodes.iter().position(|node| node.id == document_id) {
        let node = nodes.remove(position);
        collect_node_ids(&node, removed_ids);
        return true;
    }
    for node in nodes.iter_mut() {
        if remove_node(&mut node.children, document_id, removed_ids) {
            node.updated_at = now();
            return true;
        }
    }
    false
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
            if path.is_empty() {
                Ok(None)
            } else {
                Ok(Some(path.trim_end_matches('/').to_string()))
            }
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
    fs::create_dir_all(parent).map_err(|e| format!("无法创建存档文件夹：{}", e))?;

    let id = Uuid::new_v4().to_string();
    let safe_name = clean_component(clean_name);
    let project_path = parent.join(format!("{} - {}.masterpiece", safe_name, &id[..8]));
    let project_path_string = project_path.to_string_lossy().to_string();
    fs::create_dir_all(&project_path).map_err(|e| format!("无法创建项目目录：{}", e))?;
    ensure_project_dirs(&project_path_string)?;

    let timestamp = now();
    let manifest = ProjectManifest {
        id,
        name: clean_name.to_string(),
        created_at: timestamp.clone(),
        updated_at: timestamp,
    };
    write_manifest(&project_path_string, &manifest)?;
    let state = build_default_binder_state(&project_path_string)?;
    write_binder_state(&project_path_string, &state)?;
    Ok(manifest_to_record(&project_path_string, manifest))
}

#[tauri::command]
fn import_project(path: String) -> Result<ProjectRecord, String> {
    let clean_path = path.trim().trim_end_matches('/').to_string();
    let manifest = read_manifest_from(&clean_path)?;
    ensure_project_dirs(&clean_path)?;
    Ok(manifest_to_record(&clean_path, manifest))
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
    manifest.updated_at = now();
    write_manifest(&path, &manifest)?;
    Ok(manifest)
}

#[tauri::command]
fn list_documents(path: String) -> Result<Vec<DocumentRecord>, String> {
    read_collection_index(&path, CollectionKind::Manuscript)
}

#[tauri::command]
fn create_document(path: String, title: String) -> Result<Vec<DocumentRecord>, String> {
    create_collection_document(&path, CollectionKind::Manuscript, title)
}

#[tauri::command]
fn rename_document(path: String, document_id: String, title: String) -> Result<Vec<DocumentRecord>, String> {
    rename_collection_document(&path, CollectionKind::Manuscript, document_id, title)
}

#[tauri::command]
fn delete_document(path: String, document_id: String) -> Result<Vec<DocumentRecord>, String> {
    delete_collection_document(&path, CollectionKind::Manuscript, document_id)
}

#[tauri::command]
fn read_document(path: String, document_id: String) -> Result<String, String> {
    read_collection_document(&path, CollectionKind::Manuscript, document_id)
}

#[tauri::command]
fn save_document(path: String, document_id: String, content: String) -> Result<ProjectManifest, String> {
    save_collection_document(&path, CollectionKind::Manuscript, document_id, content)
}

#[tauri::command]
fn list_outline_documents(path: String) -> Result<Vec<DocumentRecord>, String> {
    read_collection_index(&path, CollectionKind::Outline)
}

#[tauri::command]
fn create_outline_document(path: String, title: String) -> Result<Vec<DocumentRecord>, String> {
    create_collection_document(&path, CollectionKind::Outline, title)
}

#[tauri::command]
fn rename_outline_document(path: String, document_id: String, title: String) -> Result<Vec<DocumentRecord>, String> {
    rename_collection_document(&path, CollectionKind::Outline, document_id, title)
}

#[tauri::command]
fn delete_outline_document(path: String, document_id: String) -> Result<Vec<DocumentRecord>, String> {
    delete_collection_document(&path, CollectionKind::Outline, document_id)
}

#[tauri::command]
fn read_outline_document(path: String, document_id: String) -> Result<String, String> {
    read_collection_document(&path, CollectionKind::Outline, document_id)
}

#[tauri::command]
fn save_outline_document(path: String, document_id: String, content: String) -> Result<ProjectManifest, String> {
    save_collection_document(&path, CollectionKind::Outline, document_id, content)
}

#[tauri::command]
fn read_main_document(path: String) -> Result<String, String> {
    let file = documents_dir(&path).join("main.html");
    if !file.exists() {
        return Ok(String::new());
    }
    fs::read_to_string(&file).map_err(|e| format!("无法读取正文：{}", e))
}

#[tauri::command]
fn save_main_document(path: String, content: String) -> Result<ProjectManifest, String> {
    ensure_project_dirs(&path)?;
    let file = documents_dir(&path).join("main.html");
    fs::write(&file, content).map_err(|e| format!("无法保存正文：{}", e))?;
    touch_manifest(&path)
}

#[tauri::command]
fn read_binder(path: String) -> Result<BinderState, String> {
    read_binder_state(&path)
}

#[tauri::command]
fn update_binder_root(path: String, collection: String, title: String, icon: String) -> Result<BinderState, String> {
    let clean_title = title.trim();
    if clean_title.is_empty() {
        return Err("根目录名称不能为空".to_string());
    }
    let mut state = read_binder_state(&path)?;
    let root = root_mut(&mut state, &collection)?;
    root.title = clean_title.to_string();
    root.icon = if icon.trim().is_empty() { "📚".to_string() } else { icon.trim().to_string() };
    write_binder_state(&path, &state)?;
    let _ = touch_manifest(&path);
    Ok(state)
}

#[tauri::command]
fn create_binder_document(
    path: String,
    collection: String,
    parent_id: Option<String>,
    title: String,
    icon: String,
) -> Result<BinderState, String> {
    let clean_title = title.trim();
    if clean_title.is_empty() {
        return Err("文稿标题不能为空".to_string());
    }
    let _ = CollectionKind::from_binder_collection(&collection)?;
    let mut state = read_binder_state(&path)?;
    let child = default_node(
        &path,
        clean_title,
        if icon.trim().is_empty() { "▦" } else { icon.trim() },
    )?;
    let root = root_mut(&mut state, &collection)?;
    match parent_id.as_deref() {
        None => root.children.push(child),
        Some(id) if id == root.id => root.children.push(child),
        Some(id) => {
            if !add_child_to(&mut root.children, id, child) {
                return Err("未找到父文稿".to_string());
            }
        }
    }
    write_binder_state(&path, &state)?;
    let _ = touch_manifest(&path);
    Ok(state)
}

#[tauri::command]
fn rename_binder_document(
    path: String,
    collection: String,
    document_id: String,
    title: String,
    icon: String,
) -> Result<BinderState, String> {
    let clean_title = title.trim();
    if clean_title.is_empty() {
        return Err("文稿标题不能为空".to_string());
    }
    let mut state = read_binder_state(&path)?;
    let root = root_mut(&mut state, &collection)?;
    if !rename_node(
        &mut root.children,
        &document_id,
        clean_title,
        if icon.trim().is_empty() { "▦" } else { icon.trim() },
    ) {
        return Err("未找到该文稿".to_string());
    }
    write_binder_state(&path, &state)?;
    let _ = touch_manifest(&path);
    Ok(state)
}

#[tauri::command]
fn delete_binder_document(path: String, collection: String, document_id: String) -> Result<BinderState, String> {
    let mut state = read_binder_state(&path)?;
    let root = root_mut(&mut state, &collection)?;
    let mut removed_ids = Vec::new();
    if !remove_node(&mut root.children, &document_id, &mut removed_ids) {
        return Err("未找到该文稿".to_string());
    }
    for id in removed_ids {
        let file = binder_document_path(&path, &id);
        if file.exists() {
            let _ = fs::remove_file(file);
        }
    }
    write_binder_state(&path, &state)?;
    let _ = touch_manifest(&path);
    Ok(state)
}

#[tauri::command]
fn read_binder_document(path: String, document_id: String) -> Result<String, String> {
    ensure_project_dirs(&path)?;
    let file = binder_document_path(&path, &document_id);
    if !file.exists() {
        return Ok(String::new());
    }
    fs::read_to_string(&file).map_err(|e| format!("无法读取文稿 {}：{}", file.display(), e))
}

#[tauri::command]
fn save_binder_document(path: String, document_id: String, content: String) -> Result<ProjectManifest, String> {
    ensure_project_dirs(&path)?;
    let file = binder_document_path(&path, &document_id);
    fs::write(&file, content).map_err(|e| format!("无法保存文稿 {}：{}", file.display(), e))?;
    if let Ok(mut state) = read_binder_state(&path) {
        let mut changed = touch_node(&mut state.draft.children, &document_id);
        changed = touch_node(&mut state.outline.children, &document_id) || changed;
        if changed {
            let _ = write_binder_state(&path, &state);
        }
    }
    touch_manifest(&path)
}

fn main() {
    tauri::Builder::default()
        .setup(|app| {
            let url = if cfg!(debug_assertions) {
                tauri::WebviewUrl::External("http://localhost:1420/".parse().unwrap())
            } else {
                tauri::WebviewUrl::App("index.html".into())
            };
            tauri::WebviewWindowBuilder::new(app, "main", url)
                .title("MasterPieces")
                .inner_size(1360.0, 860.0)
                .center()
                .resizable(true)
                .visible(true)
                .build()?;
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
            list_outline_documents,
            create_outline_document,
            rename_outline_document,
            delete_outline_document,
            read_outline_document,
            save_outline_document,
            read_main_document,
            save_main_document,
            read_binder,
            update_binder_root,
            create_binder_document,
            rename_binder_document,
            delete_binder_document,
            read_binder_document,
            save_binder_document
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

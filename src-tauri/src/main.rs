use chrono::Utc;
use tauri_plugin_dialog::DialogExt;
use serde::{Deserialize, Serialize};
use std::{
    env,
    fs::{self, File},
    io::{self, Seek, Write},
    path::{Path, PathBuf},
};
use uuid::Uuid;
use zip::{write::FileOptions, CompressionMethod, ZipWriter};

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

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
struct ResourceRecord {
    id: String,
    kind: String,
    title: String,
    subtitle: String,
    group: String,
    status: String,
    tags: Vec<String>,
    body: String,
    created_at: String,
    updated_at: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
struct BinderTrashDocument {
    id: String,
    title: String,
    html: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
struct BinderTrashItem {
    id: String,
    collection: String,
    node: BinderNode,
    documents: Vec<BinderTrashDocument>,
    deleted_at: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
struct BinderTrashMoveResult {
    binder: BinderState,
    trash_item: BinderTrashItem,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
struct StructureChapterRecord {
    id: String,
    title: String,
    parent_id: String,
    order: i64,
    notes: String,
    target_words: i64,
    collapsed: bool,
    created_at: String,
    updated_at: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
struct OutlineSceneRecord {
    id: String,
    title: String,
    chapter_id: Option<String>,
    chapter: String,
    scene_no: String,
    status: String,
    pov: String,
    location: String,
    timeline: String,
    characters: Vec<String>,
    items: Vec<String>,
    tags: Vec<String>,
    goal: String,
    conflict: String,
    outcome: String,
    summary: String,
    notes: String,
    target_words: i64,
    current_words: i64,
    created_at: String,
    updated_at: String,
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

fn binder_trash_item_dir(project_path: &str, trash_id: &str) -> PathBuf {
    Path::new(project_path).join(".trash").join("binder_documents").join(clean_component(trash_id))
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

fn take_node(nodes: &mut Vec<BinderNode>, document_id: &str) -> Option<BinderNode> {
    if let Some(position) = nodes.iter().position(|node| node.id == document_id) {
        return Some(nodes.remove(position));
    }
    for node in nodes.iter_mut() {
        if let Some(found) = take_node(&mut node.children, document_id) {
            node.updated_at = now();
            return Some(found);
        }
    }
    None
}

fn node_exists(nodes: &[BinderNode], document_id: &str) -> bool {
    nodes.iter().any(|node| node.id == document_id || node_exists(&node.children, document_id))
}

fn insert_node_under(nodes: &mut Vec<BinderNode>, parent_id: &str, child: BinderNode) -> bool {
    for node in nodes.iter_mut() {
        if node.id == parent_id {
            node.children.push(child);
            node.updated_at = now();
            return true;
        }
        if insert_node_under(&mut node.children, parent_id, child.clone()) {
            node.updated_at = now();
            return true;
        }
    }
    false
}

fn safe_move_or_copy(from: &Path, to: &Path) -> Result<(), String> {
    if let Some(parent) = to.parent() {
        fs::create_dir_all(parent).map_err(|e| format!("无法创建目录 {}：{}", parent.display(), e))?;
    }
    if !from.exists() {
        fs::write(to, "").map_err(|e| format!("无法创建空文稿 {}：{}", to.display(), e))?;
        return Ok(());
    }
    match fs::rename(from, to) {
        Ok(_) => Ok(()),
        Err(_) => {
            fs::copy(from, to).map_err(|e| format!("无法复制文稿到回收站 {}：{}", to.display(), e))?;
            fs::remove_file(from).map_err(|e| format!("无法删除原文稿 {}：{}", from.display(), e))?;
            Ok(())
        }
    }
}

#[tauri::command]
async fn choose_folder(
    app: tauri::AppHandle,
    prompt: Option<String>,
) -> Result<Option<String>, String> {
    let title = prompt.unwrap_or_else(|| "请选择文件夹".to_string());
    let folder = app
        .dialog()
        .file()
        .set_title(title)
        .blocking_pick_folder();

    Ok(folder.map(|path| path.to_string()))
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
fn move_binder_document_to_trash(path: String, collection: String, document_id: String) -> Result<BinderTrashMoveResult, String> {
    let _ = CollectionKind::from_binder_collection(&collection)?;
    let mut state = read_binder_state(&path)?;
    let root = root_mut(&mut state, &collection)?;
    let node = take_node(&mut root.children, &document_id).ok_or_else(|| "未找到该文稿".to_string())?;
    let trash_id = Uuid::new_v4().to_string();
    let trash_dir = binder_trash_item_dir(&path, &trash_id);
    fs::create_dir_all(&trash_dir).map_err(|e| format!("无法创建回收站目录 {}：{}", trash_dir.display(), e))?;

    let mut ids = Vec::new();
    collect_node_ids(&node, &mut ids);
    let documents = ids.iter().map(|id| {
        let title = find_binder_node_title(&node, id).unwrap_or_else(|| "文稿".to_string());
        BinderTrashDocument { id: id.clone(), title, html: String::new() }
    }).collect::<Vec<_>>();

    for id in &ids {
        let from = binder_document_path(&path, id);
        let to = trash_dir.join(format!("{}.html", id));
        safe_move_or_copy(&from, &to)?;
    }

    write_binder_state(&path, &state)?;
    let _ = touch_manifest(&path);

    Ok(BinderTrashMoveResult {
        binder: state,
        trash_item: BinderTrashItem {
            id: trash_id,
            collection,
            node,
            documents,
            deleted_at: now(),
        },
    })
}

fn find_binder_node_title(node: &BinderNode, document_id: &str) -> Option<String> {
    if node.id == document_id {
        return Some(node.title.clone());
    }
    for child in &node.children {
        if let Some(title) = find_binder_node_title(child, document_id) {
            return Some(title);
        }
    }
    None
}

#[tauri::command]
fn restore_binder_document_from_trash(
    path: String,
    collection: String,
    trash_id: String,
    node: BinderNode,
    parent_id: Option<String>,
) -> Result<BinderState, String> {
    let _ = CollectionKind::from_binder_collection(&collection)?;
    let mut state = read_binder_state(&path)?;
    let root = root_mut(&mut state, &collection)?;
    let mut ids = Vec::new();
    collect_node_ids(&node, &mut ids);
    for id in &ids {
        if node_exists(&root.children, id) {
            return Err("当前项目中存在相同文稿 ID，无法安全还原。".to_string());
        }
    }

    let trash_dir = binder_trash_item_dir(&path, &trash_id);
    for id in &ids {
        let from = trash_dir.join(format!("{}.html", id));
        let to = binder_document_path(&path, id);
        safe_move_or_copy(&from, &to)?;
    }

    match parent_id.as_deref() {
        Some(id) if !id.trim().is_empty() && id != root.id => {
            if !insert_node_under(&mut root.children, id, node) {
                return Err("未找到还原目标父文稿。".to_string());
            }
        }
        _ => root.children.push(node),
    }

    let _ = fs::remove_dir_all(&trash_dir);
    write_binder_state(&path, &state)?;
    let _ = touch_manifest(&path);
    Ok(state)
}

#[tauri::command]
fn purge_binder_trash_item(path: String, trash_id: String) -> Result<(), String> {
    let trash_dir = binder_trash_item_dir(&path, &trash_id);
    if trash_dir.exists() {
        fs::remove_dir_all(&trash_dir).map_err(|e| format!("无法清除回收站项目 {}：{}", trash_dir.display(), e))?;
    }
    Ok(())
}

#[tauri::command]
fn purge_binder_trash_items(path: String, trash_ids: Vec<String>) -> Result<(), String> {
    for trash_id in trash_ids {
        let trash_dir = binder_trash_item_dir(&path, &trash_id);
        if trash_dir.exists() {
            let _ = fs::remove_dir_all(&trash_dir);
        }
    }
    Ok(())
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

fn desktop_dir() -> Result<PathBuf, String> {
    let candidates = [
        env::var("USERPROFILE").ok().map(|home| PathBuf::from(home).join("Desktop")),
        env::var("HOME").ok().map(|home| PathBuf::from(home).join("Desktop")),
    ];

    for candidate in candidates.into_iter().flatten() {
        if candidate.exists() || fs::create_dir_all(&candidate).is_ok() {
            return Ok(candidate);
        }
    }

    Err("无法定位桌面路径。请确认系统存在 Desktop 文件夹。".to_string())
}

fn clean_font_file_stem(stem: &str) -> Option<String> {
    let base = stem
        .replace('_', " ")
        .replace('-', " ")
        .replace("Bold", "")
        .replace("Italic", "")
        .replace("Regular", "")
        .replace("Light", "")
        .replace("Medium", "")
        .replace("Semibold", "")
        .replace("SemiBold", "")
        .replace("Oblique", "")
        .split_whitespace()
        .collect::<Vec<_>>()
        .join(" ");
    let cleaned = base.trim();
    if cleaned.is_empty() {
        None
    } else {
        Some(cleaned.to_string())
    }
}

fn collect_font_names_from_dir(dir: &Path, fonts: &mut Vec<String>, depth: usize) {
    if depth > 4 || !dir.exists() {
        return;
    }
    let Ok(entries) = fs::read_dir(dir) else {
        return;
    };
    for entry in entries.flatten() {
        let path = entry.path();
        if path.is_dir() {
            collect_font_names_from_dir(&path, fonts, depth + 1);
            continue;
        }
        let Some(extension) = path.extension().and_then(|value| value.to_str()).map(|value| value.to_lowercase()) else {
            continue;
        };
        if !matches!(extension.as_str(), "ttf" | "otf" | "ttc") {
            continue;
        }
        if let Some(stem) = path.file_stem().and_then(|value| value.to_str()).and_then(clean_font_file_stem) {
            fonts.push(stem);
        }
    }
}

#[tauri::command]
fn list_system_fonts() -> Result<Vec<String>, String> {
    let mut fonts = vec![
        "宋体".to_string(),
        "微软雅黑".to_string(),
        "黑体".to_string(),
        "楷体".to_string(),
        "仿宋".to_string(),
        "SimSun".to_string(),
        "Microsoft YaHei".to_string(),
        "Arial".to_string(),
        "Times New Roman".to_string(),
        "Georgia".to_string(),
        "serif".to_string(),
        "sans-serif".to_string(),
    ];

    let mut candidates: Vec<PathBuf> = Vec::new();
    if let Ok(windir) = env::var("WINDIR") {
        candidates.push(PathBuf::from(windir).join("Fonts"));
    }
    candidates.push(PathBuf::from("C:\\Windows\\Fonts"));
    candidates.push(PathBuf::from("/System/Library/Fonts"));
    candidates.push(PathBuf::from("/Library/Fonts"));
    candidates.push(PathBuf::from("/usr/share/fonts"));
    candidates.push(PathBuf::from("/usr/local/share/fonts"));
    if let Ok(home) = env::var("HOME") {
        candidates.push(PathBuf::from(&home).join("Library/Fonts"));
        candidates.push(PathBuf::from(&home).join(".fonts"));
        candidates.push(PathBuf::from(&home).join(".local/share/fonts"));
    }

    for dir in candidates {
        collect_font_names_from_dir(&dir, &mut fonts, 0);
    }

    fonts.sort_by(|a, b| a.to_lowercase().cmp(&b.to_lowercase()));
    fonts.dedup_by(|a, b| a.eq_ignore_ascii_case(b));
    Ok(fonts)
}

fn markdown_filename(index: usize, title: &str, fallback_id: &str) -> String {
    let clean = clean_component(title);
    let stem = if clean.trim().is_empty() {
        format!("未命名-{}", fallback_id.chars().take(8).collect::<String>())
    } else {
        clean
    };
    format!("{:03}-{}.md", index, stem)
}

fn decode_html_entities(value: String) -> String {
    value
        .replace("&nbsp;", " ")
        .replace("&amp;", "&")
        .replace("&lt;", "<")
        .replace("&gt;", ">")
        .replace("&quot;", "\"")
        .replace("&#39;", "'")
        .replace("&apos;", "'")
}

fn normalize_markdown(value: String) -> String {
    let mut lines = Vec::new();
    let mut blank_count = 0;
    for line in value.lines() {
        let cleaned = line.trim_end();
        if cleaned.trim().is_empty() {
            blank_count += 1;
            if blank_count <= 1 {
                lines.push(String::new());
            }
        } else {
            blank_count = 0;
            lines.push(cleaned.to_string());
        }
    }
    lines.join("\n").trim().to_string()
}

fn html_to_markdown(html: &str) -> String {
    let mut output = String::new();
    let mut chars = html.chars().peekable();

    while let Some(ch) = chars.next() {
        if ch == '<' {
            let mut raw_tag = String::new();
            while let Some(tag_ch) = chars.next() {
                if tag_ch == '>' {
                    break;
                }
                raw_tag.push(tag_ch);
            }

            let trimmed = raw_tag.trim().to_lowercase();
            let is_close = trimmed.starts_with('/');
            let tag_name = trimmed
                .trim_start_matches('/')
                .split_whitespace()
                .next()
                .unwrap_or("")
                .trim_end_matches('/');

            match (tag_name, is_close) {
                ("br", _) => output.push('\n'),
                ("h1", false) => output.push_str("\n# "),
                ("h2", false) => output.push_str("\n## "),
                ("h3", false) => output.push_str("\n### "),
                ("h4", false) => output.push_str("\n#### "),
                ("h5", false) => output.push_str("\n##### "),
                ("h6", false) => output.push_str("\n###### "),
                ("li", false) => output.push_str("\n- "),
                ("blockquote", false) => output.push_str("\n> "),
                ("td", false) | ("th", false) => output.push_str(" | "),
                ("p", true)
                | ("div", true)
                | ("section", true)
                | ("article", true)
                | ("h1", true)
                | ("h2", true)
                | ("h3", true)
                | ("h4", true)
                | ("h5", true)
                | ("h6", true)
                | ("li", true)
                | ("blockquote", true)
                | ("tr", true) => output.push_str("\n\n"),
                _ => {}
            }
        } else {
            output.push(ch);
        }
    }

    normalize_markdown(decode_html_entities(output))
}

fn write_md_file(file: &Path, content: &str) -> Result<(), String> {
    if let Some(parent) = file.parent() {
        fs::create_dir_all(parent).map_err(|e| format!("无法创建导出目录 {}：{}", parent.display(), e))?;
    }
    fs::write(file, content).map_err(|e| format!("无法写入 Markdown 文件 {}：{}", file.display(), e))
}

fn export_binder_nodes(
    project_path: &str,
    nodes: &[BinderNode],
    output_dir: &Path,
    trail: &[String],
    index: &mut usize,
) -> Result<(), String> {
    fs::create_dir_all(output_dir).map_err(|e| format!("无法创建导出目录 {}：{}", output_dir.display(), e))?;

    for node in nodes {
        *index += 1;
        let mut current_trail = trail.to_vec();
        current_trail.push(node.title.clone());
        let file = output_dir.join(markdown_filename(*index, &node.title, &node.id));
        let html = read_binder_document(project_path.to_string(), node.id.clone())?;
        let body = html_to_markdown(&html);
        let content = format!(
            "# {}\n\n> 路径：{}\n> 创建时间：{}\n> 更新时间：{}\n\n{}\n",
            node.title,
            current_trail.join(" / "),
            node.created_at,
            node.updated_at,
            if body.is_empty() { "_暂无正文。_".to_string() } else { body }
        );
        write_md_file(&file, &content)?;
        export_binder_nodes(project_path, &node.children, output_dir, &current_trail, index)?;
    }

    Ok(())
}

fn write_empty_notice(output_dir: &Path, label: &str) -> Result<(), String> {
    fs::create_dir_all(output_dir).map_err(|e| format!("无法创建导出目录 {}：{}", output_dir.display(), e))?;
    let file = output_dir.join("README.md");
    write_md_file(&file, &format!("# {}\n\n暂无内容。\n", label))
}

fn export_resource_kind(resources: &[ResourceRecord], kind: &str, label: &str, output_dir: &Path) -> Result<usize, String> {
    let items: Vec<&ResourceRecord> = resources.iter().filter(|resource| resource.kind == kind).collect();
    fs::create_dir_all(output_dir).map_err(|e| format!("无法创建导出目录 {}：{}", output_dir.display(), e))?;

    if items.is_empty() {
        write_empty_notice(output_dir, label)?;
        return Ok(0);
    }

    for (position, item) in items.iter().enumerate() {
        let file = output_dir.join(markdown_filename(position + 1, &item.title, &item.id));
        let tags = if item.tags.is_empty() { "无".to_string() } else { item.tags.join("、") };
        let subtitle = if item.subtitle.trim().is_empty() { "无" } else { item.subtitle.trim() };
        let group = if item.group.trim().is_empty() { "默认" } else { item.group.trim() };
        let status = if item.status.trim().is_empty() { "未设置" } else { item.status.trim() };
        let body = if item.body.trim().is_empty() { "_暂无正文。_".to_string() } else { item.body.trim().to_string() };
        let content = format!(
            "# {}\n\n- 类型：{}\n- 副标题：{}\n- 分组：{}\n- 状态：{}\n- 标签：{}\n- 创建时间：{}\n- 更新时间：{}\n\n{}\n",
            item.title.trim(),
            label,
            subtitle,
            group,
            status,
            tags,
            item.created_at,
            item.updated_at,
            body
        );
        write_md_file(&file, &content)?;
    }

    Ok(items.len())
}


fn export_structure_data(
    chapters: &[StructureChapterRecord],
    scenes: &[OutlineSceneRecord],
    output_dir: &Path,
) -> Result<(usize, usize), String> {
    fs::create_dir_all(output_dir).map_err(|e| format!("无法创建导出目录 {}：{}", output_dir.display(), e))?;
    if chapters.is_empty() && scenes.is_empty() {
        write_empty_notice(output_dir, "结构")?;
        return Ok((0, 0));
    }

    let mut ordered_chapters = chapters.to_vec();
    ordered_chapters.sort_by(|a, b| {
        let left = (a.parent_id.clone(), a.order, a.title.clone());
        let right = (b.parent_id.clone(), b.order, b.title.clone());
        left.cmp(&right)
    });

    let mut tree = String::from("# 结构章节树

");
    let roots: Vec<&StructureChapterRecord> = ordered_chapters.iter().filter(|chapter| chapter.parent_id.trim().is_empty()).collect();
    fn write_chapter_branch(
        output: &mut String,
        chapters: &[StructureChapterRecord],
        scenes: &[OutlineSceneRecord],
        parent: &StructureChapterRecord,
        depth: usize,
    ) {
        let indent = "  ".repeat(depth);
        let scene_count = scenes.iter().filter(|scene| scene.chapter_id.as_deref() == Some(parent.id.as_str())).count();
        output.push_str(&format!("{}- {}（{} 场，目标 {} 字）
", indent, parent.title, scene_count, parent.target_words));
        if !parent.notes.trim().is_empty() {
            output.push_str(&format!("{}  - 备注：{}
", indent, parent.notes.trim()));
        }
        let mut children: Vec<&StructureChapterRecord> = chapters.iter().filter(|chapter| chapter.parent_id == parent.id).collect();
        children.sort_by_key(|chapter| (chapter.order, chapter.title.clone()));
        for child in children {
            write_chapter_branch(output, chapters, scenes, child, depth + 1);
        }
    }
    for root in roots {
        write_chapter_branch(&mut tree, &ordered_chapters, scenes, root, 0);
    }
    if ordered_chapters.iter().all(|chapter| !chapter.parent_id.trim().is_empty()) {
        for chapter in &ordered_chapters {
            tree.push_str(&format!("- {}（目标 {} 字）
", chapter.title, chapter.target_words));
        }
    }
    write_md_file(&output_dir.join("章节树.md"), &tree)?;

    let scene_dir = output_dir.join("场景");
    fs::create_dir_all(&scene_dir).map_err(|e| format!("无法创建导出目录 {}：{}", scene_dir.display(), e))?;
    if scenes.is_empty() {
        write_empty_notice(&scene_dir, "场景")?;
    } else {
        let chapter_title = |scene: &OutlineSceneRecord| -> String {
            scene.chapter_id.as_ref()
                .and_then(|id| chapters.iter().find(|chapter| &chapter.id == id))
                .map(|chapter| chapter.title.clone())
                .or_else(|| if scene.chapter.trim().is_empty() { None } else { Some(scene.chapter.clone()) })
                .unwrap_or_else(|| "未指定".to_string())
        };
        for (position, scene) in scenes.iter().enumerate() {
            let file = scene_dir.join(markdown_filename(position + 1, &scene.title, &scene.id));
            let characters = if scene.characters.is_empty() { "无".to_string() } else { scene.characters.join("、") };
            let items = if scene.items.is_empty() { "无".to_string() } else { scene.items.join("、") };
            let tags = if scene.tags.is_empty() { "无".to_string() } else { scene.tags.join("、") };
            let content = format!(
                "# {}

- 所属章节：{}
- 场景序号：{}
- 状态：{}
- 字数：{} / {}
- POV：{}
- 地点：{}
- 时间点：{}
- 人物：{}
- 物品 / 线索：{}
- 标签：{}
- 创建时间：{}
- 更新时间：{}

## 内容

{}

## 描述

{}

## 目标

{}

## 冲突

{}

## 结果

{}

## 备注

{}
",
                scene.title.trim(),
                chapter_title(scene),
                if scene.scene_no.trim().is_empty() { "未设置" } else { scene.scene_no.trim() },
                scene.status.trim(),
                scene.current_words,
                scene.target_words,
                if scene.pov.trim().is_empty() { "未设置" } else { scene.pov.trim() },
                if scene.location.trim().is_empty() { "未设置" } else { scene.location.trim() },
                if scene.timeline.trim().is_empty() { "未设置" } else { scene.timeline.trim() },
                characters,
                items,
                tags,
                scene.created_at,
                scene.updated_at,
                if scene.summary.trim().is_empty() { "_暂无内容。_" } else { scene.summary.trim() },
                if scene.notes.trim().is_empty() { "_暂无描述。_" } else { scene.notes.trim() },
                if scene.goal.trim().is_empty() { "_暂无目标。_" } else { scene.goal.trim() },
                if scene.conflict.trim().is_empty() { "_暂无冲突。_" } else { scene.conflict.trim() },
                if scene.outcome.trim().is_empty() { "_暂无结果。_" } else { scene.outcome.trim() },
                if scene.notes.trim().is_empty() { "_暂无备注。_" } else { scene.notes.trim() },
            );
            write_md_file(&file, &content)?;
        }
    }

    Ok((chapters.len(), scenes.len()))
}

fn add_path_to_zip<W: Write + Seek>(
    zip: &mut ZipWriter<W>,
    base_dir: &Path,
    current_path: &Path,
) -> Result<(), String> {
    let relative_name = current_path
        .strip_prefix(base_dir)
        .map_err(|e| format!("无法计算压缩包相对路径：{}", e))?
        .to_string_lossy()
        .replace('\\', "/");

    if current_path.is_dir() {
        if !relative_name.is_empty() {
            let directory_name = if relative_name.ends_with('/') {
                relative_name.clone()
            } else {
                format!("{}/", relative_name)
            };
            let directory_options = FileOptions::default()
                .compression_method(CompressionMethod::Stored)
                .unix_permissions(0o755);
            zip.add_directory(directory_name, directory_options)
                .map_err(|e| format!("无法写入压缩包目录：{}", e))?;
        }

        let mut entries = fs::read_dir(current_path)
            .map_err(|e| format!("无法读取导出目录 {}：{}", current_path.display(), e))?
            .collect::<Result<Vec<_>, _>>()
            .map_err(|e| format!("无法读取导出目录项：{}", e))?;
        entries.sort_by_key(|entry| entry.path());

        for entry in entries {
            add_path_to_zip(zip, base_dir, &entry.path())?;
        }
        return Ok(());
    }

    if current_path.is_file() {
        let file_options = FileOptions::default()
            .compression_method(CompressionMethod::Deflated)
            .unix_permissions(0o644);
        zip.start_file(relative_name, file_options)
            .map_err(|e| format!("无法写入压缩包文件头：{}", e))?;
        let mut input = File::open(current_path)
            .map_err(|e| format!("无法读取待压缩文件 {}：{}", current_path.display(), e))?;
        io::copy(&mut input, zip)
            .map_err(|e| format!("无法写入压缩包内容：{}", e))?;
    }

    Ok(())
}

fn create_zip_archive(source_dir: &Path, zip_path: &Path) -> Result<(), String> {
    if zip_path.exists() {
        fs::remove_file(zip_path).map_err(|e| format!("无法覆盖已有压缩包 {}：{}", zip_path.display(), e))?;
    }

    let parent = source_dir.parent().ok_or_else(|| "导出目录缺少父目录。".to_string())?;
    let output = File::create(zip_path).map_err(|e| format!("无法创建压缩包 {}：{}", zip_path.display(), e))?;
    let mut zip = ZipWriter::new(output);
    add_path_to_zip(&mut zip, parent, source_dir)?;
    zip.finish().map_err(|e| format!("压缩包写入失败：{}", e))?;

    if !zip_path.exists() {
        return Err("压缩包创建失败：目标文件不存在。".to_string());
    }

    Ok(())
}

#[tauri::command]
fn export_project_markdown_zip(
    path: String,
    resources: Vec<ResourceRecord>,
    structure_chapters: Vec<StructureChapterRecord>,
    outline_scenes: Vec<OutlineSceneRecord>,
) -> Result<String, String> {
    ensure_project_dirs(&path)?;
    let manifest = read_manifest_from(&path)?;
    let binder = read_binder_state(&path)?;
    let desktop = desktop_dir()?;
    let timestamp = Utc::now().format("%Y%m%d-%H%M%S").to_string();
    let safe_project_name = {
        let clean = clean_component(&manifest.name);
        if clean.trim().is_empty() { "MasterPieces项目".to_string() } else { clean }
    };
    let export_name = format!("{}-Markdown导出-{}", safe_project_name, timestamp);
    let export_dir = desktop.join(&export_name);
    let zip_path = desktop.join(format!("{}.zip", export_name));

    fs::create_dir_all(&export_dir).map_err(|e| format!("无法创建导出目录 {}：{}", export_dir.display(), e))?;

    let mut draft_count = 0;
    let draft_dir = export_dir.join("项目文件");
    export_binder_nodes(&path, &binder.draft.children, &draft_dir, &[binder.draft.title.clone()], &mut draft_count)?;
    if draft_count == 0 {
        write_empty_notice(&draft_dir, "项目文件")?;
    }

    let mut outline_count = 0;
    let outline_dir = export_dir.join("大纲");
    export_binder_nodes(&path, &binder.outline.children, &outline_dir, &[binder.outline.title.clone()], &mut outline_count)?;
    if outline_count == 0 {
        write_empty_notice(&outline_dir, "大纲")?;
    }

    let characters_count = export_resource_kind(&resources, "characters", "人物", &export_dir.join("人物"))?;
    let lore_count = export_resource_kind(&resources, "lore", "设定", &export_dir.join("设定"))?;
    let timeline_count = export_resource_kind(&resources, "timeline", "时间线", &export_dir.join("时间线"))?;
    let ideas_count = export_resource_kind(&resources, "ideas", "灵感", &export_dir.join("灵感"))?;
    let (structure_chapter_count, structure_scene_count) = export_structure_data(&structure_chapters, &outline_scenes, &export_dir.join("结构"))?;

    let readme = format!(
        "# {}\n\n- 项目 ID：{}\n- 项目路径：{}\n- 创建时间：{}\n- 更新时间：{}\n- 导出时间：{}\n\n## 导出内容\n\n- 项目文件：{} 个 Markdown 文件\n- 大纲：{} 个 Markdown 文件\n- 人物：{} 张资料卡\n- 设定：{} 张资料卡\n- 时间线：{} 条记录\n- 灵感：{} 条记录\n- 结构章节：{} 个\n- 结构场景：{} 个\n\n> 本压缩包由 MasterPieces 导出。富文本样式会尽量转换为 Markdown 文本。\n",
        manifest.name,
        manifest.id,
        path,
        manifest.created_at,
        manifest.updated_at,
        Utc::now().to_rfc3339(),
        draft_count,
        outline_count,
        characters_count,
        lore_count,
        timeline_count,
        ideas_count,
        structure_chapter_count,
        structure_scene_count
    );
    write_md_file(&export_dir.join("README.md"), &readme)?;

    create_zip_archive(&export_dir, &zip_path)?;
    let _ = fs::remove_dir_all(&export_dir);

    Ok(zip_path.to_string_lossy().to_string())
}

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
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
            move_binder_document_to_trash,
            restore_binder_document_from_trash,
            purge_binder_trash_item,
            purge_binder_trash_items,
            delete_binder_document,
            read_binder_document,
            save_binder_document,
            list_system_fonts,
            export_project_markdown_zip
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

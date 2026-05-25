import React, { useEffect, useMemo, useRef, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { BubbleMenu, EditorContent, useEditor } from "@tiptap/react";
import { Extension } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import Link from "@tiptap/extension-link";
import Image from "@tiptap/extension-image";
import TextAlign from "@tiptap/extension-text-align";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import Highlight from "@tiptap/extension-highlight";
import TextStyle from "@tiptap/extension-text-style";
import Color from "@tiptap/extension-color";
import CharacterCount from "@tiptap/extension-character-count";
import Placeholder from "@tiptap/extension-placeholder";
import Table from "@tiptap/extension-table";
import TableRow from "@tiptap/extension-table-row";
import TableHeader from "@tiptap/extension-table-header";
import TableCell from "@tiptap/extension-table-cell";

import "./index.css";

type ProjectRecord = {
  id: string;
  name: string;
  path: string;
  createdAt: string;
  updatedAt: string;
  exists?: boolean;
};

type ProjectManifest = {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
};

type BinderNode = {
  id: string;
  title: string;
  icon: string;
  createdAt: string;
  updatedAt: string;
  children: BinderNode[];
};

type BinderRoot = {
  id: string;
  title: string;
  icon: string;
  children: BinderNode[];
};

type BinderState = {
  draft: BinderRoot;
  outline: BinderRoot;
};

type BinderCollection = "draft" | "outline";
type View = "splash" | "projects" | "writer";
type ModalMode =
  | "createProject"
  | "importProject"
  | "renameProject"
  | "relocateProject"
  | "projectActions"
  | "createNode"
  | "editNode"
  | "insertLink"
  | "insertImage"
  | "preferences"
  | null;

type NodeTarget = {
  collection: BinderCollection;
  parentId?: string;
  nodeId?: string;
  isRoot?: boolean;
};

type ToolbarItemId =
  | "paragraph"
  | "h1"
  | "h2"
  | "h3"
  | "h4"
  | "bold"
  | "italic"
  | "underline"
  | "strike"
  | "code"
  | "quote"
  | "codeBlock"
  | "left"
  | "center"
  | "right"
  | "justify"
  | "bullet"
  | "ordered"
  | "task"
  | "rule"
  | "link"
  | "image"
  | "table"
  | "row"
  | "column"
  | "merge"
  | "split"
  | "deleteTable"
  | "fontSize"
  | "lineHeight"
  | "color"
  | "highlight"
  | "undo"
  | "redo";

type ToolbarGroup = "format" | "layout" | "insert" | "table" | "history" | "style";

type ToolbarItem = {
  id: ToolbarItemId;
  title: string;
  icon: string;
  group: ToolbarGroup;
  run?: () => void;
  active?: () => boolean;
  disabled?: () => boolean;
  control?: "fontSize" | "lineHeight" | "color" | "highlight";
};

const RECENT_PROJECTS_KEY = "masterpieces.recentProjects.v1";
const TOOLBAR_PREFS_KEY = "masterpieces.toolbar.visible.v3";

const EMPTY_BINDER: BinderState = {
  draft: { id: "draft-root", title: "草稿", icon: "📚", children: [] },
  outline: { id: "outline-root", title: "大纲", icon: "🧭", children: [] },
};

const FONT_SIZE_OPTIONS = ["14px", "16px", "18px", "20px", "24px", "28px", "32px"];
const LINE_HEIGHT_OPTIONS = ["1.4", "1.6", "1.8", "2", "2.2", "2.5"];
const COLOR_PRESETS = ["#f5f5f5", "#111111", "#7c2d12", "#92400e", "#166534", "#1d4ed8", "#6d28d9", "#be123c"];
const HIGHLIGHT_PRESETS = ["#fef08a", "#fed7aa", "#bbf7d0", "#bfdbfe", "#e9d5ff"];

const DEFAULT_VISIBLE_TOOLBAR_IDS: ToolbarItemId[] = [
  "paragraph",
  "h1",
  "h2",
  "h3",
  "bold",
  "italic",
  "underline",
  "strike",
  "quote",
  "code",
  "left",
  "center",
  "right",
  "bullet",
  "ordered",
  "undo",
  "redo",
  "link",
  "fontSize",
  "lineHeight",
  "color",
  "highlight",
];

const TOOLBAR_GROUP_LABELS: Record<ToolbarGroup, string> = {
  format: "文本格式",
  layout: "段落与列表",
  insert: "插入",
  table: "表格",
  history: "历史",
  style: "样式",
};

const FontSize = Extension.create({
  name: "fontSize",
  addGlobalAttributes() {
    return [
      {
        types: ["textStyle"],
        attributes: {
          fontSize: {
            default: null,
            parseHTML: (element) => element.style.fontSize || null,
            renderHTML: (attributes) => {
              if (!attributes.fontSize) return {};
              return { style: `font-size: ${attributes.fontSize}` };
            },
          },
        },
      },
    ];
  },
});

const LineHeight = Extension.create({
  name: "lineHeight",
  addGlobalAttributes() {
    return [
      {
        types: ["paragraph", "heading"],
        attributes: {
          lineHeight: {
            default: null,
            parseHTML: (element) => element.style.lineHeight || null,
            renderHTML: (attributes) => {
              if (!attributes.lineHeight) return {};
              return { style: `line-height: ${attributes.lineHeight}` };
            },
          },
        },
      },
    ];
  },
});

function formatTime(value: string) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("zh-CN", { hour12: false });
}

function loadRecentProjects(): ProjectRecord[] {
  try {
    const raw = localStorage.getItem(RECENT_PROJECTS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveRecentProjects(projects: ProjectRecord[]) {
  localStorage.setItem(RECENT_PROJECTS_KEY, JSON.stringify(projects));
}

function loadToolbarVisibleIds(): ToolbarItemId[] {
  try {
    const raw = localStorage.getItem(TOOLBAR_PREFS_KEY);
    if (!raw) return DEFAULT_VISIBLE_TOOLBAR_IDS;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : DEFAULT_VISIBLE_TOOLBAR_IDS;
  } catch {
    return DEFAULT_VISIBLE_TOOLBAR_IDS;
  }
}

function findNode(nodes: BinderNode[], id: string): BinderNode | null {
  for (const node of nodes) {
    if (node.id === id) return node;
    const child = findNode(node.children, id);
    if (child) return child;
  }
  return null;
}

function countNodes(nodes: BinderNode[]): number {
  return nodes.reduce((total, node) => total + 1 + countNodes(node.children), 0);
}

function firstNode(nodes: BinderNode[]): BinderNode | null {
  if (nodes.length === 0) return null;
  return nodes[0];
}

function nodeKey(collection: BinderCollection, id: string) {
  return `${collection}:${id}`;
}

export default function App() {
  const [view, setView] = useState<View>("splash");
  const [projects, setProjects] = useState<ProjectRecord[]>(() => loadRecentProjects());
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [currentProject, setCurrentProject] = useState<ProjectRecord | null>(null);
  const [binder, setBinder] = useState<BinderState>(EMPTY_BINDER);
  const [activeCollection, setActiveCollection] = useState<BinderCollection>("draft");
  const [activeNodeId, setActiveNodeId] = useState("");
  const [documentHtml, setDocumentHtml] = useState("");
  const [modalMode, setModalMode] = useState<ModalMode>(null);
  const [modalProject, setModalProject] = useState<ProjectRecord | null>(null);
  const [nodeTarget, setNodeTarget] = useState<NodeTarget | null>(null);
  const [projectNameInput, setProjectNameInput] = useState("");
  const [pathInput, setPathInput] = useState("");
  const [nodeTitleInput, setNodeTitleInput] = useState("");
  const [nodeIconInput, setNodeIconInput] = useState("▦");
  const [linkUrlInput, setLinkUrlInput] = useState("");
  const [imageUrlInput, setImageUrlInput] = useState("");
  const [statusMessage, setStatusMessage] = useState("");
  const [isBusy, setIsBusy] = useState(false);
  const [leftSidebarOpen, setLeftSidebarOpen] = useState(true);
  const [aiPanelOpen, setAiPanelOpen] = useState(false);
  const [toolbarMoreOpen, setToolbarMoreOpen] = useState(false);
  const [visibleToolbarIds, setVisibleToolbarIds] = useState<ToolbarItemId[]>(() => loadToolbarVisibleIds());
  const [expanded, setExpanded] = useState<Record<string, boolean>>({
    "draft:draft-root": true,
    "outline:outline-root": true,
  });
  const [openBinderMenu, setOpenBinderMenu] = useState("");
  const [slashMenuOpen, setSlashMenuOpen] = useState(false);
  const [editorTick, setEditorTick] = useState(0);

  const saveTimerRef = useRef<number | null>(null);

  const selectedProject = useMemo(
    () => projects.find((project) => project.id === selectedProjectId) ?? null,
    [projects, selectedProjectId],
  );

  const activeRoot = binder[activeCollection];
  const activeNode = activeNodeId ? findNode(activeRoot.children, activeNodeId) : null;

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [1, 2, 3, 4] } }),
      Underline,
      TextStyle,
      Color,
      FontSize,
      LineHeight,
      Highlight.configure({ multicolor: true }),
      Link.configure({
        openOnClick: false,
        autolink: true,
        HTMLAttributes: { rel: "noopener noreferrer", target: "_blank" },
      }),
      Image.configure({ allowBase64: true, inline: false }),
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      TaskList,
      TaskItem.configure({ nested: true }),
      Table.configure({ resizable: true }),
      TableRow,
      TableHeader,
      TableCell,
      CharacterCount,
      Placeholder.configure({
        placeholder: ({ node }) => {
          if (node.type.name === "heading") return "请输入标题……";
          return activeCollection === "outline"
            ? "在这里记录大纲、结构、伏笔和人物弧线……"
            : "开始写作，输入 / 可打开快捷菜单……";
        },
      }),
    ],
    content: "",
    editorProps: {
      attributes: { class: "writer-editor rich-editor" },
      handleDOMEvents: {
        blur: () => {
          void saveActiveDocument(false);
          return false;
        },
        keydown: (_view, event) => {
          if (event.key === "Escape") {
            setSlashMenuOpen(false);
            setToolbarMoreOpen(false);
            setOpenBinderMenu("");
          }
          if (event.key === "/") {
            window.setTimeout(() => setSlashMenuOpen(true), 0);
          }
          return false;
        },
      },
    },
    onUpdate: ({ editor }) => {
      setDocumentHtml(editor.getHTML());
      setEditorTick((value) => value + 1);
      scheduleSave();
    },
    onSelectionUpdate: () => {
      setEditorTick((value) => value + 1);
    },
  });

  useEffect(() => {
    const timer = window.setTimeout(() => setView("projects"), 350);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    localStorage.setItem(TOOLBAR_PREFS_KEY, JSON.stringify(visibleToolbarIds));
  }, [visibleToolbarIds]);

  useEffect(() => {
    if (view !== "projects") return;
    void refreshProjectStatus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view]);

  useEffect(() => {
    if (!editor) return;
    const current = editor.getHTML();
    if (current !== documentHtml) {
      editor.commands.setContent(documentHtml || "", false);
      setEditorTick((value) => value + 1);
    }
  }, [editor, documentHtml, activeNodeId, activeCollection]);

  useEffect(() => {
    return () => {
      if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current);
    };
  }, []);

  function updateProjects(nextProjects: ProjectRecord[]) {
    setProjects(nextProjects);
    saveRecentProjects(nextProjects);
  }

  function showStatus(message: string) {
    setStatusMessage(message);
    window.setTimeout(() => setStatusMessage(""), 4500);
  }

  function closeModal() {
    if (isBusy) return;
    setModalMode(null);
    setModalProject(null);
    setNodeTarget(null);
    setProjectNameInput("");
    setPathInput("");
    setNodeTitleInput("");
    setNodeIconInput("▦");
    setLinkUrlInput("");
    setImageUrlInput("");
  }

  function closeModalAfterBusy() {
    setModalMode(null);
    setModalProject(null);
    setNodeTarget(null);
    setProjectNameInput("");
    setPathInput("");
    setNodeTitleInput("");
    setNodeIconInput("▦");
    setLinkUrlInput("");
    setImageUrlInput("");
  }

  function openCreateProjectModal() {
    setModalMode("createProject");
    setProjectNameInput("");
    setPathInput("");
  }

  function openImportProjectModal() {
    setModalMode("importProject");
    setProjectNameInput("");
    setPathInput("");
  }

  function openRenameProjectModal(project: ProjectRecord) {
    setModalProject(project);
    setProjectNameInput(project.name);
    setPathInput(project.path);
    setModalMode("renameProject");
  }

  function openRelocateProjectModal(project: ProjectRecord) {
    setModalProject(project);
    setProjectNameInput(project.name);
    setPathInput(project.path);
    setModalMode("relocateProject");
  }

  function openProjectActionsModal(project: ProjectRecord) {
    setSelectedProjectId(project.id);
    setModalProject(project);
    setProjectNameInput(project.name);
    setPathInput(project.path);
    setModalMode("projectActions");
  }

  async function chooseFolderForInput(kind: "create" | "project") {
    try {
      const prompt = kind === "create" ? "请选择项目要保存到哪个文件夹" : "请选择 .masterpiece 项目文件夹";
      const selected = await invoke<string | null>("choose_folder", { prompt });
      if (selected) setPathInput(selected);
    } catch (error) {
      showStatus(`无法打开文件夹选择器：${String(error)}`);
    }
  }

  async function refreshProjectStatus() {
    const nextProjects = await Promise.all(
      projects.map(async (project) => {
        try {
          const manifest = await invoke<ProjectManifest>("read_project_manifest", { path: project.path });
          return {
            ...project,
            name: manifest.name,
            createdAt: manifest.createdAt,
            updatedAt: manifest.updatedAt,
            exists: true,
          };
        } catch {
          return { ...project, exists: false };
        }
      }),
    );
    updateProjects(nextProjects);
  }

  async function createProject() {
    const name = projectNameInput.trim();
    const parentPath = pathInput.trim();
    if (!name) return showStatus("请输入项目名称。");
    if (!parentPath) return showStatus("请选择或输入存档文件夹路径。");
    setIsBusy(true);
    try {
      const created = await invoke<ProjectRecord>("create_project", { name, parentPath });
      const nextProjects = [created, ...projects.filter((project) => project.id !== created.id)];
      updateProjects(nextProjects);
      setSelectedProjectId(created.id);
      closeModalAfterBusy();
      showStatus(`项目已创建，档案存放位置：${created.path}`);
    } catch (error) {
      showStatus(`创建失败：${String(error)}`);
    } finally {
      setIsBusy(false);
    }
  }

  async function importExistingProject() {
    const path = pathInput.trim();
    if (!path) return showStatus("请选择或输入已有项目文件夹路径。");
    setIsBusy(true);
    try {
      const imported = await invoke<ProjectRecord>("import_project", { path });
      const nextProjects = [imported, ...projects.filter((project) => project.id !== imported.id)];
      updateProjects(nextProjects);
      setSelectedProjectId(imported.id);
      closeModalAfterBusy();
      showStatus(`已记住项目位置：${imported.path}`);
    } catch (error) {
      showStatus(`打开失败：${String(error)}`);
    } finally {
      setIsBusy(false);
    }
  }

  async function openProject() {
    if (!selectedProject) return;
    if (selectedProject.exists === false) {
      openRelocateProjectModal(selectedProject);
      showStatus("项目文件未找到，请输入新的项目位置。");
      return;
    }
    setIsBusy(true);
    try {
      const manifest = await invoke<ProjectManifest>("read_project_manifest", { path: selectedProject.path });
      const updatedProject: ProjectRecord = {
        ...selectedProject,
        name: manifest.name,
        createdAt: manifest.createdAt,
        updatedAt: manifest.updatedAt,
        exists: true,
      };
      const nextBinder = await invoke<BinderState>("read_binder", { path: updatedProject.path });
      setBinder(nextBinder);
      setCurrentProject(updatedProject);
      updateProjects([updatedProject, ...projects.filter((project) => project.id !== updatedProject.id)]);
      const firstDraft = firstNode(nextBinder.draft.children);
      setActiveCollection("draft");
      if (firstDraft) {
        setActiveNodeId(firstDraft.id);
        const html = await invoke<string>("read_binder_document", { path: updatedProject.path, documentId: firstDraft.id });
        setDocumentHtml(html);
      } else {
        setActiveNodeId("");
        setDocumentHtml("");
      }
      setExpanded({ "draft:draft-root": true, "outline:outline-root": true });
      setView("writer");
    } catch (error) {
      showStatus(`打开失败：${String(error)}`);
    } finally {
      setIsBusy(false);
    }
  }

  async function renameProject() {
    if (!modalProject) return;
    const name = projectNameInput.trim();
    if (!name) return showStatus("请输入新的项目名称。");
    setIsBusy(true);
    try {
      const manifest = await invoke<ProjectManifest>("rename_project", { path: modalProject.path, name });
      const nextProject = { ...modalProject, name: manifest.name, updatedAt: manifest.updatedAt, exists: true };
      updateProjects(projects.map((item) => (item.id === modalProject.id ? nextProject : item)));
      if (currentProject?.id === modalProject.id) setCurrentProject(nextProject);
      closeModalAfterBusy();
      showStatus("项目名称已修改。");
    } catch (error) {
      showStatus(`重命名失败：${String(error)}`);
    } finally {
      setIsBusy(false);
    }
  }

  async function relocateProject() {
    if (!modalProject) return;
    const path = pathInput.trim();
    if (!path) return showStatus("请选择或输入项目的新位置。");
    setIsBusy(true);
    try {
      const imported = await invoke<ProjectRecord>("import_project", { path });
      const nextProjects = [
        imported,
        ...projects.filter((item) => item.id !== imported.id && item.id !== modalProject.id),
      ];
      updateProjects(nextProjects);
      setSelectedProjectId(imported.id);
      closeModalAfterBusy();
      showStatus(`已重新记住项目位置：${imported.path}`);
    } catch (error) {
      showStatus(`重新定位失败：${String(error)}`);
    } finally {
      setIsBusy(false);
    }
  }

  function removeFromRecent(project: ProjectRecord) {
    updateProjects(projects.filter((item) => item.id !== project.id));
    if (selectedProjectId === project.id) setSelectedProjectId("");
    closeModalAfterBusy();
    showStatus(`已从最近项目列表移除：${project.name}`);
  }

  async function selectBinderCollection(collection: BinderCollection) {
    if (collection === activeCollection) return;
    await saveActiveDocument(false);
    setActiveCollection(collection);
    setToolbarMoreOpen(false);
    setOpenBinderMenu("");
    const nextRoot = binder[collection];
    const selected = firstNode(nextRoot.children);
    if (!currentProject || !selected) {
      setActiveNodeId("");
      setDocumentHtml("");
      return;
    }
    setActiveNodeId(selected.id);
    try {
      const html = await invoke<string>("read_binder_document", { path: currentProject.path, documentId: selected.id });
      setDocumentHtml(html);
    } catch (error) {
      showStatus(`读取文稿失败：${String(error)}`);
    }
  }

  async function selectBinderNode(collection: BinderCollection, node: BinderNode) {
    if (collection === activeCollection && node.id === activeNodeId) return;
    await saveActiveDocument(false);
    setActiveCollection(collection);
    setActiveNodeId(node.id);
    setToolbarMoreOpen(false);
    setOpenBinderMenu("");
    if (!currentProject) return;
    try {
      const html = await invoke<string>("read_binder_document", { path: currentProject.path, documentId: node.id });
      setDocumentHtml(html);
    } catch (error) {
      showStatus(`读取文稿失败：${String(error)}`);
    }
  }

  function scheduleSave() {
    if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current);
    saveTimerRef.current = window.setTimeout(() => {
      void saveActiveDocument(false);
    }, 900);
  }

  async function saveActiveDocument(showSaved = true, nextHtml?: string) {
    if (!currentProject || !activeNodeId) return;
    const content = nextHtml ?? editor?.getHTML() ?? documentHtml;
    try {
      const manifest = await invoke<ProjectManifest>("save_binder_document", {
        path: currentProject.path,
        documentId: activeNodeId,
        content,
      });
      const updatedProject = { ...currentProject, updatedAt: manifest.updatedAt, exists: true };
      setCurrentProject(updatedProject);
      updateProjects(projects.map((item) => (item.id === updatedProject.id ? updatedProject : item)));
      if (showSaved) showStatus("已保存。");
    } catch (error) {
      showStatus(`保存失败：${String(error)}`);
    }
  }

  function openCreateNodeModal(collection: BinderCollection, parentId?: string) {
    setNodeTarget({ collection, parentId });
    setNodeTitleInput(collection === "outline" ? "新的大纲" : "新的文稿");
    setNodeIconInput(collection === "outline" ? "◇" : "▦");
    setModalMode("createNode");
    setOpenBinderMenu("");
  }

  function openEditRootModal(collection: BinderCollection) {
    const root = binder[collection];
    setNodeTarget({ collection, isRoot: true });
    setNodeTitleInput(root.title);
    setNodeIconInput(root.icon || (collection === "outline" ? "🧭" : "📚"));
    setModalMode("editNode");
    setOpenBinderMenu("");
  }

  function openEditNodeModal(collection: BinderCollection, node: BinderNode) {
    setNodeTarget({ collection, nodeId: node.id });
    setNodeTitleInput(node.title);
    setNodeIconInput(node.icon || "▦");
    setModalMode("editNode");
    setOpenBinderMenu("");
  }

  async function createBinderNode() {
    if (!currentProject || !nodeTarget) return;
    const title = nodeTitleInput.trim();
    const icon = nodeIconInput.trim() || (nodeTarget.collection === "outline" ? "◇" : "▦");
    if (!title) return showStatus("请输入标题。");
    setIsBusy(true);
    try {
      const nextBinder = await invoke<BinderState>("create_binder_document", {
        path: currentProject.path,
        collection: nodeTarget.collection,
        parentId: nodeTarget.parentId ?? null,
        title,
        icon,
      });
      setBinder(nextBinder);
      if (nodeTarget.parentId) {
        setExpanded((items) => ({ ...items, [nodeKey(nodeTarget.collection, nodeTarget.parentId!)]: true }));
      }
      closeModalAfterBusy();
      showStatus("文稿已创建。");
    } catch (error) {
      showStatus(`创建失败：${String(error)}`);
    } finally {
      setIsBusy(false);
    }
  }

  async function saveBinderItemEdit() {
    if (!currentProject || !nodeTarget) return;
    const title = nodeTitleInput.trim();
    const icon = nodeIconInput.trim() || "▦";
    if (!title) return showStatus("请输入标题。");
    setIsBusy(true);
    try {
      const nextBinder = nodeTarget.isRoot
        ? await invoke<BinderState>("update_binder_root", {
            path: currentProject.path,
            collection: nodeTarget.collection,
            title,
            icon,
          })
        : await invoke<BinderState>("rename_binder_document", {
            path: currentProject.path,
            collection: nodeTarget.collection,
            documentId: nodeTarget.nodeId,
            title,
            icon,
          });
      setBinder(nextBinder);
      closeModalAfterBusy();
      showStatus("已更新标题与图标。");
    } catch (error) {
      showStatus(`更新失败：${String(error)}`);
    } finally {
      setIsBusy(false);
    }
  }

  async function deleteBinderNode(collection: BinderCollection, node: BinderNode) {
    if (!currentProject) return;
    const accepted = window.confirm(`确定删除「${node.title}」及其所有子文稿吗？`);
    if (!accepted) return;
    setIsBusy(true);
    try {
      const nextBinder = await invoke<BinderState>("delete_binder_document", {
        path: currentProject.path,
        collection,
        documentId: node.id,
      });
      setBinder(nextBinder);
      if (activeCollection === collection && activeNodeId === node.id) {
        const nextRoot = nextBinder[collection];
        const nextNode = firstNode(nextRoot.children);
        if (nextNode) {
          setActiveNodeId(nextNode.id);
          const html = await invoke<string>("read_binder_document", { path: currentProject.path, documentId: nextNode.id });
          setDocumentHtml(html);
        } else {
          setActiveNodeId("");
          setDocumentHtml("");
        }
      }
      setOpenBinderMenu("");
      showStatus("文稿已删除。");
    } catch (error) {
      showStatus(`删除失败：${String(error)}`);
    } finally {
      setIsBusy(false);
    }
  }

  function isExpanded(collection: BinderCollection, id: string) {
    return expanded[nodeKey(collection, id)] ?? id.endsWith("-root");
  }

  function toggleExpanded(collection: BinderCollection, id: string) {
    setExpanded((items) => ({ ...items, [nodeKey(collection, id)]: !isExpanded(collection, id) }));
  }

  function isEditorActive(command: string, attrs?: Record<string, unknown>) {
    if (!editor) return false;
    if (command === "textAlign") return editor.isActive(attrs ?? {});
    return attrs ? editor.isActive(command, attrs) : editor.isActive(command);
  }

  function setHeading(level: 1 | 2 | 3 | 4) {
    editor?.chain().focus().toggleHeading({ level }).run();
  }

  function setParagraph() {
    editor?.chain().focus().setParagraph().run();
  }

  function setTextAlign(alignment: "left" | "center" | "right" | "justify") {
    editor?.chain().focus().setTextAlign(alignment).run();
  }

  function applyFontSize(size: string) {
    editor?.chain().focus().setMark("textStyle", { fontSize: size }).run();
  }

  function applyLineHeight(lineHeight: string) {
    if (!editor) return;
    const chain = editor.chain().focus();
    if (editor.isActive("heading")) chain.updateAttributes("heading", { lineHeight }).run();
    else chain.updateAttributes("paragraph", { lineHeight }).run();
  }

  function openLinkModal() {
    if (!editor) return;
    setLinkUrlInput(editor.getAttributes("link").href ?? "");
    setModalMode("insertLink");
  }

  function applyLink() {
    if (!editor) return;
    const href = linkUrlInput.trim();
    if (!href) editor.chain().focus().extendMarkRange("link").unsetLink().run();
    else editor.chain().focus().extendMarkRange("link").setLink({ href }).run();
    closeModalAfterBusy();
  }

  function openImageModal() {
    setImageUrlInput("");
    setModalMode("insertImage");
  }

  function applyImage() {
    if (!editor) return;
    const src = imageUrlInput.trim();
    if (!src) return showStatus("请输入图片地址。");
    editor.chain().focus().setImage({ src }).run();
    closeModalAfterBusy();
  }

  function insertTable() {
    editor?.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run();
  }

  function applySlashCommand(command: "heading1" | "heading2" | "bullet" | "task" | "quote" | "table") {
    if (!editor) return;
    const from = editor.state.selection.from;
    const prev = editor.state.doc.textBetween(Math.max(0, from - 1), from, "", "");
    let chain = editor.chain().focus();
    if (prev === "/") chain = chain.deleteRange({ from: from - 1, to: from });
    switch (command) {
      case "heading1":
        chain.toggleHeading({ level: 1 }).run();
        break;
      case "heading2":
        chain.toggleHeading({ level: 2 }).run();
        break;
      case "bullet":
        chain.toggleBulletList().run();
        break;
      case "task":
        chain.toggleTaskList().run();
        break;
      case "quote":
        chain.toggleBlockquote().run();
        break;
      case "table":
        chain.insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run();
        break;
    }
    setSlashMenuOpen(false);
  }

  function characterCount() {
    if (!editor) return 0;
    const storage = editor.storage as { characterCount?: { characters?: () => number } };
    return storage.characterCount?.characters?.() ?? editor.state.doc.textContent.length;
  }

  function toolbarItems(): ToolbarItem[] {
    const tableDisabled = () => !editor?.isActive("table");
    return [
      { id: "paragraph", title: "正文", icon: "¶", group: "format", run: setParagraph, active: () => isEditorActive("paragraph") },
      { id: "h1", title: "一级标题", icon: "H1", group: "format", run: () => setHeading(1), active: () => isEditorActive("heading", { level: 1 }) },
      { id: "h2", title: "二级标题", icon: "H2", group: "format", run: () => setHeading(2), active: () => isEditorActive("heading", { level: 2 }) },
      { id: "h3", title: "三级标题", icon: "H3", group: "format", run: () => setHeading(3), active: () => isEditorActive("heading", { level: 3 }) },
      { id: "h4", title: "四级标题", icon: "H4", group: "format", run: () => setHeading(4), active: () => isEditorActive("heading", { level: 4 }) },
      { id: "bold", title: "加粗", icon: "B", group: "format", run: () => editor?.chain().focus().toggleBold().run(), active: () => isEditorActive("bold") },
      { id: "italic", title: "斜体", icon: "I", group: "format", run: () => editor?.chain().focus().toggleItalic().run(), active: () => isEditorActive("italic") },
      { id: "underline", title: "下划线", icon: "U", group: "format", run: () => editor?.chain().focus().toggleUnderline().run(), active: () => isEditorActive("underline") },
      { id: "strike", title: "删除线", icon: "S", group: "format", run: () => editor?.chain().focus().toggleStrike().run(), active: () => isEditorActive("strike") },
      { id: "code", title: "行内代码", icon: "</>", group: "format", run: () => editor?.chain().focus().toggleCode().run(), active: () => isEditorActive("code") },
      { id: "quote", title: "引用", icon: "“”", group: "layout", run: () => editor?.chain().focus().toggleBlockquote().run(), active: () => isEditorActive("blockquote") },
      { id: "codeBlock", title: "代码块", icon: "▣", group: "layout", run: () => editor?.chain().focus().toggleCodeBlock().run(), active: () => isEditorActive("codeBlock") },
      { id: "left", title: "左对齐", icon: "☰", group: "layout", run: () => setTextAlign("left"), active: () => isEditorActive("textAlign", { textAlign: "left" }) },
      { id: "center", title: "居中", icon: "≡", group: "layout", run: () => setTextAlign("center"), active: () => isEditorActive("textAlign", { textAlign: "center" }) },
      { id: "right", title: "右对齐", icon: "☷", group: "layout", run: () => setTextAlign("right"), active: () => isEditorActive("textAlign", { textAlign: "right" }) },
      { id: "justify", title: "两端对齐", icon: "▤", group: "layout", run: () => setTextAlign("justify"), active: () => isEditorActive("textAlign", { textAlign: "justify" }) },
      { id: "bullet", title: "无序列表", icon: "•", group: "layout", run: () => editor?.chain().focus().toggleBulletList().run(), active: () => isEditorActive("bulletList") },
      { id: "ordered", title: "有序列表", icon: "1.", group: "layout", run: () => editor?.chain().focus().toggleOrderedList().run(), active: () => isEditorActive("orderedList") },
      { id: "task", title: "任务清单", icon: "☑", group: "layout", run: () => editor?.chain().focus().toggleTaskList().run(), active: () => isEditorActive("taskList") },
      { id: "rule", title: "分隔线", icon: "—", group: "insert", run: () => editor?.chain().focus().setHorizontalRule().run() },
      { id: "link", title: "链接", icon: "🔗", group: "insert", run: openLinkModal, active: () => isEditorActive("link") },
      { id: "image", title: "图片", icon: "▧", group: "insert", run: openImageModal },
      { id: "table", title: "插入表格", icon: "▦", group: "insert", run: insertTable },
      { id: "row", title: "追加表格行", icon: "↕", group: "table", run: () => editor?.chain().focus().addRowAfter().run(), disabled: tableDisabled },
      { id: "column", title: "追加表格列", icon: "↔", group: "table", run: () => editor?.chain().focus().addColumnAfter().run(), disabled: tableDisabled },
      { id: "merge", title: "合并单元格", icon: "⇄", group: "table", run: () => editor?.chain().focus().mergeCells().run(), disabled: tableDisabled },
      { id: "split", title: "拆分单元格", icon: "⇆", group: "table", run: () => editor?.chain().focus().splitCell().run(), disabled: tableDisabled },
      { id: "deleteTable", title: "删除表格", icon: "×", group: "table", run: () => editor?.chain().focus().deleteTable().run(), disabled: tableDisabled },
      { id: "fontSize", title: "字号", icon: "字", group: "style", control: "fontSize" },
      { id: "lineHeight", title: "行高", icon: "↕", group: "style", control: "lineHeight" },
      { id: "color", title: "文字颜色", icon: "A", group: "style", control: "color" },
      { id: "highlight", title: "高亮", icon: "▰", group: "style", control: "highlight" },
      { id: "undo", title: "撤销", icon: "↶", group: "history", run: () => editor?.chain().focus().undo().run() },
      { id: "redo", title: "重做", icon: "↷", group: "history", run: () => editor?.chain().focus().redo().run() },
    ];
  }

  function renderToolbarButton(item: ToolbarItem, compact = false) {
    if (item.control) return renderToolbarControl(item, compact);
    const isActive = item.active?.() ?? false;
    const isDisabled = item.disabled?.() ?? false;
    return (
      <button
        key={item.id}
        className={`toolbar-btn ${isActive ? "active" : ""} ${compact ? "compact" : ""}`}
        onMouseDown={(event) => event.preventDefault()}
        onClick={() => {
          item.run?.();
          if (compact) setToolbarMoreOpen(false);
        }}
        disabled={isDisabled}
        title={item.title}
        aria-label={item.title}
      >
        <span className="toolbar-icon">{item.icon}</span>
        {compact ? <span>{item.title}</span> : null}
      </button>
    );
  }

  function renderToolbarControl(item: ToolbarItem, compact = false) {
    if (!editor) return null;
    const currentFontSize = editor.getAttributes("textStyle").fontSize ?? "18px";
    const currentLineHeight = editor.getAttributes("paragraph").lineHeight || editor.getAttributes("heading").lineHeight || "1.8";
    if (item.control === "fontSize") {
      return (
        <label key={item.id} className={`toolbar-select ${compact ? "compact" : ""}`} title={item.title}>
          <span>字号</span>
          <select
            value={currentFontSize}
            onMouseDown={(event) => event.stopPropagation()}
            onChange={(event) => applyFontSize(event.currentTarget.value)}
          >
            {FONT_SIZE_OPTIONS.map((size) => (
              <option key={size} value={size}>{size}</option>
            ))}
          </select>
        </label>
      );
    }
    if (item.control === "lineHeight") {
      return (
        <label key={item.id} className={`toolbar-select ${compact ? "compact" : ""}`} title={item.title}>
          <span>行高</span>
          <select
            value={currentLineHeight}
            onMouseDown={(event) => event.stopPropagation()}
            onChange={(event) => applyLineHeight(event.currentTarget.value)}
          >
            {LINE_HEIGHT_OPTIONS.map((lineHeight) => (
              <option key={lineHeight} value={lineHeight}>{lineHeight}</option>
            ))}
          </select>
        </label>
      );
    }
    if (item.control === "color") {
      return (
        <div key={item.id} className={`toolbar-palette ${compact ? "compact" : ""}`} title={item.title}>
          <span>A</span>
          {COLOR_PRESETS.map((color) => (
            <button
              key={color}
              className="swatch"
              style={{ backgroundColor: color }}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => editor.chain().focus().setColor(color).run()}
              aria-label={`文字颜色 ${color}`}
            />
          ))}
        </div>
      );
    }
    return (
      <div key={item.id} className={`toolbar-palette ${compact ? "compact" : ""}`} title={item.title}>
        <span>▰</span>
        {HIGHLIGHT_PRESETS.map((color) => (
          <button
            key={color}
            className="swatch"
            style={{ backgroundColor: color }}
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => editor.chain().focus().toggleHighlight({ color }).run()}
            aria-label={`高亮 ${color}`}
          />
        ))}
      </div>
    );
  }

  function toggleToolbarPreference(id: ToolbarItemId) {
    setVisibleToolbarIds((ids) => (ids.includes(id) ? ids.filter((item) => item !== id) : [...ids, id]));
  }

  function renderEditorToolbar() {
    if (!editor) return null;
    void editorTick;
    const allItems = toolbarItems();
    const visibleItems = allItems.filter((item) => visibleToolbarIds.includes(item.id));
    const overflowItems = allItems.filter((item) => !visibleToolbarIds.includes(item.id));
    const firstRow = visibleItems.filter((item) => ["format", "history"].includes(item.group));
    const secondRow = visibleItems.filter((item) => !["format", "history"].includes(item.group));
    const breadcrumb = `${currentProject?.name ?? "未命名项目"} › ${activeRoot.title}${activeNode ? ` › ${activeNode.title}` : ""}`;

    return (
      <header className="editor-toolbar">
        <div className="toolbar-topline">
          <div className="toolbar-left">
            <button className="icon-btn" onClick={() => setLeftSidebarOpen((value) => !value)} title="显示/隐藏侧边栏">◧</button>
            <div className="breadcrumb">{breadcrumb}</div>
          </div>
          <div className="toolbar-right">
            <div className="count-pill">{characterCount().toLocaleString("zh-CN")} 字</div>
            <button className="icon-btn" title="搜索">⌕</button>
            <button className={`icon-btn ai ${aiPanelOpen ? "active" : ""}`} onClick={() => setAiPanelOpen((value) => !value)} title="AI 助手">✦</button>
          </div>
        </div>
        <div className="toolbar-row">
          {firstRow.map((item) => renderToolbarButton(item))}
          <button className="toolbar-btn" onMouseDown={(event) => event.preventDefault()} onClick={() => setToolbarMoreOpen((value) => !value)} title="更多编辑按钮">…</button>
          <button className="toolbar-btn save" onMouseDown={(event) => event.preventDefault()} onClick={() => void saveActiveDocument(true)} title="保存">✓</button>
        </div>
        <div className="toolbar-row second">
          {secondRow.map((item) => renderToolbarButton(item))}
        </div>
        {toolbarMoreOpen ? (
          <div className="toolbar-more-panel">
            <div className="toolbar-more-header">
              <strong>更多编辑按钮</strong>
              <button onClick={() => setModalMode("preferences")}>首选项…</button>
            </div>
            {Object.entries(TOOLBAR_GROUP_LABELS).map(([group, label]) => {
              const items = overflowItems.filter((item) => item.group === group);
              if (items.length === 0) return null;
              return (
                <div className="toolbar-more-group" key={group}>
                  <h4>{label}</h4>
                  <div>{items.map((item) => renderToolbarButton(item, true))}</div>
                </div>
              );
            })}
            {overflowItems.length === 0 ? <p className="muted small">所有按钮已显示在主工具栏。</p> : null}
          </div>
        ) : null}
      </header>
    );
  }

  function renderBinderRoot(collection: BinderCollection) {
    const root = binder[collection];
    const rootKey = nodeKey(collection, root.id);
    const expandedRoot = isExpanded(collection, root.id);
    const active = activeCollection === collection;
    return (
      <div className="binder-section" key={collection}>
        <div className={`binder-root-row ${active ? "active" : ""}`}>
          <button className="disclosure" onClick={() => toggleExpanded(collection, root.id)}>{expandedRoot ? "⌄" : "›"}</button>
          <button className="binder-icon" onClick={() => openEditRootModal(collection)} title="修改根目录图标">{root.icon}</button>
          <button className="binder-title" onClick={() => void selectBinderCollection(collection)}>{root.title}</button>
          <button className="mini-action" onClick={() => openCreateNodeModal(collection, root.id)} title="添加文稿">＋</button>
          <button className="mini-action" onClick={() => setOpenBinderMenu(openBinderMenu === rootKey ? "" : rootKey)} title="更多">…</button>
          {openBinderMenu === rootKey ? (
            <div className="binder-context-menu">
              <button onClick={() => openCreateNodeModal(collection, root.id)}>添加子文稿</button>
              <button onClick={() => openEditRootModal(collection)}>重命名 / 图标</button>
            </div>
          ) : null}
        </div>
        {expandedRoot ? (
          <div className="binder-children">
            {root.children.map((node) => renderBinderNode(collection, node, 1))}
            {root.children.length === 0 ? (
              <button className="empty-add" onClick={() => openCreateNodeModal(collection, root.id)}>＋ 添加第一个文稿</button>
            ) : null}
          </div>
        ) : null}
      </div>
    );
  }

  function renderBinderNode(collection: BinderCollection, node: BinderNode, depth: number): React.ReactNode {
    const hasChildren = node.children.length > 0;
    const expandedNode = isExpanded(collection, node.id);
    const key = nodeKey(collection, node.id);
    const active = activeCollection === collection && activeNodeId === node.id;
    return (
      <div className="binder-node-block" key={node.id}>
        <div className={`binder-node-row ${active ? "active" : ""}`} style={{ paddingLeft: `${depth * 14 + 4}px` }}>
          <button className="disclosure" onClick={() => hasChildren && toggleExpanded(collection, node.id)}>{hasChildren ? (expandedNode ? "⌄" : "›") : ""}</button>
          <button className="binder-icon" onClick={() => openEditNodeModal(collection, node)} title="修改图标">{node.icon}</button>
          <button className="binder-title" onClick={() => void selectBinderNode(collection, node)}>{node.title}</button>
          <button className="mini-action" onClick={() => openCreateNodeModal(collection, node.id)} title="添加子文稿">＋</button>
          <button className="mini-action" onClick={() => setOpenBinderMenu(openBinderMenu === key ? "" : key)} title="更多">…</button>
          {openBinderMenu === key ? (
            <div className="binder-context-menu">
              <button onClick={() => openCreateNodeModal(collection, node.id)}>添加子文稿</button>
              <button onClick={() => openEditNodeModal(collection, node)}>重命名 / 图标</button>
              <button className="danger" onClick={() => void deleteBinderNode(collection, node)}>删除文稿</button>
            </div>
          ) : null}
        </div>
        {hasChildren && expandedNode ? (
          <div>{node.children.map((child) => renderBinderNode(collection, child, depth + 1))}</div>
        ) : null}
      </div>
    );
  }

  function renderSidebar() {
    if (!leftSidebarOpen) return null;
    return (
      <aside className="sidebar">
        <div className="project-switcher">
          <div className="project-name"><span className="orange-mark">▯</span>{currentProject?.name ?? "未打开项目"}</div>
          <button onClick={() => setView("projects")} title="返回项目列表">⌄</button>
        </div>

        <div className="sidebar-scroll">
          <section className="nav-section">
            <div className="section-title">项目设定</div>
            <button className="nav-item"><span>♙</span>人物档案</button>
            <button className="nav-item"><span>□</span>世界观设定</button>
            <button className="nav-item"><span>⌁</span>大纲与时间线</button>
          </section>

          <section className="nav-section">
            <div className="section-title with-action"><span>写作中心</span></div>
            {renderBinderRoot("draft")}
            {renderBinderRoot("outline")}
          </section>
        </div>

        <div className="sidebar-footer">
          <button className="settings-entry" onClick={() => setModalMode("preferences")}>⚙ 软件设置</button>
        </div>
      </aside>
    );
  }

  function renderWriter() {
    return (
      <div className="app-shell">
        <div className="ambient ambient-left" />
        <div className="ambient ambient-right" />
        {renderSidebar()}
        <main className="writer-pane">
          <div className="app-titlebar">
            <strong>Mastps Editor UI</strong>
            <div className="window-actions"><button>↶</button><button>↷</button><button>×</button></div>
          </div>
          {renderEditorToolbar()}
          <div className="writing-surface">
            {activeNode ? (
              <div className="page-wrap">
                <div className="document-kicker">{activeRoot.icon} {activeRoot.title}</div>
                <input
                  className="document-title-input"
                  value={activeNode.title}
                  readOnly
                  title="标题请在左侧栏通过“重命名 / 图标”修改"
                />
                {editor ? (
                  <BubbleMenu editor={editor} tippyOptions={{ duration: 120 }}>
                    <div className="bubble-menu">
                      <button onClick={() => editor.chain().focus().toggleBold().run()}>B</button>
                      <button onClick={() => editor.chain().focus().toggleItalic().run()}>I</button>
                      <button onClick={openLinkModal}>链接</button>
                    </div>
                  </BubbleMenu>
                ) : null}
                <EditorContent editor={editor} />
                {slashMenuOpen ? (
                  <div className="slash-menu">
                    <button onClick={() => applySlashCommand("heading1")}>H1 一级标题</button>
                    <button onClick={() => applySlashCommand("heading2")}>H2 二级标题</button>
                    <button onClick={() => applySlashCommand("bullet")}>• 无序列表</button>
                    <button onClick={() => applySlashCommand("task")}>☑ 任务清单</button>
                    <button onClick={() => applySlashCommand("quote")}>“ 引用</button>
                    <button onClick={() => applySlashCommand("table")}>▦ 表格</button>
                  </div>
                ) : null}
              </div>
            ) : (
              <div className="empty-editor-state">
                <div className="empty-icon">{activeRoot.icon}</div>
                <h2>{activeRoot.title}</h2>
                <p>{activeCollection === "draft" ? "这里是 Scrivener 式草稿根目录，可以无限添加子文稿。" : "这里是大纲模块，默认包含自由写作，也可以继续添加子大纲。"}</p>
                <button className="primary" onClick={() => openCreateNodeModal(activeCollection, activeRoot.id)}>添加文稿</button>
              </div>
            )}
          </div>
        </main>
        {aiPanelOpen ? renderAiPanel() : null}
        {statusMessage ? <div className="toast">{statusMessage}</div> : null}
        {renderModal()}
      </div>
    );
  }

  function renderAiPanel() {
    return (
      <aside className="ai-panel">
        <div className="ai-tabs">
          <button className="active">✦ AI 助手</button>
          <button>▧ 参考设定</button>
        </div>
        <div className="ai-body">
          <div className="ai-card">
            <div className="ai-card-title">✦ 剧情推演</div>
            <p>这里暂时只显示 AI 侧边栏，不接入实际功能。后续可以在这里扩写、总结、检查设定一致性。</p>
            <div className="ai-actions"><button>扩写环境</button><button>生成设定</button></div>
          </div>
          <div className="note-card">
            <strong>当前上下文</strong>
            <ul>
              <li>模块：{activeRoot.title}</li>
              <li>文稿：{activeNode?.title ?? "未选择"}</li>
              <li>层级树：{countNodes(activeRoot.children)} 个文稿</li>
            </ul>
          </div>
        </div>
        <div className="ai-input"><input placeholder="询问 AI 关于剧情的建议…" /><button>↵</button></div>
      </aside>
    );
  }

  function renderProjectsScreen() {
    return (
      <div className="project-screen">
        <div className="ambient ambient-left" />
        <div className="ambient ambient-right" />
        <div className="project-card hero-card">
          <div>
            <div className="brand-label">MASTERPIECES</div>
            <h1>选择项目</h1>
          </div>
          <div className="hero-actions">
            <button className="secondary" onClick={openImportProjectModal}>打开已有项目</button>
            <button className="square-primary" onClick={openCreateProjectModal}>＋</button>
          </div>
        </div>
        <div className="project-card table-card">
          <div className="project-table-head"><span>序号</span><span>项目名称</span><span>最后修改时间</span><span>创建时间</span><span></span></div>
          <div className="project-table-body">
            {projects.length === 0 ? <div className="empty-projects">还没有最近项目。点击右上角“＋”创建一个。</div> : null}
            {projects.map((project, index) => (
              <button
                key={project.id}
                className={`project-row ${selectedProjectId === project.id ? "selected" : ""} ${project.exists === false ? "missing" : ""}`}
                onClick={() => setSelectedProjectId(project.id)}
                onDoubleClick={() => void openProject()}
              >
                <span>{index + 1}</span>
                <strong>{project.name}</strong>
                <span>{formatTime(project.updatedAt)}</span>
                <span>{formatTime(project.createdAt)}</span>
                <span className="row-actions" onClick={(event) => event.stopPropagation()}>
                  <button onClick={() => openProjectActionsModal(project)}>…</button>
                </span>
              </button>
            ))}
          </div>
        </div>
        <button className="enter-button" disabled={!selectedProject || isBusy} onClick={() => void openProject()}>进入</button>
        {statusMessage ? <div className="toast">{statusMessage}</div> : null}
        {renderModal()}
      </div>
    );
  }

  function renderModal() {
    if (!modalMode) return null;
    const allItems = toolbarItems();
    return (
      <div className="modal-backdrop" onMouseDown={closeModal}>
        <div className="modal" onMouseDown={(event) => event.stopPropagation()}>
          {modalMode === "createProject" ? (
            <>
              <h2>创建项目</h2>
              <label>项目名称<input value={projectNameInput} onChange={(event) => setProjectNameInput(event.currentTarget.value)} placeholder="我的小说" autoFocus /></label>
              <label>存档文件夹<div className="path-row"><input value={pathInput} onChange={(event) => setPathInput(event.currentTarget.value)} placeholder="/Users/you/Documents" /><button onClick={() => void chooseFolderForInput("create")}>选择…</button></div></label>
              <div className="modal-actions"><button onClick={closeModal}>取消</button><button className="primary" onClick={() => void createProject()} disabled={isBusy}>创建</button></div>
            </>
          ) : null}

          {modalMode === "importProject" ? (
            <>
              <h2>打开已有项目</h2>
              <label>项目文件夹<div className="path-row"><input value={pathInput} onChange={(event) => setPathInput(event.currentTarget.value)} placeholder="选择 .masterpiece 文件夹" autoFocus /><button onClick={() => void chooseFolderForInput("project")}>选择…</button></div></label>
              <div className="modal-actions"><button onClick={closeModal}>取消</button><button className="primary" onClick={() => void importExistingProject()} disabled={isBusy}>打开</button></div>
            </>
          ) : null}

          {modalMode === "renameProject" ? (
            <>
              <h2>重命名项目</h2>
              <label>项目名称<input value={projectNameInput} onChange={(event) => setProjectNameInput(event.currentTarget.value)} autoFocus /></label>
              <div className="modal-actions"><button onClick={closeModal}>取消</button><button className="primary" onClick={() => void renameProject()} disabled={isBusy}>保存</button></div>
            </>
          ) : null}

          {modalMode === "relocateProject" ? (
            <>
              <h2>重新定位项目</h2>
              <label>项目文件夹<div className="path-row"><input value={pathInput} onChange={(event) => setPathInput(event.currentTarget.value)} autoFocus /><button onClick={() => void chooseFolderForInput("project")}>选择…</button></div></label>
              <div className="modal-actions"><button onClick={closeModal}>取消</button><button className="primary" onClick={() => void relocateProject()} disabled={isBusy}>保存</button></div>
            </>
          ) : null}

          {modalMode === "projectActions" && modalProject ? (
            <>
              <h2>{modalProject.name}</h2>
              <p className="muted path-text">{modalProject.path}</p>
              <div className="action-list">
                <button onClick={() => openRenameProjectModal(modalProject)}>重命名项目</button>
                <button onClick={() => openRelocateProjectModal(modalProject)}>重新定位</button>
                <button className="danger" onClick={() => removeFromRecent(modalProject)}>从最近列表移除</button>
              </div>
              <div className="modal-actions"><button onClick={closeModal}>关闭</button></div>
            </>
          ) : null}

          {modalMode === "createNode" ? (
            <>
              <h2>添加文稿</h2>
              <label>标题<input value={nodeTitleInput} onChange={(event) => setNodeTitleInput(event.currentTarget.value)} autoFocus /></label>
              <label>标题图标<input value={nodeIconInput} onChange={(event) => setNodeIconInput(event.currentTarget.value)} placeholder="可输入 emoji、单字或符号" /></label>
              <p className="muted small">文稿可以继续添加子文稿，层级数量不限制。</p>
              <div className="modal-actions"><button onClick={closeModal}>取消</button><button className="primary" onClick={() => void createBinderNode()} disabled={isBusy}>添加</button></div>
            </>
          ) : null}

          {modalMode === "editNode" ? (
            <>
              <h2>标题与图标</h2>
              <label>标题<input value={nodeTitleInput} onChange={(event) => setNodeTitleInput(event.currentTarget.value)} autoFocus /></label>
              <label>标题图标<input value={nodeIconInput} onChange={(event) => setNodeIconInput(event.currentTarget.value)} placeholder="例如 📄、🧭、🌙、人物" /></label>
              <div className="modal-actions"><button onClick={closeModal}>取消</button><button className="primary" onClick={() => void saveBinderItemEdit()} disabled={isBusy}>保存</button></div>
            </>
          ) : null}

          {modalMode === "insertLink" ? (
            <>
              <h2>插入链接</h2>
              <label>地址<input value={linkUrlInput} onChange={(event) => setLinkUrlInput(event.currentTarget.value)} placeholder="https://" autoFocus /></label>
              <div className="modal-actions"><button onClick={closeModal}>取消</button><button className="primary" onClick={applyLink}>应用</button></div>
            </>
          ) : null}

          {modalMode === "insertImage" ? (
            <>
              <h2>插入图片</h2>
              <label>图片地址<input value={imageUrlInput} onChange={(event) => setImageUrlInput(event.currentTarget.value)} placeholder="https:// 或 base64" autoFocus /></label>
              <div className="modal-actions"><button onClick={closeModal}>取消</button><button className="primary" onClick={applyImage}>插入</button></div>
            </>
          ) : null}

          {modalMode === "preferences" ? (
            <>
              <h2>首选项</h2>
              <p className="muted">选择哪些编辑按钮显示在主工具栏；未勾选的按钮会进入“…”菜单。</p>
              <div className="prefs-list">
                {Object.entries(TOOLBAR_GROUP_LABELS).map(([group, label]) => {
                  const items = allItems.filter((item) => item.group === group);
                  return (
                    <div key={group} className="prefs-group">
                      <h3>{label}</h3>
                      <div className="prefs-grid">
                        {items.map((item) => (
                          <label key={item.id} className="check-row">
                            <input type="checkbox" checked={visibleToolbarIds.includes(item.id)} onChange={() => toggleToolbarPreference(item.id)} />
                            <span>{item.icon}</span>
                            <strong>{item.title}</strong>
                          </label>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="modal-actions"><button onClick={() => setVisibleToolbarIds(DEFAULT_VISIBLE_TOOLBAR_IDS)}>恢复默认</button><button className="primary" onClick={closeModal}>完成</button></div>
            </>
          ) : null}
        </div>
      </div>
    );
  }

  if (view === "splash") {
    return <div className="splash"><div className="splash-logo">MasterPieces</div><div className="splash-subtitle">长篇叙事工程系统</div></div>;
  }

  if (view === "projects") return renderProjectsScreen();
  return renderWriter();
}

import React, { useEffect, useMemo, useRef, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { getCurrentWindow } from "@tauri-apps/api/window";
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


type IconName =
  | "write"
  | "outline"
  | "characters"
  | "lore"
  | "timeline"
  | "ideas"
  | "search"
  | "settings"
  | "back"
  | "menu"
  | "plus"
  | "more"
  | "folder"
  | "file"
  | "save"
  | "expand"
  | "minimize"
  | "maximize"
  | "close"
  | "home";

const TAB_ICON: Record<WorkspaceTab, IconName> = {
  write: "write",
  outline: "outline",
  characters: "characters",
  lore: "lore",
  timeline: "timeline",
  ideas: "ideas",
};

function LineIcon({ name, size = 18, strokeWidth = 1.7 }: { name: IconName; size?: number; strokeWidth?: number }) {
  const common = {
    fill: "none",
    stroke: "currentColor",
    strokeWidth,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };
  const paths: Record<IconName, React.ReactNode> = {
    write: <><path {...common} d="M4 20l4.2-1 10-10a2.8 2.8 0 0 0-4-4l-10 10L4 20z" /><path {...common} d="M13.5 5.5l5 5" /></>,
    outline: <><path {...common} d="M7 4h13" /><path {...common} d="M7 10h13" /><path {...common} d="M7 16h13" /><path {...common} d="M3.5 4h.01" /><path {...common} d="M3.5 10h.01" /><path {...common} d="M3.5 16h.01" /></>,
    characters: <><path {...common} d="M16 19c0-2.2-1.8-4-4-4s-4 1.8-4 4" /><circle {...common} cx="12" cy="9" r="3.2" /><path {...common} d="M20 18c0-1.6-1-3-2.4-3.6" /><path {...common} d="M17 6.4a2.8 2.8 0 0 1 0 5.2" /></>,
    lore: <><path {...common} d="M4.5 6.5v13l5-2.5 5 2.5 5-2.5v-13l-5 2.5-5-2.5-5 2.5z" /><path {...common} d="M9.5 4v13" /><path {...common} d="M14.5 6.5v13" /></>,
    timeline: <><path {...common} d="M5 5v14" /><path {...common} d="M19 5v14" /><path {...common} d="M5 8h8" /><path {...common} d="M11 12h8" /><path {...common} d="M5 16h8" /></>,
    ideas: <><path {...common} d="M12 3l.8 3.4L16 7.2l-3.2.8L12 11.5l-.8-3.5L8 7.2l3.2-.8L12 3z" /><path {...common} d="M18 13l.5 2 2 .5-2 .5-.5 2-.5-2-2-.5 2-.5.5-2z" /><path {...common} d="M6 13l.4 1.6L8 15l-1.6.4L6 17l-.4-1.6L4 15l1.6-.4L6 13z" /></>,
    search: <><circle {...common} cx="10.5" cy="10.5" r="5.5" /><path {...common} d="M15 15l4 4" /></>,
    settings: <><path {...common} d="M12 8.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7z" /><path {...common} d="M19 12a7.2 7.2 0 0 0-.1-1l2-1.5-2-3.4-2.4 1a7.3 7.3 0 0 0-1.8-1L14.4 3h-4l-.4 3a7.3 7.3 0 0 0-1.8 1l-2.4-1-2 3.4L6 11a7.2 7.2 0 0 0 0 2l-2 1.5 2 3.4 2.4-1a7.3 7.3 0 0 0 1.8 1l.4 3h4l.4-3a7.3 7.3 0 0 0 1.8-1l2.4 1 2-3.4-2-1.5c.1-.3.1-.7.1-1z" /></>,
    back: <><path {...common} d="M15 18l-6-6 6-6" /></>,
    menu: <><path {...common} d="M4 7h16" /><path {...common} d="M4 12h16" /><path {...common} d="M4 17h16" /></>,
    plus: <><path {...common} d="M12 5v14" /><path {...common} d="M5 12h14" /></>,
    more: <><circle {...common} cx="6" cy="12" r=".8" /><circle {...common} cx="12" cy="12" r=".8" /><circle {...common} cx="18" cy="12" r=".8" /></>,
    folder: <><path {...common} d="M3.5 7.5h6l1.7 2H20.5v8.5a2 2 0 0 1-2 2h-13a2 2 0 0 1-2-2V7.5z" /><path {...common} d="M3.5 9.5h17" /></>,
    file: <><path {...common} d="M6 3.5h8l4 4V20a1.5 1.5 0 0 1-1.5 1.5h-10A1.5 1.5 0 0 1 5 20V5A1.5 1.5 0 0 1 6.5 3.5z" /><path {...common} d="M14 3.5v5h5" /><path {...common} d="M8 13h8" /><path {...common} d="M8 16h6" /></>,
    save: <><path {...common} d="M5 4h12l2 2v14H5V4z" /><path {...common} d="M8 4v6h8V4" /><path {...common} d="M8 20v-6h8v6" /></>,
    expand: <><path {...common} d="M8 4H4v4" /><path {...common} d="M4 4l6 6" /><path {...common} d="M16 20h4v-4" /><path {...common} d="M20 20l-6-6" /></>,
    minimize: <><path {...common} d="M6 12h12" /></>,
    maximize: <><rect {...common} x="6" y="6" width="12" height="12" rx="1.5" /></>,
    close: <><path {...common} d="M7 7l10 10" /><path {...common} d="M17 7L7 17" /></>,
    home: <><path {...common} d="M4 11l8-7 8 7" /><path {...common} d="M6.5 10v9h11v-9" /><path {...common} d="M10 19v-5h4v5" /></>,
  };
  return (
    <svg className="line-icon" width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      {paths[name]}
    </svg>
  );
}

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
type WorkspaceTab = "write" | "outline" | "characters" | "lore" | "timeline" | "ideas";
type SaveState = "idle" | "dirty" | "saving" | "saved" | "error";

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
  | "createResource"
  | "editResource"
  | null;

type NodeTarget = {
  collection: BinderCollection;
  parentId?: string;
  nodeId?: string;
  isRoot?: boolean;
};

type ResourceKind = "characters" | "lore" | "timeline" | "ideas";

type ResourceRecord = {
  id: string;
  kind: ResourceKind;
  title: string;
  subtitle: string;
  group: string;
  status: string;
  tags: string[];
  body: string;
  createdAt: string;
  updatedAt: string;
};

type ToolbarItemId =
  | "paragraph"
  | "h1"
  | "h2"
  | "h3"
  | "bold"
  | "italic"
  | "underline"
  | "strike"
  | "quote"
  | "code"
  | "left"
  | "center"
  | "right"
  | "bullet"
  | "ordered"
  | "task"
  | "rule"
  | "link"
  | "image"
  | "table"
  | "fontSize"
  | "lineHeight"
  | "color"
  | "highlight"
  | "undo"
  | "redo";

type ToolbarItem = {
  id: ToolbarItemId;
  title: string;
  icon: string;
  group: "format" | "layout" | "insert" | "history" | "style";
  run?: () => void;
  active?: () => boolean;
  disabled?: () => boolean;
  control?: "fontSize" | "lineHeight" | "color" | "highlight";
};

const RECENT_PROJECTS_KEY = "masterpieces.recentProjects.v1";
const TOOLBAR_PREFS_KEY = "masterpieces.toolbar.visible.v4";
const RESOURCE_STORE_PREFIX = "masterpieces.resources.v2";

const EMPTY_BINDER: BinderState = {
  draft: { id: "draft-root", title: "草稿", icon: "✍", children: [] },
  outline: { id: "outline-root", title: "大纲", icon: "◇", children: [] },
};

const FONT_SIZE_OPTIONS = ["14px", "16px", "18px", "20px", "24px", "28px", "32px"];
const LINE_HEIGHT_OPTIONS = ["1.4", "1.6", "1.8", "2", "2.2", "2.5"];
const COLOR_PRESETS = ["#111111", "#7c2d12", "#92400e", "#166534", "#1d4ed8", "#6d28d9", "#be123c", "#f5f5f5"];
const HIGHLIGHT_PRESETS = ["#fef08a", "#fed7aa", "#bbf7d0", "#bfdbfe", "#e9d5ff"];
const DEFAULT_VISIBLE_TOOLBAR_IDS: ToolbarItemId[] = [
  "paragraph",
  "h1",
  "h2",
  "bold",
  "italic",
  "underline",
  "quote",
  "left",
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

const WORKSPACE_TABS: Array<{ id: WorkspaceTab; label: string; icon: string; hint: string }> = [
  { id: "write", label: "撰写", icon: "✍", hint: "章节正文" },
  { id: "outline", label: "大纲", icon: "◇", hint: "结构与伏笔" },
  { id: "characters", label: "人物", icon: "♙", hint: "角色资料库" },
  { id: "lore", label: "设定", icon: "□", hint: "世界观资料" },
  { id: "timeline", label: "时间线", icon: "⌁", hint: "事件顺序" },
  { id: "ideas", label: "灵感箱", icon: "✦", hint: "碎片与待办" },
];

const RESOURCE_LABELS: Record<ResourceKind, { title: string; empty: string; cta: string; placeholder: string }> = {
  characters: {
    title: "人物资料库",
    empty: "还没有人物卡。可以添加主角、反派、配角、势力人物。",
    cta: "新建人物",
    placeholder: "人物动机、弱点、关系、成长线……",
  },
  lore: {
    title: "世界观与设定",
    empty: "还没有设定卡。可以添加地点、道具、组织、功法、规则。",
    cta: "新建设定",
    placeholder: "地点、规则、组织、道具、禁忌与冲突点……",
  },
  timeline: {
    title: "时间线",
    empty: "还没有事件。可以记录故事前史、主线节点、伏笔回收点。",
    cta: "新建事件",
    placeholder: "事件发生时间、参与人物、因果关系、后续影响……",
  },
  ideas: {
    title: "灵感箱",
    empty: "还没有灵感。把零散句子、桥段、冲突、待办先收进这里。",
    cta: "新建灵感",
    placeholder: "一句话梗概、片段、问题、待完善内容……",
  },
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

function nowIso() {
  return new Date().toISOString();
}

function makeId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
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
    const parsed = JSON.parse(raw) as ToolbarItemId[];
    return Array.isArray(parsed) ? parsed : DEFAULT_VISIBLE_TOOLBAR_IDS;
  } catch {
    return DEFAULT_VISIBLE_TOOLBAR_IDS;
  }
}

function resourceKey(projectId: string) {
  return `${RESOURCE_STORE_PREFIX}.${projectId}`;
}

function sampleResources(): ResourceRecord[] {
  const createdAt = nowIso();
  return [
    {
      id: makeId("character"),
      kind: "characters",
      title: "主角",
      subtitle: "核心人物",
      group: "protagonist",
      status: "待完善",
      tags: ["目标", "弱点", "成长线"],
      body: "在这里记录人物目标、秘密、关系网、行为准则和章节出场计划。",
      createdAt,
      updatedAt: createdAt,
    },
    {
      id: makeId("lore"),
      kind: "lore",
      title: "核心设定",
      subtitle: "世界观规则",
      group: "rule",
      status: "草稿",
      tags: ["规则", "冲突", "禁忌"],
      body: "把影响剧情选择的规则写清楚，后续可用于一致性检查。",
      createdAt,
      updatedAt: createdAt,
    },
  ];
}

function loadResources(projectId: string): ResourceRecord[] {
  try {
    const raw = localStorage.getItem(resourceKey(projectId));
    if (!raw) {
      const seed = sampleResources();
      localStorage.setItem(resourceKey(projectId), JSON.stringify(seed));
      return seed;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveResources(projectId: string, resources: ResourceRecord[]) {
  localStorage.setItem(resourceKey(projectId), JSON.stringify(resources));
}

function findNode(nodes: BinderNode[], id: string): BinderNode | null {
  for (const node of nodes) {
    if (node.id === id) return node;
    const child = findNode(node.children, id);
    if (child) return child;
  }
  return null;
}

function firstNode(nodes: BinderNode[]): BinderNode | null {
  if (nodes.length === 0) return null;
  return nodes[0];
}

function flattenNodes(root: BinderRoot) {
  const result: Array<{ node: BinderNode; depth: number; collection: BinderCollection }> = [];
  const walk = (nodes: BinderNode[], depth: number, collection: BinderCollection) => {
    nodes.forEach((node) => {
      result.push({ node, depth, collection });
      walk(node.children, depth + 1, collection);
    });
  };
  const collection = root.id.startsWith("outline") ? "outline" : "draft";
  walk(root.children, 0, collection);
  return result;
}

function countNodes(nodes: BinderNode[]): number {
  return nodes.reduce((total, node) => total + 1 + countNodes(node.children), 0);
}

function countWordsFromHtml(html: string) {
  const text = html
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .trim();
  return text.replace(/\s+/g, "").length;
}

function nodeKey(collection: BinderCollection, id: string) {
  return `${collection}:${id}`;
}

export default function App() {
  const [view, setView] = useState<View>("splash");
  const [workspaceTab, setWorkspaceTab] = useState<WorkspaceTab>("write");
  const [projects, setProjects] = useState<ProjectRecord[]>(() => loadRecentProjects());
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [currentProject, setCurrentProject] = useState<ProjectRecord | null>(null);
  const [binder, setBinder] = useState<BinderState>(EMPTY_BINDER);
  const [activeCollection, setActiveCollection] = useState<BinderCollection>("draft");
  const [activeNodeId, setActiveNodeId] = useState("");
  const [documentHtml, setDocumentHtml] = useState("");
  const [resources, setResources] = useState<ResourceRecord[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [modalMode, setModalMode] = useState<ModalMode>(null);
  const [modalProject, setModalProject] = useState<ProjectRecord | null>(null);
  const [nodeTarget, setNodeTarget] = useState<NodeTarget | null>(null);
  const [resourceDraft, setResourceDraft] = useState<ResourceRecord | null>(null);
  const [projectNameInput, setProjectNameInput] = useState("");
  const [pathInput, setPathInput] = useState("");
  const [nodeTitleInput, setNodeTitleInput] = useState("");
  const [nodeIconInput, setNodeIconInput] = useState("▦");
  const [linkUrlInput, setLinkUrlInput] = useState("");
  const [imageUrlInput, setImageUrlInput] = useState("");
  const [statusMessage, setStatusMessage] = useState("");
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [isBusy, setIsBusy] = useState(false);
  const [leftSidebarOpen, setLeftSidebarOpen] = useState(true);
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
  const hydratingEditorRef = useRef(false);
  const hydratedKeyRef = useRef("");
  const hydratedHtmlRef = useRef("");

  const selectedProject = useMemo(
    () => projects.find((project) => project.id === selectedProjectId) ?? null,
    [projects, selectedProjectId],
  );

  const activeRoot = binder[activeCollection];
  const activeNode = activeNodeId ? findNode(activeRoot.children, activeNodeId) : null;

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [1, 2, 3] } }),
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
            ? "记录结构、伏笔、人物弧线和章节目标……"
            : "开始写作。输入 / 可打开快捷命令。";
        },
      }),
    ],
    content: "",
    editorProps: {
      attributes: {
        class: "writer-editor rich-editor",
        spellcheck: "false",
      },
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
      if (hydratingEditorRef.current) return;
      const html = editor.getHTML();
      setSaveState("dirty");
      setEditorTick((value) => value + 1);
      scheduleSave(html);
    },
    onSelectionUpdate: () => setEditorTick((value) => value + 1),
  });

  useEffect(() => {
    const timer = window.setTimeout(() => setView("projects"), 1000);
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
    if (!currentProject) {
      setResources([]);
      return;
    }
    setResources(loadResources(currentProject.id));
  }, [currentProject?.id]);

  useEffect(() => {
    if (!currentProject) return;
    saveResources(currentProject.id, resources);
  }, [currentProject?.id, resources]);

  useEffect(() => {
    if (!editor) return;
    const key = `${activeCollection}:${activeNodeId}`;
    if (hydratedKeyRef.current === key && hydratedHtmlRef.current === documentHtml) return;
    hydratingEditorRef.current = true;
    editor.commands.setContent(documentHtml || "", false);
    hydratedKeyRef.current = key;
    hydratedHtmlRef.current = documentHtml;
    setEditorTick((value) => value + 1);
    window.setTimeout(() => {
      hydratingEditorRef.current = false;
    }, 0);
  }, [editor, activeCollection, activeNodeId, documentHtml]);

  useEffect(() => {
    return () => {
      if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current);
    };
  }, []);

  function updateProjects(next: ProjectRecord[] | ((prev: ProjectRecord[]) => ProjectRecord[])) {
    setProjects((prev) => {
      const nextProjects = typeof next === "function" ? next(prev) : next;
      saveRecentProjects(nextProjects);
      return nextProjects;
    });
  }

  function showStatus(message: string) {
    setStatusMessage(message);
    window.setTimeout(() => setStatusMessage(""), 4200);
  }

  function closeModal() {
    if (isBusy) return;
    setModalMode(null);
    setModalProject(null);
    setNodeTarget(null);
    setResourceDraft(null);
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
    setResourceDraft(null);
    setProjectNameInput("");
    setPathInput("");
    setNodeTitleInput("");
    setNodeIconInput("▦");
    setLinkUrlInput("");
    setImageUrlInput("");
  }

  async function safeWindowAction(action: "minimize" | "maximize" | "close") {
    try {
      const win = getCurrentWindow();
      if (action === "minimize") await win.minimize();
      if (action === "maximize") await win.toggleMaximize();
      if (action === "close") await win.close();
    } catch (error) {
      const message = String(error);
      if (message.includes("not allowed") || message.includes("allow-")) {
        showStatus("窗口权限未开启：请复制新版 src-tauri/capabilities/default.json 后重启 tauri:dev。所需权限是 core:window:allow-close / allow-minimize / allow-toggle-maximize。");
        return;
      }
      showStatus(`窗口操作失败：${message}`);
    }
  }

  async function returnToProjectSelection() {
    await saveActiveDocument(false);
    setView("projects");
    setCurrentProject(null);
    setWorkspaceTab("write");
    setSearchQuery("");
    setToolbarMoreOpen(false);
    setOpenBinderMenu("");
    setSlashMenuOpen(false);
    closeModalAfterBusy();
  }

  async function handleTitlebarClose() {
    if (view === "writer") {
      await returnToProjectSelection();
      return;
    }
    await safeWindowAction("close");
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
      updateProjects((prev) => [created, ...prev.filter((project) => project.id !== created.id)]);
      setSelectedProjectId(created.id);
      closeModalAfterBusy();
      showStatus(`项目已创建：${created.path}`);
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
      updateProjects((prev) => [imported, ...prev.filter((project) => project.id !== imported.id)]);
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
      updateProjects((prev) => [updatedProject, ...prev.filter((project) => project.id !== updatedProject.id)]);

      const firstDraft = firstNode(nextBinder.draft.children);
      setActiveCollection("draft");
      setWorkspaceTab("write");
      if (firstDraft) {
        setActiveNodeId(firstDraft.id);
        const html = await invoke<string>("read_binder_document", {
          path: updatedProject.path,
          documentId: firstDraft.id,
        });
        setDocumentHtml(html);
        setSaveState("saved");
      } else {
        setActiveNodeId("");
        setDocumentHtml("");
        setSaveState("idle");
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
      updateProjects((prev) => prev.map((item) => (item.id === modalProject.id ? nextProject : item)));
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
      updateProjects((prev) => [
        imported,
        ...prev.filter((item) => item.id !== imported.id && item.id !== modalProject.id),
      ]);
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
    updateProjects((prev) => prev.filter((item) => item.id !== project.id));
    if (selectedProjectId === project.id) setSelectedProjectId("");
    closeModalAfterBusy();
    showStatus(`已从最近项目列表移除：${project.name}`);
  }

  async function selectBinderCollection(collection: BinderCollection) {
    if (collection === activeCollection && !activeNodeId) return;
    await saveActiveDocument(false);
    setActiveCollection(collection);
    setWorkspaceTab(collection === "outline" ? "outline" : "write");
    setToolbarMoreOpen(false);
    setOpenBinderMenu("");
    const nextRoot = binder[collection];
    const selected = firstNode(nextRoot.children);
    if (!currentProject || !selected) {
      setActiveNodeId("");
      setDocumentHtml("");
      setSaveState("idle");
      return;
    }
    setActiveNodeId(selected.id);
    try {
      const html = await invoke<string>("read_binder_document", { path: currentProject.path, documentId: selected.id });
      setDocumentHtml(html);
      setSaveState("saved");
    } catch (error) {
      showStatus(`读取文稿失败：${String(error)}`);
    }
  }

  async function selectBinderNode(collection: BinderCollection, node: BinderNode) {
    if (collection === activeCollection && node.id === activeNodeId) return;
    await saveActiveDocument(false);
    setActiveCollection(collection);
    setActiveNodeId(node.id);
    setWorkspaceTab(collection === "outline" ? "outline" : "write");
    setToolbarMoreOpen(false);
    setOpenBinderMenu("");
    if (!currentProject) return;
    try {
      const html = await invoke<string>("read_binder_document", { path: currentProject.path, documentId: node.id });
      setDocumentHtml(html);
      setSaveState("saved");
    } catch (error) {
      showStatus(`读取文稿失败：${String(error)}`);
    }
  }

  function scheduleSave(html: string) {
    if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current);
    const project = currentProject;
    const documentId = activeNodeId;
    saveTimerRef.current = window.setTimeout(() => {
      void saveDocumentById(project, documentId, html, false);
    }, 900);
  }

  async function saveDocumentById(
    project: ProjectRecord | null,
    documentId: string,
    content: string,
    showSaved: boolean,
  ) {
    if (!project || !documentId) return;
    setSaveState("saving");
    try {
      const manifest = await invoke<ProjectManifest>("save_binder_document", {
        path: project.path,
        documentId,
        content,
      });
      const updatedProject = { ...project, updatedAt: manifest.updatedAt, exists: true };
      setCurrentProject((current) => (current?.id === updatedProject.id ? updatedProject : current));
      updateProjects((prev) => prev.map((item) => (item.id === updatedProject.id ? updatedProject : item)));
      setSaveState("saved");
      if (showSaved) showStatus("已保存。");
    } catch (error) {
      setSaveState("error");
      showStatus(`保存失败：${String(error)}`);
    }
  }

  async function saveActiveDocument(showSaved = true) {
    if (saveTimerRef.current) {
      window.clearTimeout(saveTimerRef.current);
      saveTimerRef.current = null;
    }
    const content = editor?.getHTML() ?? documentHtml;
    await saveDocumentById(currentProject, activeNodeId, content, showSaved);
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
    setNodeIconInput(root.icon || (collection === "outline" ? "◇" : "✍"));
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
          const html = await invoke<string>("read_binder_document", {
            path: currentProject.path,
            documentId: nextNode.id,
          });
          setDocumentHtml(html);
          setSaveState("saved");
        } else {
          setActiveNodeId("");
          setDocumentHtml("");
          setSaveState("idle");
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

  function setHeading(level: 1 | 2 | 3) {
    editor?.chain().focus().toggleHeading({ level }).run();
  }

  function setParagraph() {
    editor?.chain().focus().setParagraph().run();
  }

  function setTextAlign(alignment: "left" | "center" | "right") {
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
    if (!editor) return countWordsFromHtml(documentHtml);
    const storage = editor.storage as { characterCount?: { characters?: () => number } };
    return storage.characterCount?.characters?.() ?? editor.state.doc.textContent.length;
  }

  function toolbarItems(): ToolbarItem[] {
    return [
      { id: "paragraph", title: "正文", icon: "¶", group: "format", run: setParagraph, active: () => isEditorActive("paragraph") },
      { id: "h1", title: "一级标题", icon: "H1", group: "format", run: () => setHeading(1), active: () => isEditorActive("heading", { level: 1 }) },
      { id: "h2", title: "二级标题", icon: "H2", group: "format", run: () => setHeading(2), active: () => isEditorActive("heading", { level: 2 }) },
      { id: "h3", title: "三级标题", icon: "H3", group: "format", run: () => setHeading(3), active: () => isEditorActive("heading", { level: 3 }) },
      { id: "bold", title: "加粗", icon: "B", group: "format", run: () => editor?.chain().focus().toggleBold().run(), active: () => isEditorActive("bold") },
      { id: "italic", title: "斜体", icon: "I", group: "format", run: () => editor?.chain().focus().toggleItalic().run(), active: () => isEditorActive("italic") },
      { id: "underline", title: "下划线", icon: "U", group: "format", run: () => editor?.chain().focus().toggleUnderline().run(), active: () => isEditorActive("underline") },
      { id: "strike", title: "删除线", icon: "S", group: "format", run: () => editor?.chain().focus().toggleStrike().run(), active: () => isEditorActive("strike") },
      { id: "code", title: "行内代码", icon: "{}", group: "format", run: () => editor?.chain().focus().toggleCode().run(), active: () => isEditorActive("code") },
      { id: "quote", title: "引用", icon: "“”", group: "layout", run: () => editor?.chain().focus().toggleBlockquote().run(), active: () => isEditorActive("blockquote") },
      { id: "left", title: "左对齐", icon: "☰", group: "layout", run: () => setTextAlign("left"), active: () => isEditorActive("textAlign", { textAlign: "left" }) },
      { id: "center", title: "居中", icon: "≡", group: "layout", run: () => setTextAlign("center"), active: () => isEditorActive("textAlign", { textAlign: "center" }) },
      { id: "right", title: "右对齐", icon: "☷", group: "layout", run: () => setTextAlign("right"), active: () => isEditorActive("textAlign", { textAlign: "right" }) },
      { id: "bullet", title: "无序列表", icon: "•", group: "layout", run: () => editor?.chain().focus().toggleBulletList().run(), active: () => isEditorActive("bulletList") },
      { id: "ordered", title: "有序列表", icon: "1.", group: "layout", run: () => editor?.chain().focus().toggleOrderedList().run(), active: () => isEditorActive("orderedList") },
      { id: "task", title: "任务清单", icon: "☑", group: "layout", run: () => editor?.chain().focus().toggleTaskList().run(), active: () => isEditorActive("taskList") },
      { id: "rule", title: "分隔线", icon: "—", group: "insert", run: () => editor?.chain().focus().setHorizontalRule().run() },
      { id: "link", title: "链接", icon: "⌁", group: "insert", run: openLinkModal, active: () => isEditorActive("link") },
      { id: "image", title: "图片", icon: "▧", group: "insert", run: openImageModal },
      { id: "table", title: "插入表格", icon: "▦", group: "insert", run: () => editor?.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run() },
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
        className={`tool-button ${isActive ? "active" : ""} ${compact ? "wide" : ""}`}
        onMouseDown={(event) => event.preventDefault()}
        onClick={() => {
          item.run?.();
          if (compact) setToolbarMoreOpen(false);
        }}
        disabled={isDisabled}
        title={item.title}
        aria-label={item.title}
      >
        <span>{item.icon}</span>
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
        <label key={item.id} className={`toolbar-select ${compact ? "wide" : ""}`} title="字号">
          <span>字号</span>
          <select value={currentFontSize} onMouseDown={(event) => event.stopPropagation()} onChange={(event) => applyFontSize(event.currentTarget.value)}>
            {FONT_SIZE_OPTIONS.map((size) => (
              <option key={size} value={size}>{size}</option>
            ))}
          </select>
        </label>
      );
    }
    if (item.control === "lineHeight") {
      return (
        <label key={item.id} className={`toolbar-select ${compact ? "wide" : ""}`} title="行高">
          <span>行高</span>
          <select value={currentLineHeight} onMouseDown={(event) => event.stopPropagation()} onChange={(event) => applyLineHeight(event.currentTarget.value)}>
            {LINE_HEIGHT_OPTIONS.map((lineHeight) => (
              <option key={lineHeight} value={lineHeight}>{lineHeight}</option>
            ))}
          </select>
        </label>
      );
    }
    if (item.control === "color") {
      return (
        <div key={item.id} className={`swatch-row ${compact ? "wide" : ""}`} title="文字颜色">
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
      <div key={item.id} className={`swatch-row ${compact ? "wide" : ""}`} title="高亮">
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
    return (
      <div className="editor-toolbar">
        <div className="toolbar-left">
          <button className="ghost-button" onClick={() => setLeftSidebarOpen((value) => !value)} title="显示/隐藏侧边栏"><LineIcon name="menu" size={18} /></button>
          <div className="breadcrumb">
            <span>{currentProject?.name ?? "未命名项目"}</span>
            <span>›</span>
            <span>{activeRoot.title}</span>
            {activeNode ? <><span>›</span><strong>{activeNode.title}</strong></> : null}
          </div>
        </div>
        <div className="toolbar-center">
          {visibleItems.map((item) => renderToolbarButton(item))}
          <button className="tool-button" onMouseDown={(event) => event.preventDefault()} onClick={() => setToolbarMoreOpen((value) => !value)} title="更多编辑按钮">…</button>
        </div>
        <div className="toolbar-right">
          <span className={`save-pill ${saveState}`}>{saveLabel()}</span>
          <button className="primary-button slim" onClick={() => void saveActiveDocument(true)} title="保存"><LineIcon name="save" size={15} /> 保存</button>
        </div>
        {toolbarMoreOpen ? (
          <div className="toolbar-popover">
            <div className="popover-head">
              <strong>编辑按钮</strong>
              <button className="text-button" onClick={() => setModalMode("preferences")}>首选项</button>
            </div>
            <div className="toolbar-popover-grid">
              {overflowItems.length === 0 ? <p className="muted">所有按钮已显示在主工具栏。</p> : null}
              {overflowItems.map((item) => renderToolbarButton(item, true))}
            </div>
          </div>
        ) : null}
      </div>
    );
  }

  function saveLabel() {
    if (saveState === "dirty") return "未保存";
    if (saveState === "saving") return "保存中";
    if (saveState === "saved") return "已保存";
    if (saveState === "error") return "保存失败";
    return "就绪";
  }

  function renderBinderRoot(collection: BinderCollection) {
    const root = binder[collection];
    const rootKey = nodeKey(collection, root.id);
    const expandedRoot = isExpanded(collection, root.id);
    const active = activeCollection === collection;
    return (
      <div className="binder-root" key={collection}>
        <div className={`binder-row root ${active ? "active" : ""}`}>
          <button className="tree-toggle" onClick={() => toggleExpanded(collection, root.id)}>{expandedRoot ? "⌄" : "›"}</button>
          <button className="node-icon" onClick={() => openEditRootModal(collection)} title="修改根目录图标"><LineIcon name={collection === "draft" ? "folder" : "outline"} size={15} /></button>
          <button className="node-title" onClick={() => void selectBinderCollection(collection)}>{root.title}</button>
          <button className="mini-button" onClick={() => openCreateNodeModal(collection, root.id)} title="添加文稿">＋</button>
          <button className="mini-button" onClick={() => setOpenBinderMenu(openBinderMenu === rootKey ? "" : rootKey)} title="更多">…</button>
          {openBinderMenu === rootKey ? (
            <div className="node-menu">
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
      <div key={node.id} className="binder-node">
        <div className={`binder-row ${active ? "active" : ""}`} style={{ paddingLeft: depth * 14 + 10 }}>
          <button className="tree-toggle" onClick={() => hasChildren && toggleExpanded(collection, node.id)}>{hasChildren ? (expandedNode ? "⌄" : "›") : ""}</button>
          <button className="node-icon" onClick={(event) => { event.stopPropagation(); openEditNodeModal(collection, node); }} title="修改图标"><LineIcon name={hasChildren ? "folder" : "file"} size={15} /></button>
          <button className="node-title" onClick={() => void selectBinderNode(collection, node)}>{node.title}</button>
          <button className="mini-button" onClick={(event) => { event.stopPropagation(); openCreateNodeModal(collection, node.id); }} title="添加子文稿">＋</button>
          <button className="mini-button" onClick={(event) => { event.stopPropagation(); setOpenBinderMenu(openBinderMenu === key ? "" : key); }} title="更多">…</button>
          {openBinderMenu === key ? (
            <div className="node-menu">
              <button onClick={() => openCreateNodeModal(collection, node.id)}>添加子文稿</button>
              <button onClick={() => openEditNodeModal(collection, node)}>重命名 / 图标</button>
              <button className="danger" onClick={() => void deleteBinderNode(collection, node)}>删除文稿</button>
            </div>
          ) : null}
        </div>
        {hasChildren && expandedNode ? <div>{node.children.map((child) => renderBinderNode(collection, child, depth + 1))}</div> : null}
      </div>
    );
  }

  function createFromSidebar() {
    if (workspaceTab === "write") {
      openCreateNodeModal(activeCollection, activeRoot.id);
      return;
    }
    if (workspaceTab === "outline") {
      openCreateNodeModal("outline", binder.outline.id);
      return;
    }
    openCreateResourceModal(workspaceTab as ResourceKind);
  }

  function contextTitle() {
    if (workspaceTab === "write") return "目录";
    return WORKSPACE_TABS.find((tab) => tab.id === workspaceTab)?.label ?? "目录";
  }

  function contextHint() {
    if (workspaceTab === "write") return currentProject?.name ?? "章节正文";
    return WORKSPACE_TABS.find((tab) => tab.id === workspaceTab)?.hint ?? "写作中心";
  }

  function renderSidebar() {
    if (!leftSidebarOpen) return null;
    return (
      <aside className="sidebar-shell">
        <div className="navigation-rail">
          <button className="rail-logo" onClick={() => setWorkspaceTab("write")} title="MasterPieces" aria-label="MasterPieces">
            <span>M</span>
            <span className="rail-tooltip">MasterPieces</span>
          </button>
          <nav className="rail-nav" aria-label="功能导航">
            {WORKSPACE_TABS.map((tab) => (
              <button
                key={tab.id}
                className={`rail-button ${workspaceTab === tab.id ? "active" : ""}`}
                onClick={() => setWorkspaceTab(tab.id)}
                title={`${tab.label} · ${tab.hint}`}
                aria-label={tab.label}
              >
                <LineIcon name={TAB_ICON[tab.id]} />
                <span className="rail-tooltip">{tab.label}</span>
              </button>
            ))}
          </nav>
          <div className="rail-footer">
            <button className="rail-button" onClick={() => setModalMode("preferences")} title="首选项" aria-label="首选项">
              <LineIcon name="settings" />
              <span className="rail-tooltip">首选项</span>
            </button>
            <button className="rail-button" onClick={() => void returnToProjectSelection()} title="返回项目" aria-label="返回项目">
              <LineIcon name="back" />
              <span className="rail-tooltip">返回项目</span>
            </button>
          </div>
        </div>

        <section className="context-sidebar">
          <div className="context-head">
            <div>
              <strong>{contextTitle()}</strong>
              <small>{contextHint()}</small>
            </div>
            <button className="context-add" onClick={createFromSidebar} title="新建" aria-label="新建">
              <LineIcon name="plus" size={17} />
            </button>
          </div>
          <div className="sidebar-search">
            <LineIcon name="search" size={16} />
            <input value={searchQuery} onChange={(event) => setSearchQuery(event.currentTarget.value)} placeholder="搜索章节、人物、设定…" />
          </div>
          <div className="binder-section">
            <div className="section-title">写作中心</div>
            {renderBinderRoot("draft")}
            {renderBinderRoot("outline")}
          </div>
        </section>
      </aside>
    );
  }

  function renderTitlebar() {
    return (
      <header className="titlebar" data-tauri-drag-region>
        <div className="titlebar-left" data-tauri-drag-region>
          <span className="titlebar-logo" data-tauri-drag-region>M</span>
          <span className="titlebar-name" data-tauri-drag-region>
            <strong>MasterPieces</strong>
            <small>{currentProject?.name ? `正在编辑 · ${currentProject.name}` : "本地写作工作台"}</small>
          </span>
        </div>
        <div className="titlebar-actions">
          <button onClick={() => void safeWindowAction("minimize")} aria-label="最小化" title="最小化"><LineIcon name="minimize" size={15} /></button>
          <button onClick={() => void safeWindowAction("maximize")} aria-label="最大化或还原" title="最大化 / 还原"><LineIcon name="maximize" size={14} /></button>
          <button className="close" onClick={() => void handleTitlebarClose()} aria-label={view === "writer" ? "返回项目选择" : "关闭窗口"} title={view === "writer" ? "返回项目选择" : "关闭窗口"}><LineIcon name="close" size={15} /></button>
        </div>
      </header>
    );
  }

  function renderEditorView() {
    return (
      <main className="writer-main">
        {renderEditorToolbar()}
        <section className="editor-shell">
          {activeNode ? (
            <div className="editor-paper">
              <div className="doc-meta">
                <span><LineIcon name={activeCollection === "draft" ? "folder" : "outline"} size={15} /></span>
                <span>{activeRoot.title}</span>
                <span>/{activeNode.title}</span>
              </div>
              {editor && activeNode ? (
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
            <div className="empty-state big">
              <div className="empty-icon"><LineIcon name={activeCollection === "draft" ? "write" : "outline"} size={36} strokeWidth={1.45} /></div>
              <h2>{activeRoot.title}</h2>
              <p>{activeCollection === "draft" ? "这里是草稿根目录，可以无限添加子文稿。" : "这里是大纲模块，可以记录结构、伏笔、章节目标。"}</p>
              <button className="primary-button" onClick={() => openCreateNodeModal(activeCollection, activeRoot.id)}>添加文稿</button>
            </div>
          )}
        </section>
        <footer className="statusbar">
          <span>字数：{characterCount().toLocaleString("zh-CN")}</span>
          <span>阅读：{Math.max(1, Math.ceil(characterCount() / 400))} 分钟</span>
          <span>{activeCollection === "outline" ? "大纲模式" : "写作模式"}</span>
          <span>Markdown / 富文本</span>
        </footer>
      </main>
    );
  }

  function renderOutlineBoard() {
    const draftNodes = flattenNodes(binder.draft);
    const outlineNodes = flattenNodes(binder.outline);
    const groups: Array<{ title: string; icon: string; collection: BinderCollection; nodes: typeof draftNodes }> = [
      { title: "草稿章节", icon: binder.draft.icon, collection: "draft", nodes: draftNodes },
      { title: "全局大纲", icon: binder.outline.icon, collection: "outline", nodes: outlineNodes },
    ];
    return (
      <main className="board-main">
        <div className="board-header">
          <div>
            <h1>作品结构看板</h1>
            <p>真实读取项目 Binder；点击卡片可直接打开对应文稿。</p>
          </div>
          <div className="header-actions">
            <button className="soft-button" onClick={() => openCreateNodeModal("outline", binder.outline.id)}>新建大纲</button>
            <button className="primary-button" onClick={() => openCreateNodeModal("draft", binder.draft.id)}>新建章节</button>
          </div>
        </div>
        <div className="kanban">
          {groups.map((group) => (
            <section key={group.collection} className="kanban-column">
              <div className="column-head">
                <strong>{group.icon} {group.title}</strong>
                <span>{group.nodes.length}</span>
              </div>
              <div className="kanban-cards">
                {group.nodes.map(({ node, depth, collection }) => (
                  <button key={`${collection}-${node.id}`} className="chapter-card" onClick={() => void selectBinderNode(collection, node)}>
                    <span className="card-icon"><LineIcon name={node.children.length > 0 ? "folder" : "file"} size={18} /></span>
                    <strong>{node.title}</strong>
                    <small>{"—".repeat(depth)} {formatTime(node.updatedAt)}</small>
                  </button>
                ))}
                {group.nodes.length === 0 ? <p className="muted">暂无内容。</p> : null}
              </div>
            </section>
          ))}
        </div>
      </main>
    );
  }

  function openCreateResourceModal(kind: ResourceKind) {
    const createdAt = nowIso();
    setResourceDraft({
      id: makeId(kind),
      kind,
      title: "",
      subtitle: "",
      group: "default",
      status: "草稿",
      tags: [],
      body: "",
      createdAt,
      updatedAt: createdAt,
    });
    setModalMode("createResource");
  }

  function openEditResourceModal(resource: ResourceRecord) {
    setResourceDraft({ ...resource });
    setModalMode("editResource");
  }

  function saveResourceDraft() {
    if (!resourceDraft) return;
    const title = resourceDraft.title.trim();
    if (!title) return showStatus("请输入标题。");
    const next = { ...resourceDraft, title, updatedAt: nowIso() };
    setResources((items) => {
      const exists = items.some((item) => item.id === next.id);
      return exists ? items.map((item) => (item.id === next.id ? next : item)) : [next, ...items];
    });
    closeModalAfterBusy();
    showStatus("资料卡已保存。");
  }

  function deleteResource(resource: ResourceRecord) {
    const accepted = window.confirm(`确定删除「${resource.title}」吗？`);
    if (!accepted) return;
    setResources((items) => items.filter((item) => item.id !== resource.id));
    showStatus("资料卡已删除。");
  }

  function filteredResources(kind: ResourceKind) {
    const query = searchQuery.trim().toLowerCase();
    return resources.filter((item) => {
      if (item.kind !== kind) return false;
      if (!query) return true;
      return [item.title, item.subtitle, item.group, item.status, item.body, item.tags.join(" ")]
        .join(" ")
        .toLowerCase()
        .includes(query);
    });
  }

  function renderResourceView(kind: ResourceKind) {
    const meta = RESOURCE_LABELS[kind];
    const items = filteredResources(kind);
    return (
      <main className="resource-main">
        <div className="board-header">
          <div>
            <h1>{meta.title}</h1>
            <p>本地保存到当前项目的资料库；后续可接 SQLite 表和全文搜索。</p>
          </div>
          <button className="primary-button" onClick={() => openCreateResourceModal(kind)}>＋ {meta.cta}</button>
        </div>
        {items.length === 0 ? (
          <div className="empty-state big">
            <div className="empty-icon"><LineIcon name={TAB_ICON[kind]} size={36} strokeWidth={1.45} /></div>
            <h2>{meta.empty}</h2>
            <button className="primary-button" onClick={() => openCreateResourceModal(kind)}>{meta.cta}</button>
          </div>
        ) : (
          <div className="resource-grid">
            {items.map((item) => (
              <article key={item.id} className="resource-card">
                <div className="resource-cover">
                  <span>{item.title.slice(0, 1) || "M"}</span>
                  <button onClick={() => openEditResourceModal(item)}>编辑</button>
                </div>
                <div className="resource-body">
                  <div className="resource-title-row">
                    <h3>{item.title}</h3>
                    <span>{item.status}</span>
                  </div>
                  <p className="subtitle">{item.subtitle || item.group}</p>
                  <p>{item.body}</p>
                  <div className="tag-row">{item.tags.map((tag) => <span key={tag}>#{tag}</span>)}</div>
                  <div className="card-actions">
                    <button onClick={() => openEditResourceModal(item)}>编辑</button>
                    <button className="danger-text" onClick={() => deleteResource(item)}>删除</button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </main>
    );
  }

  function renderWriter() {
    return (
      <div className="app-frame writer-frame">
        {renderTitlebar()}
        <div className="workspace-shell">
          {renderSidebar()}
          {workspaceTab === "write" ? renderEditorView() : null}
          {workspaceTab === "outline" ? renderOutlineBoard() : null}
          {workspaceTab === "characters" ? renderResourceView("characters") : null}
          {workspaceTab === "lore" ? renderResourceView("lore") : null}
          {workspaceTab === "timeline" ? renderResourceView("timeline") : null}
          {workspaceTab === "ideas" ? renderResourceView("ideas") : null}
        </div>
        {statusMessage ? <div className="toast">{statusMessage}</div> : null}
        {renderModal()}
      </div>
    );
  }

  function renderProjectsScreen() {
    return (
      <div className="app-frame project-frame">
        {renderTitlebar()}
        <main className="project-screen">
          <section className="hero-panel">
            <div className="hero-mark">M</div>
            <p>MASTERPIECES</p>
            <h1>长篇叙事工程系统</h1>
            <span>本地优先 · 富文本编辑 · 工程化写作</span>
          </section>
          <section className="project-panel">
            <div className="project-head">
              <div>
                <h2>选择项目</h2>
                <p>打开最近的本地项目，或创建一个新的 .masterpiece 工程。</p>
              </div>
              <div className="header-actions">
                <button className="soft-button" onClick={openImportProjectModal}>打开已有</button>
                <button className="primary-button" onClick={openCreateProjectModal}>＋ 新建项目</button>
              </div>
            </div>
            <div className="project-list">
              {projects.length === 0 ? (
                <div className="empty-state">
                  <h3>还没有最近项目</h3>
                  <p>点击右上角“新建项目”开始。</p>
                </div>
              ) : null}
              {projects.map((project, index) => (
                <button
                  key={project.id}
                  className={`project-row ${selectedProjectId === project.id ? "selected" : ""} ${project.exists === false ? "missing" : ""}`}
                  onClick={() => setSelectedProjectId(project.id)}
                  onDoubleClick={() => void openProject()}
                >
                  <span className="project-index">{index + 1}</span>
                  <span className="project-name">
                    <strong>{project.name}</strong>
                    <small>{project.exists === false ? "文件未找到 · " : ""}{project.path}</small>
                  </span>
                  <span>{formatTime(project.updatedAt)}</span>
                  <span>{formatTime(project.createdAt)}</span>
                  <span className="project-more" onClick={(event) => { event.stopPropagation(); openProjectActionsModal(project); }}>…</span>
                </button>
              ))}
            </div>
            <div className="project-footer">
              <button className="primary-button" disabled={!selectedProject || isBusy} onClick={() => void openProject()}>进入项目</button>
            </div>
          </section>
        </main>
        {statusMessage ? <div className="toast">{statusMessage}</div> : null}
        {renderModal()}
      </div>
    );
  }

  function renderResourceModal() {
    if (!resourceDraft) return null;
    const meta = RESOURCE_LABELS[resourceDraft.kind];
    return (
      <>
        <div className="modal-head">
          <h2>{modalMode === "createResource" ? meta.cta : "编辑资料卡"}</h2>
          <button onClick={closeModal}>×</button>
        </div>
        <label className="field-label">标题</label>
        <input className="input" value={resourceDraft.title} onChange={(event) => setResourceDraft({ ...resourceDraft, title: event.currentTarget.value })} placeholder="标题" autoFocus />
        <label className="field-label">副标题 / 身份</label>
        <input className="input" value={resourceDraft.subtitle} onChange={(event) => setResourceDraft({ ...resourceDraft, subtitle: event.currentTarget.value })} placeholder="例如：男主角、北境、上古法器" />
        <div className="form-grid two">
          <div>
            <label className="field-label">分组</label>
            <input className="input" value={resourceDraft.group} onChange={(event) => setResourceDraft({ ...resourceDraft, group: event.currentTarget.value })} />
          </div>
          <div>
            <label className="field-label">状态</label>
            <input className="input" value={resourceDraft.status} onChange={(event) => setResourceDraft({ ...resourceDraft, status: event.currentTarget.value })} />
          </div>
        </div>
        <label className="field-label">标签，逗号分隔</label>
        <input className="input" value={resourceDraft.tags.join("，")} onChange={(event) => setResourceDraft({ ...resourceDraft, tags: event.currentTarget.value.split(/[，,]/).map((tag) => tag.trim()).filter(Boolean) })} placeholder="智谋，伏笔，待补充" />
        <label className="field-label">正文</label>
        <textarea className="textarea" value={resourceDraft.body} onChange={(event) => setResourceDraft({ ...resourceDraft, body: event.currentTarget.value })} placeholder={meta.placeholder} />
        <div className="modal-actions">
          <button className="soft-button" onClick={closeModal}>取消</button>
          <button className="primary-button" onClick={saveResourceDraft}>保存</button>
        </div>
      </>
    );
  }

  function renderModal() {
    if (!modalMode) return null;
    const allToolbarItems = toolbarItems();
    return (
      <div className="modal-backdrop" onClick={closeModal}>
        <div className="modal" onClick={(event) => event.stopPropagation()}>
          {modalMode === "createProject" ? (
            <>
              <div className="modal-head"><h2>创建项目</h2><button onClick={closeModal}>×</button></div>
              <label className="field-label">项目名称</label>
              <input className="input" value={projectNameInput} onChange={(event) => setProjectNameInput(event.currentTarget.value)} placeholder="我的小说" autoFocus />
              <label className="field-label">存档文件夹</label>
              <div className="input-row"><input className="input" value={pathInput} onChange={(event) => setPathInput(event.currentTarget.value)} placeholder="/Users/you/Documents" /><button className="soft-button" onClick={() => void chooseFolderForInput("create")}>选择…</button></div>
              <div className="modal-actions"><button className="soft-button" onClick={closeModal}>取消</button><button className="primary-button" onClick={() => void createProject()} disabled={isBusy}>创建</button></div>
            </>
          ) : null}

          {modalMode === "importProject" ? (
            <>
              <div className="modal-head"><h2>打开已有项目</h2><button onClick={closeModal}>×</button></div>
              <label className="field-label">项目文件夹</label>
              <div className="input-row"><input className="input" value={pathInput} onChange={(event) => setPathInput(event.currentTarget.value)} placeholder="选择 .masterpiece 文件夹" autoFocus /><button className="soft-button" onClick={() => void chooseFolderForInput("project")}>选择…</button></div>
              <div className="modal-actions"><button className="soft-button" onClick={closeModal}>取消</button><button className="primary-button" onClick={() => void importExistingProject()} disabled={isBusy}>打开</button></div>
            </>
          ) : null}

          {modalMode === "renameProject" ? (
            <>
              <div className="modal-head"><h2>重命名项目</h2><button onClick={closeModal}>×</button></div>
              <label className="field-label">项目名称</label>
              <input className="input" value={projectNameInput} onChange={(event) => setProjectNameInput(event.currentTarget.value)} autoFocus />
              <div className="modal-actions"><button className="soft-button" onClick={closeModal}>取消</button><button className="primary-button" onClick={() => void renameProject()} disabled={isBusy}>保存</button></div>
            </>
          ) : null}

          {modalMode === "relocateProject" ? (
            <>
              <div className="modal-head"><h2>重新定位项目</h2><button onClick={closeModal}>×</button></div>
              <label className="field-label">项目文件夹</label>
              <div className="input-row"><input className="input" value={pathInput} onChange={(event) => setPathInput(event.currentTarget.value)} autoFocus /><button className="soft-button" onClick={() => void chooseFolderForInput("project")}>选择…</button></div>
              <div className="modal-actions"><button className="soft-button" onClick={closeModal}>取消</button><button className="primary-button" onClick={() => void relocateProject()} disabled={isBusy}>保存</button></div>
            </>
          ) : null}

          {modalMode === "projectActions" && modalProject ? (
            <>
              <div className="modal-head"><h2>{modalProject.name}</h2><button onClick={closeModal}>×</button></div>
              <p className="path-text">{modalProject.path}</p>
              <div className="stack-actions">
                <button onClick={() => openRenameProjectModal(modalProject)}>重命名项目</button>
                <button onClick={() => openRelocateProjectModal(modalProject)}>重新定位</button>
                <button className="danger" onClick={() => removeFromRecent(modalProject)}>从最近列表移除</button>
              </div>
            </>
          ) : null}

          {modalMode === "createNode" ? (
            <>
              <div className="modal-head"><h2>添加文稿</h2><button onClick={closeModal}>×</button></div>
              <label className="field-label">标题</label>
              <input className="input" value={nodeTitleInput} onChange={(event) => setNodeTitleInput(event.currentTarget.value)} autoFocus />
              <label className="field-label">标题图标</label>
              <input className="input" value={nodeIconInput} onChange={(event) => setNodeIconInput(event.currentTarget.value)} placeholder="可输入 emoji、单字或符号" />
              <p className="muted">文稿可以继续添加子文稿，层级数量不限制。</p>
              <div className="modal-actions"><button className="soft-button" onClick={closeModal}>取消</button><button className="primary-button" onClick={() => void createBinderNode()} disabled={isBusy}>添加</button></div>
            </>
          ) : null}

          {modalMode === "editNode" ? (
            <>
              <div className="modal-head"><h2>标题与图标</h2><button onClick={closeModal}>×</button></div>
              <label className="field-label">标题</label>
              <input className="input" value={nodeTitleInput} onChange={(event) => setNodeTitleInput(event.currentTarget.value)} autoFocus />
              <label className="field-label">标题图标</label>
              <input className="input" value={nodeIconInput} onChange={(event) => setNodeIconInput(event.currentTarget.value)} placeholder="例如 ✍、◇、人物" />
              <div className="modal-actions"><button className="soft-button" onClick={closeModal}>取消</button><button className="primary-button" onClick={() => void saveBinderItemEdit()} disabled={isBusy}>保存</button></div>
            </>
          ) : null}

          {modalMode === "insertLink" ? (
            <>
              <div className="modal-head"><h2>插入链接</h2><button onClick={closeModal}>×</button></div>
              <label className="field-label">地址</label>
              <input className="input" value={linkUrlInput} onChange={(event) => setLinkUrlInput(event.currentTarget.value)} placeholder="https://" autoFocus />
              <div className="modal-actions"><button className="soft-button" onClick={closeModal}>取消</button><button className="primary-button" onClick={applyLink}>应用</button></div>
            </>
          ) : null}

          {modalMode === "insertImage" ? (
            <>
              <div className="modal-head"><h2>插入图片</h2><button onClick={closeModal}>×</button></div>
              <label className="field-label">图片地址</label>
              <input className="input" value={imageUrlInput} onChange={(event) => setImageUrlInput(event.currentTarget.value)} placeholder="https:// 或 base64" autoFocus />
              <div className="modal-actions"><button className="soft-button" onClick={closeModal}>取消</button><button className="primary-button" onClick={applyImage}>插入</button></div>
            </>
          ) : null}

          {modalMode === "preferences" ? (
            <>
              <div className="modal-head"><h2>首选项</h2><button onClick={closeModal}>×</button></div>
              <p className="muted">选择哪些编辑按钮显示在主工具栏；未勾选的按钮会进入“…”菜单。</p>
              <div className="check-grid">
                {allToolbarItems.map((item) => (
                  <label key={item.id}>
                    <input type="checkbox" checked={visibleToolbarIds.includes(item.id)} onChange={() => toggleToolbarPreference(item.id)} />
                    <span>{item.icon}</span>
                    <strong>{item.title}</strong>
                  </label>
                ))}
              </div>
              <div className="modal-actions"><button className="soft-button" onClick={() => setVisibleToolbarIds(DEFAULT_VISIBLE_TOOLBAR_IDS)}>恢复默认</button><button className="primary-button" onClick={closeModal}>完成</button></div>
            </>
          ) : null}

          {modalMode === "createResource" || modalMode === "editResource" ? renderResourceModal() : null}
        </div>
      </div>
    );
  }

  if (view === "splash") {
    return (
      <div className="splash-screen">
        <div className="splash-card">
          <div className="hero-mark">M</div>
          <h1>MasterPieces</h1>
          <p>长篇叙事工程系统</p>
        </div>
      </div>
    );
  }

  if (view === "projects") return renderProjectsScreen();
  return renderWriter();
}

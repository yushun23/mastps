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
import { BINDER_ICON_GROUPS } from "./icons/binderIcons";
import "./index.css";


type IconName =
  | "write"
  | "outline"
  | "structure"
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
  | "trash"
  | "save"
  | "immersive"
  | "exitImmersive"
  | "expand"
  | "minimize"
  | "maximize"
  | "close"
  | "home"
  | "sparkle";

const TAB_ICON: Record<WorkspaceTab, IconName> = {
  write: "write",
  outline: "outline",
  structure: "structure",
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
    structure: <><rect {...common} x="4" y="4" width="6.5" height="6" rx="1.2" /><rect {...common} x="13.5" y="4" width="6.5" height="6" rx="1.2" /><rect {...common} x="4" y="14" width="6.5" height="6" rx="1.2" /><path {...common} d="M13.5 15.5h6.5" /><path {...common} d="M13.5 19.5h4" /></>,
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
    trash: <><path {...common} d="M5 7h14" /><path {...common} d="M10 11v6" /><path {...common} d="M14 11v6" /><path {...common} d="M7 7l1 13h8l1-13" /><path {...common} d="M9 7V4.5h6V7" /></>,
    save: <><path {...common} d="M5 4h12l2 2v14H5V4z" /><path {...common} d="M8 4v6h8V4" /><path {...common} d="M8 20v-6h8v6" /></>,
    immersive: <><path {...common} d="M8 4H5.5A1.5 1.5 0 0 0 4 5.5V8" /><path {...common} d="M16 4h2.5A1.5 1.5 0 0 1 20 5.5V8" /><path {...common} d="M8 20H5.5A1.5 1.5 0 0 1 4 18.5V16" /><path {...common} d="M16 20h2.5a1.5 1.5 0 0 0 1.5-1.5V16" /><path {...common} d="M9 12h6" /><path {...common} d="M12 9v6" /></>,
    exitImmersive: <><path {...common} d="M9 4v5H4" /><path {...common} d="M4 9l5-5" /><path {...common} d="M15 4v5h5" /><path {...common} d="M20 9l-5-5" /><path {...common} d="M9 20v-5H4" /><path {...common} d="M4 15l5 5" /><path {...common} d="M15 20v-5h5" /><path {...common} d="M20 15l-5 5" /></>,
    expand: <><path {...common} d="M8 4H4v4" /><path {...common} d="M4 4l6 6" /><path {...common} d="M16 20h4v-4" /><path {...common} d="M20 20l-6-6" /></>,
    minimize: <><path {...common} d="M6 12h12" /></>,
    maximize: <><rect {...common} x="6" y="6" width="12" height="12" rx="1.5" /></>,
    close: <><path {...common} d="M7 7l10 10" /><path {...common} d="M17 7L7 17" /></>,
    home: <><path {...common} d="M4 11l8-7 8 7" /><path {...common} d="M6.5 10v9h11v-9" /><path {...common} d="M10 19v-5h4v5" /></>,
    sparkle: <><path {...common} d="M12 3l1.5 5.5L19 10l-5.5 1.5L12 17l-1.5-5.5L5 10l5.5-1.5L12 3z" /><path {...common} d="M19 15l.7 2.3L22 18l-2.3.7L19 21l-.7-2.3L16 18l2.3-.7L19 15z" /></>,
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
type TrashCollection = BinderCollection | "structure";

type BinderTrashDocument = {
  id: string;
  title: string;
  html: string;
};

type BinderTrashItem = {
  id: string;
  collection: BinderCollection;
  node: BinderNode;
  documents: BinderTrashDocument[];
  deletedAt: string;
};

type BinderTrashMoveResult = {
  binder: BinderState;
  trashItem: BinderTrashItem;
};

type View = "splash" | "projects" | "writer";
type WorkspaceTab = "write" | "outline" | "structure" | "characters" | "lore" | "timeline" | "ideas";
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
  | "createOutlineScene"
  | "editOutlineScene"
  | "createStructureChapter"
  | "editStructureChapter"
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

type OutlineSceneStatus = "todo" | "draft" | "revising" | "done";
type StructureDetailTab = "content" | "description" | "characters" | "locations" | "items" | "goals" | "notes";

type StructureChapterRecord = {
  id: string;
  title: string;
  parentId: string;
  order: number;
  notes: string;
  targetWords: number;
  collapsed: boolean;
  createdAt: string;
  updatedAt: string;
};

type StructureChapterTrashItem = {
  id: string;
  title: string;
  rootChapterId: string;
  chapters: StructureChapterRecord[];
  scenes: OutlineSceneRecord[];
  deletedAt: string;
};

type StructureChapterDraft = Pick<StructureChapterRecord, "id" | "title" | "parentId" | "notes" | "targetWords">;

type StructureChapterSummary = StructureChapterRecord & {
  depth: number;
  sceneCount: number;
  words: number;
  hasChildren: boolean;
  isPseudo?: boolean;
};

type AIProviderId = "siliconflow" | "openrouter" | "custom";
type AIServiceKind = "reasoning" | "image";

type AIServiceConfig = {
  provider: AIProviderId;
  apiKey: string;
  baseUrl: string;
  endpoint: string;
  model: string;
  temperature: number;
  maxTokens: number;
  extraHeaders: string;
  imageSize: string;
};

type AISettings = {
  reasoning: AIServiceConfig;
  image: AIServiceConfig;
};

type AIOutlineStructureScene = Partial<OutlineSceneRecord> & {
  characters?: string[] | string;
  items?: string[] | string;
  tags?: string[] | string;
};

type AIOutlineStructureChapter = {
  title?: string;
  summary?: string;
  targetWords?: number;
  scenes?: AIOutlineStructureScene[];
  children?: AIOutlineStructureChapter[];
};

type AIOutlineStructureResponse = {
  chapters?: AIOutlineStructureChapter[];
};

type OutlineSceneRecord = {
  id: string;
  title: string;
  chapterId?: string;
  chapter: string;
  sceneNo: string;
  status: OutlineSceneStatus;
  pov: string;
  location: string;
  timeline: string;
  characters: string[];
  items: string[];
  tags: string[];
  goal: string;
  conflict: string;
  outcome: string;
  summary: string;
  notes: string;
  targetWords: number;
  currentWords: number;
  createdAt: string;
  updatedAt: string;
};

type TextStatus = {
  id: string;
  label: string;
  color: string;
};

type AppThemeId = "warm-day" | "dark-orange";
type GeneralPreferencesSection = "typography" | "theme";

type ToolbarItemId =
  | "fontFamily"
  | "firstLineIndent"
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
  control?: "fontFamily" | "fontSize" | "lineHeight" | "color" | "highlight";
};

const RECENT_PROJECTS_KEY = "masterpieces.recentProjects.v1";
const TOOLBAR_PREFS_KEY = "masterpieces.toolbar.visible.v6";
const UI_FONT_SIZE_KEY = "masterpieces.ui.fontSize.v1";
const UI_FONT_FAMILY_KEY = "masterpieces.ui.fontFamily.v1";
const APP_THEME_KEY = "masterpieces.ui.theme.v1";
const IMMERSIVE_ZOOM_KEY = "masterpieces.immersive.zoom.v1";
const UI_SYSTEM_FONT_VALUE = "__system__";
const SYSTEM_UI_FONT_STACK = 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif';
const STATUS_PRESETS_PREFIX = "masterpieces.textStatus.presets.v1";
const DOCUMENT_STATUS_PREFIX = "masterpieces.textStatus.documents.v1";
const CONTEXT_WIDTH_PREFIX = "masterpieces.contextSidebarWidth.v1";
const FALLBACK_SYSTEM_FONTS = ["宋体", "微软雅黑", "黑体", "楷体", "仿宋", "SimSun", "Microsoft YaHei", "Arial", "Times New Roman", "Georgia", "serif", "sans-serif"];
const RESOURCE_STORE_PREFIX = "masterpieces.resources.v2";
const OUTLINE_SCENE_STORE_PREFIX = "masterpieces.outlineScenes.v1";
const STRUCTURE_CHAPTER_STORE_PREFIX = "masterpieces.structureChapters.v1";
const STRUCTURE_CHAPTER_TRASH_STORE_PREFIX = "masterpieces.structureChapterTrash.v1";
const APP_LOG_STORE_KEY = "masterpieces.debug.logs.v1";
const AI_SETTINGS_KEY = "masterpieces.ai.settings.v1";
const BINDER_TRASH_STORE_PREFIX = "masterpieces.binderTrash.v1";

const APP_THEMES: Array<{ id: AppThemeId; label: string; hint: string }> = [
  { id: "warm-day", label: "暖日", hint: "当前默认的温暖纸面主题" },
  { id: "dark-orange", label: "幽橙", hint: "幽深蓝底，橙黄荧光强调色" },
];

const AI_PROVIDER_PRESETS: Record<AIProviderId, { label: string; chatBaseUrl: string; chatEndpoint: string; imageBaseUrl: string; imageEndpoint: string; reasoningModel: string; imageModel: string; hint: string }> = {
  siliconflow: {
    label: "硅基流动",
    chatBaseUrl: "https://api.siliconflow.cn/v1",
    chatEndpoint: "/chat/completions",
    imageBaseUrl: "https://api.siliconflow.cn/v1",
    imageEndpoint: "/images/generations",
    reasoningModel: "Qwen/Qwen3-32B",
    imageModel: "black-forest-labs/FLUX.1-schnell",
    hint: "硅基流动：Bearer API Key，聊天接口 /chat/completions，图片接口 /images/generations。",
  },
  openrouter: {
    label: "OpenRouter",
    chatBaseUrl: "https://openrouter.ai/api/v1",
    chatEndpoint: "/chat/completions",
    imageBaseUrl: "https://openrouter.ai/api/v1",
    imageEndpoint: "/chat/completions",
    reasoningModel: "openai/gpt-4o-mini",
    imageModel: "openai/gpt-4o-mini",
    hint: "OpenRouter：Bearer API Key，聊天接口 /chat/completions；可在额外请求头填写 HTTP-Referer 与 X-Title。",
  },
  custom: {
    label: "自定义",
    chatBaseUrl: "",
    chatEndpoint: "/chat/completions",
    imageBaseUrl: "",
    imageEndpoint: "/images/generations",
    reasoningModel: "",
    imageModel: "",
    hint: "自定义 OpenAI 兼容服务，按实际 Base URL、Endpoint 与模型名填写。",
  },
};

const DEFAULT_AI_SETTINGS: AISettings = {
  reasoning: {
    provider: "siliconflow",
    apiKey: "",
    baseUrl: AI_PROVIDER_PRESETS.siliconflow.chatBaseUrl,
    endpoint: AI_PROVIDER_PRESETS.siliconflow.chatEndpoint,
    model: AI_PROVIDER_PRESETS.siliconflow.reasoningModel,
    temperature: 0.2,
    maxTokens: 4096,
    extraHeaders: "",
    imageSize: "",
  },
  image: {
    provider: "siliconflow",
    apiKey: "",
    baseUrl: AI_PROVIDER_PRESETS.siliconflow.imageBaseUrl,
    endpoint: AI_PROVIDER_PRESETS.siliconflow.imageEndpoint,
    model: AI_PROVIDER_PRESETS.siliconflow.imageModel,
    temperature: 0.7,
    maxTokens: 0,
    extraHeaders: "",
    imageSize: "1024x1024",
  },
};
const IMMERSIVE_ZOOM_OPTIONS = [50, 75, 100, 125, 150, 175, 200, 250, 300, 400] as const;

const EMPTY_BINDER: BinderState = {
  draft: { id: "draft-root", title: "草稿", icon: "✍", children: [] },
  outline: { id: "outline-root", title: "大纲", icon: "◇", children: [] },
};

const FONT_SIZE_OPTIONS = ["14px", "16px", "18px", "20px", "24px", "28px", "32px"];
const LINE_HEIGHT_OPTIONS = ["1.4", "1.6", "1.8", "2", "2.2", "2.5"];
const COLOR_PRESETS = ["#111111", "#7c2d12", "#92400e", "#166534", "#1d4ed8", "#6d28d9", "#be123c", "#f5f5f5"];
const HIGHLIGHT_PRESETS = ["#fef08a", "#fed7aa", "#bbf7d0", "#bfdbfe", "#e9d5ff"];
const DEFAULT_TEXT_STATUSES: TextStatus[] = [
  { id: "draft", label: "草稿", color: "#ef4444" },
  { id: "first-draft", label: "初稿", color: "#f59e0b" },
  { id: "final", label: "最终", color: "#22c55e" },
];

const DEFAULT_VISIBLE_TOOLBAR_IDS: ToolbarItemId[] = [
  "fontFamily",
  "firstLineIndent",
  "fontSize",
  "lineHeight",
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
  "color",
  "highlight",
];

const ALL_TOOLBAR_IDS: ToolbarItemId[] = [
  "fontFamily",
  "firstLineIndent",
  "fontSize",
  "lineHeight",
  "paragraph",
  "h1",
  "h2",
  "h3",
  "bold",
  "italic",
  "underline",
  "strike",
  "code",
  "quote",
  "left",
  "center",
  "right",
  "bullet",
  "ordered",
  "task",
  "rule",
  "link",
  "image",
  "table",
  "color",
  "highlight",
  "undo",
  "redo",
];

const WORKSPACE_TABS: Array<{ id: WorkspaceTab; label: string; icon: string; hint: string }> = [
  { id: "write", label: "撰写", icon: "✍", hint: "章节正文" },
  { id: "outline", label: "大纲", icon: "◇", hint: "独立大纲文档" },
  { id: "structure", label: "结构", icon: "▦", hint: "章节与场景结构" },
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


const OUTLINE_SCENE_STATUS_META: Record<OutlineSceneStatus, { label: string; tone: string }> = {
  todo: { label: "待规划", tone: "neutral" },
  draft: { label: "草稿中", tone: "blue" },
  revising: { label: "修订中", tone: "amber" },
  done: { label: "已完成", tone: "green" },
};

const OUTLINE_SCENE_STATUS_ORDER: OutlineSceneStatus[] = ["todo", "draft", "revising", "done"];

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


const FontFamily = Extension.create({
  name: "fontFamily",
  addGlobalAttributes() {
    return [
      {
        types: ["textStyle"],
        attributes: {
          fontFamily: {
            default: null,
            parseHTML: (element) => element.style.fontFamily?.replace(/["']/g, "") || null,
            renderHTML: (attributes) => {
              if (!attributes.fontFamily) return {};
              return { style: `font-family: ${attributes.fontFamily}` };
            },
          },
        },
      },
    ];
  },
});

const TextIndent = Extension.create({
  name: "textIndent",
  addGlobalAttributes() {
    return [
      {
        types: ["paragraph"],
        attributes: {
          textIndent: {
            default: null,
            parseHTML: (element) => element.style.textIndent || null,
            renderHTML: (attributes) => {
              if (!attributes.textIndent) return {};
              return { style: `text-indent: ${attributes.textIndent}` };
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
  const allowed = new Set<ToolbarItemId>(ALL_TOOLBAR_IDS);
  const alwaysFront: ToolbarItemId[] = ["fontFamily", "firstLineIndent", "fontSize", "lineHeight"];
  try {
    const raw = localStorage.getItem(TOOLBAR_PREFS_KEY);
    if (!raw) return DEFAULT_VISIBLE_TOOLBAR_IDS;
    const parsed = JSON.parse(raw) as ToolbarItemId[];
    if (!Array.isArray(parsed)) return DEFAULT_VISIBLE_TOOLBAR_IDS;
    const cleaned = parsed.filter((id): id is ToolbarItemId => allowed.has(id as ToolbarItemId));
    return Array.from(new Set([...alwaysFront, ...cleaned]));
  } catch {
    return DEFAULT_VISIBLE_TOOLBAR_IDS;
  }
}

function loadUiFontSize() {
  try {
    const raw = localStorage.getItem(UI_FONT_SIZE_KEY);
    if (!raw) return "14px";
    return raw;
  } catch {
    return "14px";
  }
}

function loadUiFontFamily() {
  try {
    const raw = localStorage.getItem(UI_FONT_FAMILY_KEY);
    if (!raw) return UI_SYSTEM_FONT_VALUE;
    return raw;
  } catch {
    return UI_SYSTEM_FONT_VALUE;
  }
}

function loadAppTheme(): AppThemeId {
  try {
    const raw = localStorage.getItem(APP_THEME_KEY);
    if (raw === "dark-orange" || raw === "warm-day") return raw;
    return "warm-day";
  } catch {
    return "warm-day";
  }
}

function normalizeImmersiveZoom(value: string | number) {
  const parsed = typeof value === "number" ? value : Number.parseInt(value, 10);
  return IMMERSIVE_ZOOM_OPTIONS.includes(parsed as (typeof IMMERSIVE_ZOOM_OPTIONS)[number]) ? parsed : 100;
}

function loadImmersiveZoom() {
  try {
    const raw = localStorage.getItem(IMMERSIVE_ZOOM_KEY);
    if (!raw) return 100;
    return normalizeImmersiveZoom(raw);
  } catch {
    return 100;
  }
}

function cssFontFamilyValue(fontFamily: string) {
  if (!fontFamily || fontFamily === UI_SYSTEM_FONT_VALUE) return SYSTEM_UI_FONT_STACK;
  const escaped = fontFamily.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
  return `"${escaped}", ${SYSTEM_UI_FONT_STACK}`;
}

function formatSaveTime(value?: string) {
  if (!value) return "尚未保存";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const hour = String(date.getHours()).padStart(2, "0");
  const minute = String(date.getMinutes()).padStart(2, "0");
  return `${year}.${month}.${day} ${hour}:${minute} 修改`;
}

function clampNumber(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function normalizeCssSize(value: string, fallback = "14px") {
  const raw = value.trim();
  if (!raw) return fallback;
  if (/^\d+(\.\d+)?$/.test(raw)) return `${raw}px`;
  if (/^\d+(\.\d+)?(px|rem|em|%)$/.test(raw)) return raw;
  return fallback;
}

function projectScopedKey(prefix: string, projectId?: string) {
  return `${prefix}.${projectId || "global"}`;
}

function formatDebugDetail(detail: unknown) {
  if (detail === undefined || detail === null) return "";
  if (detail instanceof Error) return detail.stack || detail.message;
  if (typeof detail === "string") return detail;
  try {
    return JSON.stringify(detail);
  } catch {
    return String(detail);
  }
}

function writeAppLog(source: string, message: unknown, detail?: unknown) {
  const line = `[${new Date().toISOString()}] ${source}: ${String(message)}${detail !== undefined ? ` | ${formatDebugDetail(detail)}` : ""}`;
  try {
    console.error(line);
  } catch {
    // ignore console failures in embedded WebView
  }
  try {
    const raw = localStorage.getItem(APP_LOG_STORE_KEY);
    const logs = raw ? JSON.parse(raw) : [];
    const next = Array.isArray(logs) ? [...logs, line].slice(-120) : [line];
    localStorage.setItem(APP_LOG_STORE_KEY, JSON.stringify(next));
  } catch {
    // 日志不能影响主界面渲染。
  }
}



let domMutationGuardsInstalled = false;

function installDomMutationGuards() {
  if (domMutationGuardsInstalled || typeof Node === "undefined") return;
  domMutationGuardsInstalled = true;
  const nodePrototype = Node.prototype as Node & {
    __masterpiecesRemoveChild?: typeof Node.prototype.removeChild;
    __masterpiecesInsertBefore?: typeof Node.prototype.insertBefore;
  };
  if (nodePrototype.__masterpiecesRemoveChild) return;

  const originalRemoveChild = Node.prototype.removeChild;
  const originalInsertBefore = Node.prototype.insertBefore;
  nodePrototype.__masterpiecesRemoveChild = originalRemoveChild;
  nodePrototype.__masterpiecesInsertBefore = originalInsertBefore;

  Node.prototype.removeChild = function <T extends Node>(child: T): T {
    if (child && child.parentNode !== this) {
      writeAppLog("dom.removeChild.guard", "阻止一次非父子节点删除，通常来自富文本编辑器与 React 同时更新 DOM。", {
        parent: this.nodeName,
        child: child.nodeName,
        actualParent: child.parentNode ? child.parentNode.nodeName : "null",
      });
      return child;
    }
    return originalRemoveChild.call(this, child) as T;
  };

  Node.prototype.insertBefore = function <T extends Node>(newNode: T, referenceNode: Node | null): T {
    if (referenceNode && referenceNode.parentNode !== this) {
      writeAppLog("dom.insertBefore.guard", "修正一次失效参考节点插入，通常来自富文本编辑器与 React 同时更新 DOM。", {
        parent: this.nodeName,
        newNode: newNode.nodeName,
        referenceNode: referenceNode.nodeName,
        referenceParent: referenceNode.parentNode ? referenceNode.parentNode.nodeName : "null",
      });
      return originalInsertBefore.call(this, newNode, null) as T;
    }
    return originalInsertBefore.call(this, newNode, referenceNode) as T;
  };
}

function readAppLogs() {
  try {
    const raw = localStorage.getItem(APP_LOG_STORE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.map((item) => String(item)).slice(-30).reverse() : [];
  } catch {
    return [];
  }
}

function loadTextStatuses(projectId?: string): TextStatus[] {
  try {
    const raw = localStorage.getItem(projectScopedKey(STATUS_PRESETS_PREFIX, projectId));
    if (!raw) return DEFAULT_TEXT_STATUSES;
    const parsed = JSON.parse(raw) as TextStatus[];
    if (!Array.isArray(parsed)) return DEFAULT_TEXT_STATUSES;
    const cleaned = parsed
      .map((item, index) => ({
        id: typeof item.id === "string" && item.id.trim() ? item.id : `status-${index + 1}`,
        label: typeof item.label === "string" && item.label.trim() ? item.label.trim() : `状态${index + 1}`,
        color: typeof item.color === "string" && item.color.trim() ? item.color : "#8b7355",
      }))
      .filter((item) => item.label);
    return cleaned.length ? cleaned : DEFAULT_TEXT_STATUSES;
  } catch {
    return DEFAULT_TEXT_STATUSES;
  }
}

function loadDocumentStatuses(projectId?: string): Record<string, string> {
  try {
    const raw = localStorage.getItem(projectScopedKey(DOCUMENT_STATUS_PREFIX, projectId));
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

function loadContextSidebarWidth(projectId?: string) {
  try {
    const raw = localStorage.getItem(projectScopedKey(CONTEXT_WIDTH_PREFIX, projectId));
    const value = raw ? Number(raw) : 320;
    return clampNumber(Number.isFinite(value) ? value : 320, 240, 560);
  } catch {
    return 320;
  }
}

function binderTrashKey(projectId?: string) {
  return projectScopedKey(BINDER_TRASH_STORE_PREFIX, projectId);
}

function normalizeTrashNode(input: Partial<BinderNode>, index = 0): BinderNode {
  const now = nowIso();
  const children = Array.isArray(input.children) ? input.children.map((child, childIndex) => normalizeTrashNode(child, childIndex)) : [];
  return {
    id: typeof input.id === "string" && input.id ? input.id : makeId("trash-node"),
    title: typeof input.title === "string" && input.title.trim() ? input.title.trim() : `已删除文稿 ${index + 1}`,
    icon: typeof input.icon === "string" ? input.icon : "▦",
    createdAt: typeof input.createdAt === "string" && input.createdAt ? input.createdAt : now,
    updatedAt: typeof input.updatedAt === "string" && input.updatedAt ? input.updatedAt : now,
    children,
  };
}

function normalizeBinderTrashItem(input: Partial<BinderTrashItem>, index = 0): BinderTrashItem | null {
  if (!input || typeof input !== "object" || !input.node) return null;
  const collection: BinderCollection = input.collection === "outline" ? "outline" : "draft";
  const documents = Array.isArray(input.documents)
    ? input.documents.map((document, docIndex) => ({
        id: typeof document.id === "string" && document.id ? document.id : `document-${docIndex + 1}`,
        title: typeof document.title === "string" && document.title ? document.title : `文稿 ${docIndex + 1}`,
        html: typeof document.html === "string" ? document.html : "",
      }))
    : [];
  return {
    id: typeof input.id === "string" && input.id ? input.id : makeId("trash"),
    collection,
    node: normalizeTrashNode(input.node, index),
    documents,
    deletedAt: typeof input.deletedAt === "string" && input.deletedAt ? input.deletedAt : nowIso(),
  };
}

function loadBinderTrash(projectId?: string): BinderTrashItem[] {
  try {
    const raw = localStorage.getItem(binderTrashKey(projectId));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((item, index) => normalizeBinderTrashItem(item, index))
      .filter((item): item is BinderTrashItem => Boolean(item));
  } catch {
    return [];
  }
}

function saveBinderTrash(projectId: string | undefined, items: BinderTrashItem[]) {
  try {
    const compactItems = items.slice(0, 80).map((item) => compactTrashItem(item));
    localStorage.setItem(binderTrashKey(projectId), JSON.stringify(compactItems));
  } catch {
    try {
      const fallbackItems = items.slice(0, 20).map((item) => ({
        ...compactTrashItem(item),
        documents: [],
      }));
      localStorage.setItem(binderTrashKey(projectId), JSON.stringify(fallbackItems));
    } catch {
      // 回收站只是删除记录，不能因为浏览器存储空间不足导致整个界面白屏。
    }
  }
}

function cloneBinderNode(node: BinderNode): BinderNode {
  return {
    ...node,
    children: node.children.map((child) => cloneBinderNode(child)),
  };
}

function compactTrashNode(node: BinderNode): BinderNode {
  return {
    id: node.id,
    title: node.title,
    icon: node.icon || "▦",
    createdAt: node.createdAt || nowIso(),
    updatedAt: node.updatedAt || nowIso(),
    children: node.children.map((child) => compactTrashNode(child)),
  };
}

function compactTrashItem(item: BinderTrashItem): BinderTrashItem {
  return {
    id: item.id,
    collection: item.collection,
    node: compactTrashNode(item.node),
    documents: item.documents.map((document) => ({
      id: document.id,
      title: document.title,
      html: "",
    })),
    deletedAt: item.deletedAt,
  };
}

function flattenBinderNode(node: BinderNode): BinderNode[] {
  return [node, ...node.children.flatMap((child) => flattenBinderNode(child))];
}

function countBinderNodeTree(node: BinderNode) {
  return flattenBinderNode(node).length;
}

function nodeTreeContains(node: BinderNode, id: string): boolean {
  if (node.id === id) return true;
  return node.children.some((child) => nodeTreeContains(child, id));
}

function normalizeAIServiceConfig(input: Partial<AIServiceConfig> | undefined, fallback: AIServiceConfig): AIServiceConfig {
  const provider = input?.provider === "openrouter" || input?.provider === "custom" || input?.provider === "siliconflow" ? input.provider : fallback.provider;
  return {
    provider,
    apiKey: typeof input?.apiKey === "string" ? input.apiKey : fallback.apiKey,
    baseUrl: typeof input?.baseUrl === "string" ? input.baseUrl : fallback.baseUrl,
    endpoint: typeof input?.endpoint === "string" ? input.endpoint : fallback.endpoint,
    model: typeof input?.model === "string" ? input.model : fallback.model,
    temperature: Number.isFinite(input?.temperature) ? clampNumber(Number(input?.temperature), 0, 2) : fallback.temperature,
    maxTokens: Number.isFinite(input?.maxTokens) ? Math.max(0, Number(input?.maxTokens)) : fallback.maxTokens,
    extraHeaders: typeof input?.extraHeaders === "string" ? input.extraHeaders : fallback.extraHeaders,
    imageSize: typeof input?.imageSize === "string" ? input.imageSize : fallback.imageSize,
  };
}

function loadAISettings(): AISettings {
  try {
    const raw = localStorage.getItem(AI_SETTINGS_KEY);
    if (!raw) return DEFAULT_AI_SETTINGS;
    const parsed = JSON.parse(raw) as Partial<AISettings>;
    return {
      reasoning: normalizeAIServiceConfig(parsed.reasoning, DEFAULT_AI_SETTINGS.reasoning),
      image: normalizeAIServiceConfig(parsed.image, DEFAULT_AI_SETTINGS.image),
    };
  } catch {
    return DEFAULT_AI_SETTINGS;
  }
}

function structureChapterKey(projectId: string) {
  return `${STRUCTURE_CHAPTER_STORE_PREFIX}.${projectId}`;
}

function normalizeStructureChapter(input: Partial<StructureChapterRecord>, index = 0): StructureChapterRecord {
  const createdAt = nowIso();
  return {
    id: typeof input.id === "string" && input.id ? input.id : makeId("chapter"),
    title: typeof input.title === "string" && input.title.trim() ? input.title.trim() : `章节 ${index + 1}`,
    parentId: typeof input.parentId === "string" ? input.parentId : "",
    order: Number.isFinite(input.order) ? Number(input.order) : index,
    notes: typeof input.notes === "string" ? input.notes : "",
    targetWords: Number.isFinite(input.targetWords) ? Math.max(0, Number(input.targetWords)) : 0,
    collapsed: Boolean(input.collapsed),
    createdAt: typeof input.createdAt === "string" && input.createdAt ? input.createdAt : createdAt,
    updatedAt: typeof input.updatedAt === "string" && input.updatedAt ? input.updatedAt : createdAt,
  };
}

function loadStructureChapters(projectId: string): StructureChapterRecord[] {
  try {
    const raw = localStorage.getItem(structureChapterKey(projectId));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.map((item, index) => normalizeStructureChapter(item, index)) : [];
  } catch {
    return [];
  }
}

function saveStructureChapters(projectId: string, chapters: StructureChapterRecord[]) {
  localStorage.setItem(structureChapterKey(projectId), JSON.stringify(chapters));
}

function structureChapterTrashKey(projectId?: string) {
  return projectScopedKey(STRUCTURE_CHAPTER_TRASH_STORE_PREFIX, projectId);
}

function cloneStructureChapter(chapter: StructureChapterRecord): StructureChapterRecord {
  return { ...chapter };
}

function cloneOutlineScene(scene: OutlineSceneRecord): OutlineSceneRecord {
  return {
    ...scene,
    characters: [...scene.characters],
    items: [...scene.items],
    tags: [...scene.tags],
  };
}

function normalizeStructureChapterTrashItem(input: Partial<StructureChapterTrashItem>, index = 0): StructureChapterTrashItem | null {
  if (!input || typeof input !== "object") return null;
  const chapters = Array.isArray(input.chapters)
    ? input.chapters.map((chapter, chapterIndex) => normalizeStructureChapter(chapter, chapterIndex))
    : [];
  if (chapters.length === 0) return null;
  const rootChapterId = typeof input.rootChapterId === "string" && input.rootChapterId ? input.rootChapterId : chapters[0].id;
  const title = typeof input.title === "string" && input.title.trim() ? input.title.trim() : chapters.find((chapter) => chapter.id === rootChapterId)?.title || `已删除章节 ${index + 1}`;
  const scenes = Array.isArray(input.scenes)
    ? input.scenes.map((scene, sceneIndex) => normalizeOutlineScene(scene, sceneIndex))
    : [];
  return {
    id: typeof input.id === "string" && input.id ? input.id : makeId("structure-trash"),
    title,
    rootChapterId,
    chapters,
    scenes,
    deletedAt: typeof input.deletedAt === "string" && input.deletedAt ? input.deletedAt : nowIso(),
  };
}

function loadStructureChapterTrash(projectId?: string): StructureChapterTrashItem[] {
  try {
    const raw = localStorage.getItem(structureChapterTrashKey(projectId));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((item, index) => normalizeStructureChapterTrashItem(item, index))
      .filter((item): item is StructureChapterTrashItem => Boolean(item));
  } catch (error) {
    writeAppLog("loadStructureChapterTrash", "读取结构回收站失败", error);
    return [];
  }
}

function saveStructureChapterTrash(projectId: string | undefined, items: StructureChapterTrashItem[]) {
  try {
    localStorage.setItem(structureChapterTrashKey(projectId), JSON.stringify(items.slice(0, 80)));
  } catch (error) {
    writeAppLog("saveStructureChapterTrash", "保存结构回收站失败", error);
  }
}

function stripHtmlToPlainText(html: string) {
  const normalized = html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|h[1-6]|li|blockquote)>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
  return normalized.split("\n").map((line) => line.trim()).filter(Boolean).join("\n");
}

function parseJsonObjectFromText(text: string): unknown {
  const trimmed = text.trim();
  if (!trimmed) throw new Error("AI 返回为空。未生成结构数据。");
  try {
    return JSON.parse(trimmed);
  } catch {
    const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
    if (fenced?.[1]) return JSON.parse(fenced[1]);
    const start = trimmed.indexOf("{");
    const end = trimmed.lastIndexOf("}");
    if (start >= 0 && end > start) return JSON.parse(trimmed.slice(start, end + 1));
    throw new Error("AI 返回内容不是可解析的 JSON。请在首选项中换一个更擅长结构化输出的模型。");
  }
}

function asStringList(value: unknown): string[] {
  if (Array.isArray(value)) return value.map((item) => String(item).trim()).filter(Boolean);
  if (typeof value === "string") return textToList(value);
  return [];
}

function joinApiUrl(baseUrl: string, endpoint: string) {
  const base = baseUrl.trim().replace(/\/+$/, "");
  const path = endpoint.trim().replace(/^\/+/, "");
  return `${base}/${path}`;
}

function safeParseHeaderJson(value: string): Record<string, string> {
  if (!value.trim()) return {};
  const parsed = JSON.parse(value);
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error('额外请求头必须是 JSON 对象。比如 {"HTTP-Referer":"https://your.app"}');
  return Object.fromEntries(Object.entries(parsed).map(([key, val]) => [key, String(val)]));
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

function outlineSceneKey(projectId: string) {
  return `${OUTLINE_SCENE_STORE_PREFIX}.${projectId}`;
}

function listToText(items: string[]) {
  return items.filter(Boolean).join("，");
}

function textToList(value: string) {
  return value
    .split(/[，,、;；\n]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function normalizeOutlineScene(input: Partial<OutlineSceneRecord>, index = 0): OutlineSceneRecord {
  const now = nowIso();
  const status = OUTLINE_SCENE_STATUS_ORDER.includes(input.status as OutlineSceneStatus)
    ? (input.status as OutlineSceneStatus)
    : "todo";
  return {
    id: typeof input.id === "string" && input.id ? input.id : makeId("scene"),
    title: typeof input.title === "string" && input.title.trim() ? input.title.trim() : `场景 ${index + 1}`,
    chapterId: typeof input.chapterId === "string" ? input.chapterId : "",
    chapter: typeof input.chapter === "string" ? input.chapter : "",
    sceneNo: typeof input.sceneNo === "string" ? input.sceneNo : "",
    status,
    pov: typeof input.pov === "string" ? input.pov : "",
    location: typeof input.location === "string" ? input.location : "",
    timeline: typeof input.timeline === "string" ? input.timeline : "",
    characters: Array.isArray(input.characters) ? input.characters.filter(Boolean) : [],
    items: Array.isArray(input.items) ? input.items.filter(Boolean) : [],
    tags: Array.isArray(input.tags) ? input.tags.filter(Boolean) : [],
    goal: typeof input.goal === "string" ? input.goal : "",
    conflict: typeof input.conflict === "string" ? input.conflict : "",
    outcome: typeof input.outcome === "string" ? input.outcome : "",
    summary: typeof input.summary === "string" ? input.summary : "",
    notes: typeof input.notes === "string" ? input.notes : "",
    targetWords: Number.isFinite(input.targetWords) ? Math.max(0, Number(input.targetWords)) : 0,
    currentWords: Number.isFinite(input.currentWords) ? Math.max(0, Number(input.currentWords)) : 0,
    createdAt: typeof input.createdAt === "string" && input.createdAt ? input.createdAt : now,
    updatedAt: typeof input.updatedAt === "string" && input.updatedAt ? input.updatedAt : now,
  };
}

function loadOutlineScenes(projectId: string): OutlineSceneRecord[] {
  try {
    const raw = localStorage.getItem(outlineSceneKey(projectId));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.map((item, index) => normalizeOutlineScene(item, index));
  } catch {
    return [];
  }
}

function saveOutlineScenes(projectId: string, scenes: OutlineSceneRecord[]) {
  localStorage.setItem(outlineSceneKey(projectId), JSON.stringify(scenes));
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

type AppErrorBoundaryState = {
  message: string;
  stack: string;
  logs: string[];
};

class AppErrorBoundary extends React.Component<{ children: React.ReactNode }, AppErrorBoundaryState> {
  state: AppErrorBoundaryState = { message: "", stack: "", logs: [] };

  static getDerivedStateFromError(error: Error): AppErrorBoundaryState {
    return {
      message: error.message || String(error),
      stack: error.stack || "",
      logs: readAppLogs(),
    };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    writeAppLog("react.error-boundary", error.message, {
      stack: error.stack,
      componentStack: info.componentStack,
    });
  }

  render() {
    if (!this.state.message) return (this as any).props.children;
    return (
      <div className="app-crash-screen">
        <div className="app-crash-card">
          <span className="eyebrow">DEBUG TRACE</span>
          <h1>界面渲染异常</h1>
          <p>应用没有继续白屏，而是把错误拦截在这里。请把下面日志发给我，我可以继续定位。</p>
          <pre>{this.state.message}\n{this.state.stack}</pre>
          <div className="app-crash-actions">
            <button className="primary-button" onClick={() => window.location.reload()}>重新加载</button>
            <button className="soft-button" onClick={() => { localStorage.removeItem(APP_LOG_STORE_KEY); window.location.reload(); }}>清空日志并重载</button>
          </div>
          {this.state.logs.length ? (
            <div className="app-crash-log">
              <strong>最近日志</strong>
              {this.state.logs.map((line, index) => <code key={`${index}-${line}`}>{line}</code>)}
            </div>
          ) : null}
        </div>
      </div>
    );
  }
}

function MasterPiecesApp() {
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
  const [outlineScenes, setOutlineScenes] = useState<OutlineSceneRecord[]>([]);
  const [structureChapters, setStructureChapters] = useState<StructureChapterRecord[]>([]);
  const [structureChapterTrash, setStructureChapterTrash] = useState<StructureChapterTrashItem[]>([]);
  const [binderTrash, setBinderTrash] = useState<BinderTrashItem[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [modalMode, setModalMode] = useState<ModalMode>(null);
  const [modalProject, setModalProject] = useState<ProjectRecord | null>(null);
  const [nodeTarget, setNodeTarget] = useState<NodeTarget | null>(null);
  const [resourceDraft, setResourceDraft] = useState<ResourceRecord | null>(null);
  const [outlineSceneDraft, setOutlineSceneDraft] = useState<OutlineSceneRecord | null>(null);
  const [structureChapterDraft, setStructureChapterDraft] = useState<StructureChapterDraft | null>(null);
  const [selectedStructureChapterId, setSelectedStructureChapterId] = useState("");
  const [selectedStructureSceneId, setSelectedStructureSceneId] = useState("");
  const [structureDetailTab, setStructureDetailTab] = useState<StructureDetailTab>("content");
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
  const [uiFontSize, setUiFontSize] = useState<string>(() => loadUiFontSize());
  const [uiFontFamily, setUiFontFamily] = useState<string>(() => loadUiFontFamily());
  const [appTheme, setAppTheme] = useState<AppThemeId>(() => loadAppTheme());
  const [aiSettings, setAiSettings] = useState<AISettings>(() => loadAISettings());
  const [aiPreferencesKind, setAiPreferencesKind] = useState<AIServiceKind>("reasoning");
  const [preferencesTab, setPreferencesTab] = useState<"general" | "editor" | "ai" | "export">("general");
  const [generalPreferencesSection, setGeneralPreferencesSection] = useState<GeneralPreferencesSection>("typography");
  const [editorPreferencesSection, setEditorPreferencesSection] = useState<"overview" | "toolbar" | "status">("overview");
  const [systemFonts, setSystemFonts] = useState<string[]>(FALLBACK_SYSTEM_FONTS);
  const [textStatuses, setTextStatuses] = useState<TextStatus[]>(() => loadTextStatuses());
  const [documentStatuses, setDocumentStatuses] = useState<Record<string, string>>(() => loadDocumentStatuses());
  const [contextSidebarWidth, setContextSidebarWidth] = useState<number>(() => loadContextSidebarWidth());
  const [expanded, setExpanded] = useState<Record<string, boolean>>({
    "draft:draft-root": true,
    "outline:outline-root": true,
  });
  const [openBinderMenu, setOpenBinderMenu] = useState("");
  const [openTrashCollection, setOpenTrashCollection] = useState<TrashCollection | "">("");
  const [slashMenuOpen, setSlashMenuOpen] = useState(false);
  const [editorTick, setEditorTick] = useState(0);
  const [immersiveMode, setImmersiveMode] = useState(false);
  const [immersiveZoom, setImmersiveZoom] = useState<number>(() => loadImmersiveZoom());

  const saveTimerRef = useRef<number | null>(null);
  const hydratingEditorRef = useRef(false);
  const hydratedKeyRef = useRef("");
  const hydratedHtmlRef = useRef("");
  const editorShellRef = useRef<HTMLElement | null>(null);
  const immersiveFocusRafRef = useRef<number | null>(null);
  const outlineScenesLoadedProjectRef = useRef("");

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
      FontFamily,
      FontSize,
      TextIndent,
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
    installDomMutationGuards();
    writeAppLog("app", "MasterPieces 前端已启动");
    const onError = (event: ErrorEvent) => {
      writeAppLog("window.error", event.message, {
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        stack: event.error instanceof Error ? event.error.stack : undefined,
      });
      setStatusMessage(`界面异常：${event.message}`);
    };
    const onUnhandledRejection = (event: PromiseRejectionEvent) => {
      writeAppLog("window.unhandledrejection", event.reason instanceof Error ? event.reason.message : String(event.reason), event.reason);
      setStatusMessage(`异步异常：${event.reason instanceof Error ? event.reason.message : String(event.reason)}`);
    };
    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onUnhandledRejection);
    return () => {
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onUnhandledRejection);
    };
  }, []);

  useEffect(() => {
    localStorage.setItem(TOOLBAR_PREFS_KEY, JSON.stringify(visibleToolbarIds));
  }, [visibleToolbarIds]);

  useEffect(() => {
    const normalized = normalizeCssSize(uiFontSize, "14px");
    localStorage.setItem(UI_FONT_SIZE_KEY, normalized);
    document.documentElement.style.setProperty("--ui-font-size", normalized);
  }, [uiFontSize]);

  useEffect(() => {
    localStorage.setItem(APP_THEME_KEY, appTheme);
    document.documentElement.dataset.appTheme = appTheme;
    document.documentElement.style.colorScheme = appTheme === "dark-orange" ? "dark" : "light";
  }, [appTheme]);

  useEffect(() => {
    const normalized = normalizeImmersiveZoom(immersiveZoom);
    localStorage.setItem(IMMERSIVE_ZOOM_KEY, String(normalized));
    document.documentElement.style.setProperty("--immersive-zoom-factor", String(normalized / 100));
  }, [immersiveZoom]);

  useEffect(() => {
    const normalized = uiFontFamily.trim() || UI_SYSTEM_FONT_VALUE;
    localStorage.setItem(UI_FONT_FAMILY_KEY, normalized);
    document.documentElement.style.setProperty("--ui-font-family", cssFontFamilyValue(normalized));
  }, [uiFontFamily]);

  useEffect(() => {
    let cancelled = false;
    async function loadFonts() {
      try {
        const fonts = await invoke<string[]>("list_system_fonts");
        if (!cancelled && Array.isArray(fonts) && fonts.length > 0) {
          setSystemFonts(Array.from(new Set([...fonts, ...FALLBACK_SYSTEM_FONTS])));
        }
      } catch {
        if (!cancelled) setSystemFonts(FALLBACK_SYSTEM_FONTS);
      }
    }
    void loadFonts();
    return () => {
      cancelled = true;
    };
  }, []);
useEffect(() => {
    if (view !== "projects") return;
    void refreshProjectStatus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view]);

  useEffect(() => {
    outlineScenesLoadedProjectRef.current = "";
    if (!currentProject) {
      setResources([]);
      setOutlineScenes([]);
      setStructureChapters([]);
      setStructureChapterTrash([]);
      setBinderTrash([]);
      setOpenTrashCollection("");
      setTextStatuses(loadTextStatuses());
      setDocumentStatuses(loadDocumentStatuses());
      setContextSidebarWidth(loadContextSidebarWidth());
      return;
    }
    setResources(loadResources(currentProject.id));
    setOutlineScenes(loadOutlineScenes(currentProject.id));
    setStructureChapters(loadStructureChapters(currentProject.id));
    setStructureChapterTrash(loadStructureChapterTrash(currentProject.id));
    setBinderTrash(loadBinderTrash(currentProject.id));
    setTextStatuses(loadTextStatuses(currentProject.id));
    setDocumentStatuses(loadDocumentStatuses(currentProject.id));
    setContextSidebarWidth(loadContextSidebarWidth(currentProject.id));
    window.setTimeout(() => {
      outlineScenesLoadedProjectRef.current = currentProject.id;
    }, 0);
  }, [currentProject?.id]);

  useEffect(() => {
    if (!currentProject) return;
    saveResources(currentProject.id, resources);
  }, [currentProject?.id, resources]);

  useEffect(() => {
    if (!currentProject || outlineScenesLoadedProjectRef.current !== currentProject.id) return;
    saveOutlineScenes(currentProject.id, outlineScenes);
  }, [currentProject?.id, outlineScenes]);

  useEffect(() => {
    if (!currentProject || outlineScenesLoadedProjectRef.current !== currentProject.id) return;
    saveStructureChapters(currentProject.id, structureChapters);
  }, [currentProject?.id, structureChapters]);


  useEffect(() => {
    if (!currentProject || outlineScenesLoadedProjectRef.current !== currentProject.id) return;
    saveStructureChapterTrash(currentProject.id, structureChapterTrash);
  }, [currentProject?.id, structureChapterTrash]);

  useEffect(() => {
    if (!currentProject) return;
    saveBinderTrash(currentProject.id, binderTrash);
  }, [currentProject?.id, binderTrash]);

  useEffect(() => {
    localStorage.setItem(AI_SETTINGS_KEY, JSON.stringify(aiSettings));
  }, [aiSettings]);

  useEffect(() => {
    localStorage.setItem(projectScopedKey(STATUS_PRESETS_PREFIX, currentProject?.id), JSON.stringify(textStatuses));
  }, [currentProject?.id, textStatuses]);

  useEffect(() => {
    localStorage.setItem(projectScopedKey(DOCUMENT_STATUS_PREFIX, currentProject?.id), JSON.stringify(documentStatuses));
  }, [currentProject?.id, documentStatuses]);

  useEffect(() => {
    localStorage.setItem(projectScopedKey(CONTEXT_WIDTH_PREFIX, currentProject?.id), String(contextSidebarWidth));
  }, [currentProject?.id, contextSidebarWidth]);

  useEffect(() => {
    if (!editor) return;
    const key = `${activeCollection}:${activeNodeId}`;
    if (hydratedKeyRef.current === key && hydratedHtmlRef.current === documentHtml) return;
    hydratingEditorRef.current = true;
    try {
      editor.commands.setContent(documentHtml || "", false);
      hydratedKeyRef.current = key;
      hydratedHtmlRef.current = documentHtml;
      setEditorTick((value) => value + 1);
    } catch (error) {
      writeAppLog("editor.hydrate", `加载编辑器内容失败：${key}`, {
        error: error instanceof Error ? error.stack || error.message : String(error),
        htmlPreview: String(documentHtml || "").slice(0, 280),
      });
      setSaveState("error");
      setDocumentHtml("");
      showStatus("编辑器加载当前文稿失败，已保护性清空当前显示内容。原始文件未被覆盖，请把日志发我继续排查。");
    } finally {
      window.setTimeout(() => {
        hydratingEditorRef.current = false;
      }, 0);
    }
  }, [editor, activeCollection, activeNodeId, documentHtml]);

  useEffect(() => {
    if (!immersiveMode) return;
    scheduleImmersiveFocusScroll();
  }, [immersiveMode, immersiveZoom, editorTick, editor, activeCollection, activeNodeId]);

  useEffect(() => {
    if (!immersiveMode) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        void exitImmersiveMode();
      }
    };
    window.addEventListener("keydown", onKeyDown, true);
    return () => window.removeEventListener("keydown", onKeyDown, true);
  }, [immersiveMode]);

  useEffect(() => {
    return () => {
      if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current);
      if (immersiveFocusRafRef.current) window.cancelAnimationFrame(immersiveFocusRafRef.current);
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
    setOutlineSceneDraft(null);
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
    setOutlineSceneDraft(null);
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

  function scheduleImmersiveFocusScroll() {
    if (immersiveFocusRafRef.current) window.cancelAnimationFrame(immersiveFocusRafRef.current);
    immersiveFocusRafRef.current = window.requestAnimationFrame(() => {
      immersiveFocusRafRef.current = null;
      scrollSelectionToImmersiveFocus();
    });
  }

  function scrollSelectionToImmersiveFocus() {
    if (!immersiveMode || !editor || !editorShellRef.current) return;
    try {
      const position = editor.state.selection.head;
      const coords = editor.view.coordsAtPos(position);
      const shell = editorShellRef.current;
      const shellRect = shell.getBoundingClientRect();
      const targetY = shellRect.top + shell.clientHeight * 0.57;
      const delta = coords.top - targetY;
      if (Math.abs(delta) > 4) {
        shell.scrollTo({
          top: Math.max(0, shell.scrollTop + delta),
          behavior: Math.abs(delta) > 160 ? "auto" : "smooth",
        });
      }
    } catch {
      // 选区位于不可见节点时忽略一次滚动即可。
    }
  }

  async function setWindowFullscreen(enabled: boolean) {
    try {
      await getCurrentWindow().setFullscreen(enabled);
    } catch {
      // 沉浸式布局本身已经铺满窗口；若系统全屏权限不可用，不阻断写作模式。
    }
  }

  async function enterImmersiveMode() {
    setWorkspaceTab("write");
    setToolbarMoreOpen(false);
    setOpenBinderMenu("");
    setSlashMenuOpen(false);
    setImmersiveMode(true);
    await setWindowFullscreen(true);
    window.setTimeout(() => {
      editor?.commands.focus();
      scheduleImmersiveFocusScroll();
    }, 80);
  }

  async function exitImmersiveMode() {
    setImmersiveMode(false);
    await setWindowFullscreen(false);
    window.setTimeout(() => editor?.commands.focus(), 0);
  }

  async function toggleImmersiveMode() {
    if (immersiveMode) {
      await exitImmersiveMode();
      return;
    }
    await enterImmersiveMode();
  }

  async function exportProjectMarkdown() {
    if (!currentProject) {
      showStatus("请先打开一个项目再导出。");
      return;
    }
    setIsBusy(true);
    try {
      await saveActiveDocument(false);
      const zipPath = await invoke<string>("export_project_markdown_zip", {
        path: currentProject.path,
        resources,
        structureChapters,
        outlineScenes,
      });
      showStatus(`已导出 Markdown 压缩包到桌面：${zipPath}`);
    } catch (error) {
      showStatus(`导出失败：${String(error)}`);
    } finally {
      setIsBusy(false);
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

  async function createBinderTrashItem(collection: BinderCollection, node: BinderNode): Promise<BinderTrashItem> {
    // 回收站当前只负责展示与清除删除记录，不在 localStorage 中保存正文内容。
    // 正文 HTML 可能很大，尤其包含图片时会超过 WebView 的 localStorage 配额，导致删除后白屏。
    const documents = flattenBinderNode(node).map((item) => ({
      id: item.id,
      title: item.title,
      html: "",
    }));
    return {
      id: makeId("trash"),
      collection,
      node: compactTrashNode(node),
      documents,
      deletedAt: nowIso(),
    };
  }

  async function deleteBinderNode(collection: BinderCollection, node: BinderNode) {
    if (!currentProject) return;
    const accepted = window.confirm(`确定将「${node.title}」及其所有子文稿移入回收站吗？`);
    if (!accepted) return;
    setIsBusy(true);
    try {
      await saveActiveDocument(false);
      const result = await invoke<BinderTrashMoveResult>("move_binder_document_to_trash", {
        path: currentProject.path,
        collection,
        documentId: node.id,
      });
      const trashItem = normalizeBinderTrashItem(result.trashItem, 0) ?? result.trashItem;
      const nextBinder = result.binder;
      setBinder(nextBinder);
      setBinderTrash((items) => [trashItem, ...items].slice(0, 120));
      const deletedActiveNode = activeCollection === collection && Boolean(activeNodeId) && (activeNodeId === node.id || nodeTreeContains(node, activeNodeId));
      if (deletedActiveNode) {
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
      setOpenTrashCollection(collection);
      showStatus("文稿已移入回收站。可在回收站对话框中还原或清除。");
    } catch (error) {
      showStatus(`删除失败：${String(error)}`);
    } finally {
      setIsBusy(false);
    }
  }

  async function restoreTrashItem(item: BinderTrashItem) {
    if (!currentProject) return;
    const accepted = window.confirm(`确定还原「${item.node.title}」吗？它会回到${item.collection === "outline" ? "大纲" : "撰写"}根目录。`);
    if (!accepted) return;
    setIsBusy(true);
    try {
      await saveActiveDocument(false);
      const nextBinder = await invoke<BinderState>("restore_binder_document_from_trash", {
        path: currentProject.path,
        collection: item.collection,
        trashId: item.id,
        node: item.node,
        parentId: null,
      });
      setBinder(nextBinder);
      setBinderTrash((items) => items.filter((trash) => trash.id !== item.id));
      setOpenTrashCollection("");
      setWorkspaceTab(item.collection === "outline" ? "outline" : "write");
      setActiveCollection(item.collection);
      setActiveNodeId(item.node.id);
      setExpanded((items) => ({ ...items, [nodeKey(item.collection, nextBinder[item.collection].id)]: true }));
      const html = await invoke<string>("read_binder_document", {
        path: currentProject.path,
        documentId: item.node.id,
      });
      setDocumentHtml(html);
      setSaveState("saved");
      showStatus("文稿已从回收站还原。");
    } catch (error) {
      showStatus(`还原失败：${String(error)}`);
    } finally {
      setIsBusy(false);
    }
  }

  async function clearTrashItem(itemId: string) {
    const item = binderTrash.find((trash) => trash.id === itemId);
    if (!item) return;
    const accepted = window.confirm(`确定从回收站清除「${item.node.title}」吗？此操作不可恢复。`);
    if (!accepted) return;
    setIsBusy(true);
    try {
      if (currentProject) {
        await invoke("purge_binder_trash_item", { path: currentProject.path, trashId: item.id });
      }
      setBinderTrash((items) => items.filter((trash) => trash.id !== itemId));
      showStatus("已从回收站清除。");
    } catch (error) {
      showStatus(`清除失败：${String(error)}`);
    } finally {
      setIsBusy(false);
    }
  }

  async function clearTrashCollection(collection: BinderCollection) {
    const items = binderTrash.filter((item) => item.collection === collection);
    if (items.length === 0) return;
    const accepted = window.confirm(`确定清空${collection === "outline" ? "大纲" : "撰写"}回收站中的 ${items.length} 项吗？此操作不可恢复。`);
    if (!accepted) return;
    setIsBusy(true);
    try {
      if (currentProject) {
        await invoke("purge_binder_trash_items", { path: currentProject.path, trashIds: items.map((item) => item.id) });
      }
      setBinderTrash((current) => current.filter((item) => item.collection !== collection));
      showStatus("回收站已清空。");
    } catch (error) {
      showStatus(`清空失败：${String(error)}`);
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

  function applyFontFamily(fontFamily: string) {
    if (!editor) return;
    const family = fontFamily.trim();
    if (!family) return;
    editor.chain().focus().setMark("textStyle", { fontFamily: family }).run();
  }

  function applyFontSize(size: string) {
    const normalized = normalizeCssSize(size, "18px");
    editor?.chain().focus().setMark("textStyle", { fontSize: normalized }).run();
  }

  function currentDocumentHasFirstLineIndent() {
    if (!editor) return false;
    let hasIndent = false;
    editor.state.doc.descendants((node) => {
      if (node.type.name === "paragraph" && node.attrs.textIndent === "2em") {
        hasIndent = true;
        return false;
      }
      return true;
    });
    return hasIndent;
  }

  function toggleCurrentDocumentFirstLineIndent() {
    if (!editor) return;
    const enabled = !currentDocumentHasFirstLineIndent();
    const { state, view } = editor;
    const tr = state.tr;
    state.doc.descendants((node, pos) => {
      if (node.type.name !== "paragraph") return true;
      tr.setNodeMarkup(pos, undefined, {
        ...node.attrs,
        textIndent: enabled ? "2em" : null,
      }, node.marks);
      return true;
    });
    if (tr.docChanged) {
      view.dispatch(tr);
      editor.commands.focus();
      setSaveState("dirty");
      setEditorTick((value) => value + 1);
      scheduleSave(editor.getHTML());
    }
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
      { id: "fontFamily", title: "字体", icon: "字体", group: "style", control: "fontFamily" },
      { id: "firstLineIndent", title: "首行缩进两个字", icon: "文", group: "style", run: toggleCurrentDocumentFirstLineIndent, active: currentDocumentHasFirstLineIndent },
      { id: "fontSize", title: "字号", icon: "字", group: "style", control: "fontSize" },
      { id: "lineHeight", title: "行高", icon: "↕", group: "style", control: "lineHeight" },
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
    const currentFontFamily = editor.getAttributes("textStyle").fontFamily ?? "宋体";
    const currentFontSize = editor.getAttributes("textStyle").fontSize ?? "18px";
    const currentLineHeight = editor.getAttributes("paragraph").lineHeight || editor.getAttributes("heading").lineHeight || "1.8";
    const fontOptions = currentFontFamily && !systemFonts.includes(currentFontFamily)
      ? [currentFontFamily, ...systemFonts]
      : systemFonts;
    if (item.control === "fontFamily") {
      return (
        <label key={item.id} className={`toolbar-select toolbar-select--font ${compact ? "wide" : ""}`} title="字体">
          <span>字体</span>
          <select value={currentFontFamily} onMouseDown={(event) => event.stopPropagation()} onChange={(event) => applyFontFamily(event.currentTarget.value)}>
            {fontOptions.map((font) => (
              <option key={font} value={font}>{font}</option>
            ))}
          </select>
        </label>
      );
    }
    if (item.control === "fontSize") {
      return (
        <label key={`${item.id}-${currentFontSize}`} className={`toolbar-select toolbar-select--size ${compact ? "wide" : ""}`} title="字号">
          <span>字号</span>
          <input
            list="toolbar-font-size-options"
            defaultValue={currentFontSize}
            onMouseDown={(event) => event.stopPropagation()}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                applyFontSize(normalizeCssSize(event.currentTarget.value, currentFontSize));
                event.currentTarget.blur();
              }
            }}
            onBlur={(event) => applyFontSize(normalizeCssSize(event.currentTarget.value, currentFontSize))}
            aria-label="字号"
          />
          <datalist id="toolbar-font-size-options">
            {FONT_SIZE_OPTIONS.map((size) => <option key={size} value={size} />)}
          </datalist>
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

  function statusForNode(nodeId: string) {
    const statusId = documentStatuses[nodeId];
    return textStatuses.find((status) => status.id === statusId) ?? null;
  }

  function setDocumentStatus(nodeId: string, statusId: string) {
    setDocumentStatuses((items) => ({ ...items, [nodeId]: statusId }));
    setOpenBinderMenu("");
    showStatus("状态已标注。");
  }

  function addTextStatus() {
    setTextStatuses((items) => [
      ...items,
      { id: makeId("text-status"), label: "新状态", color: "#8b7355" },
    ]);
  }

  function updateTextStatus(id: string, patch: Partial<TextStatus>) {
    setTextStatuses((items) => items.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  }

  function removeTextStatus(id: string) {
    setTextStatuses((items) => (items.length <= 1 ? items : items.filter((item) => item.id !== id)));
    setDocumentStatuses((items) => {
      const next = { ...items };
      for (const [nodeId, statusId] of Object.entries(next)) {
        if (statusId === id) delete next[nodeId];
      }
      return next;
    });
  }

  function resetTextStatuses() {
    setTextStatuses(DEFAULT_TEXT_STATUSES.map((item) => ({ ...item })));
    setDocumentStatuses({});
  }

  function beginResizeContextSidebar(event: React.MouseEvent<HTMLDivElement>) {
    event.preventDefault();
    const startX = event.clientX;
    const startWidth = contextSidebarWidth;
    const onMove = (moveEvent: MouseEvent) => {
      setContextSidebarWidth(clampNumber(startWidth + moveEvent.clientX - startX, 240, 560));
    };
    const onUp = () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
      document.body.classList.remove("is-resizing-sidebar");
    };
    document.body.classList.add("is-resizing-sidebar");
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  }

  function renderEditorToolbar() {
  if (!editor) return null;
  void editorTick;
  const allItems = toolbarItems();
  const visibleItems = allItems.filter((item) => visibleToolbarIds.includes(item.id));
  const overflowItems = allItems.filter((item) => !visibleToolbarIds.includes(item.id));

  return (
    <div className="editor-toolbar editor-toolbar--split">
      <div className="editor-toolbar__top">
        <div className="editor-toolbar__meta">
          <button
            className="toolbar-icon-button"
            onClick={() => setLeftSidebarOpen((value) => !value)}
            title="显示/隐藏侧边栏"
          >
            <LineIcon name="menu" size={18} />
          </button>
          <div className="editor-toolbar__path">
            <span>{currentProject?.name ?? "未命名项目"}</span>
            <span className="divider">›</span>
            <span>{activeRoot.title}</span>
            {activeNode ? (
              <>
                <span className="divider">›</span>
                <strong>{activeNode.title}</strong>
              </>
            ) : null}
          </div>
        </div>

        <div className="editor-toolbar__status">
          {activeCollection === "outline" ? (
            <button
              className="outline-deconstruct-button"
              onClick={() => void generateStructureFromOutlineWithAI()}
              disabled={isBusy}
              title="分析当前大纲文字，生成结构章节与场景卡"
            >
              <LineIcon name="sparkle" size={18} />
              <span>{isBusy ? "解构中…" : "解构大纲"}</span>
            </button>
          ) : null}
          <button
            className={`immersive-toggle-button ${immersiveMode ? "active" : ""}`.trim()}
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => void toggleImmersiveMode()}
            title="沉浸式写作"
            aria-label="沉浸式写作"
          >
            <LineIcon name="immersive" size={18} />
          </button>
          <div className="save-area">
            <div className="save-area__row">
              <span className={`save-chip save-chip--${saveState}`}>{saveLabel()}</span>
              <button
                className="primary-button editor-toolbar__save-button"
                onClick={() => void saveActiveDocument(true)}
                title="保存"
              >
                <LineIcon name="save" size={12} />
                保存
              </button>
            </div>
            <span className="save-area__time">{saveTimeLabel()}</span>
          </div>
        </div>
      </div>

      <div className="editor-toolbar__bottom">
        <div className="editor-toolbar__controls">{visibleItems.map((item) => renderToolbarButton(item))}</div>

        <div className="editor-toolbar__secondary">
          <button
            className={`toolbar-icon-button more-toggle ${toolbarMoreOpen ? "active" : ""}`.trim()}
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => setToolbarMoreOpen((value) => !value)}
            title="更多编辑按钮"
            aria-label="更多编辑按钮"
          >
            <LineIcon name="more" size={18} strokeWidth={1.9} />
          </button>
        </div>

        {toolbarMoreOpen ? (
          <div className="toolbar-more-menu">
            <div className="toolbar-more-head">
              <span>编辑按钮</span>
              <button
                type="button"
                className="soft-button toolbar-more-settings"
                onClick={() => {
                  setPreferencesTab("editor");
                  setEditorPreferencesSection("toolbar");
                  setModalMode("preferences");
                }}
              >
                首选项
              </button>
            </div>
            {overflowItems.length === 0 ? <p className="muted">所有按钮已显示在主工具栏。</p> : null}
            <div className="toolbar-more-grid">{overflowItems.map((item) => renderToolbarButton(item, true))}</div>
          </div>
        ) : null}
      </div>
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

  function saveTimeLabel() {
    return formatSaveTime(currentProject?.updatedAt);
  }

  async function switchWorkspaceTab(tab: WorkspaceTab) {
    if (workspaceTab === tab) return;
    writeAppLog("switchWorkspaceTab", `${workspaceTab} -> ${tab}`, {
      activeCollection,
      activeNodeId,
      outlineCount: binder.outline.children.length,
      draftCount: binder.draft.children.length,
    });
    try {
      await saveActiveDocument(false);
      setToolbarMoreOpen(false);
      setOpenBinderMenu("");
      setSlashMenuOpen(false);

      if (tab === "structure") {
        setWorkspaceTab(tab);
        setActiveCollection("outline");
        if (!findNode(binder.outline.children, activeNodeId)) {
          setActiveNodeId("");
          setDocumentHtml("");
          setSaveState("idle");
        }
        return;
      }

      const nextCollection: BinderCollection = tab === "write" ? "draft" : "outline";
      const nextRoot = binder[nextCollection] ?? EMPTY_BINDER[nextCollection];
      const currentNode = activeNodeId ? findNode(nextRoot.children, activeNodeId) : null;
      const selected = currentNode ?? firstNode(nextRoot.children);

      setWorkspaceTab(tab);
      setActiveCollection(nextCollection);

      if (!currentProject || !selected) {
        setActiveNodeId("");
        setDocumentHtml("");
        setSaveState("idle");
        return;
      }

      setActiveNodeId(selected.id);
      const html = await invoke<string>("read_binder_document", { path: currentProject.path, documentId: selected.id });
      setDocumentHtml(typeof html === "string" ? html : "");
      setSaveState("saved");
    } catch (error) {
      writeAppLog("switchWorkspaceTab", `切换到 ${tab} 失败`, error);
      showStatus(`切换模块失败：${error instanceof Error ? error.message : String(error)}`);
    }
  }

  function structureChapterById(id: string) {
    return structureChapters.find((chapter) => chapter.id === id) ?? null;
  }

  function resolveSceneChapterId(scene: OutlineSceneRecord) {
    if (scene.chapterId && structureChapters.some((chapter) => chapter.id === scene.chapterId)) return scene.chapterId;
    const byTitle = scene.chapter.trim() ? structureChapters.find((chapter) => chapter.title === scene.chapter.trim()) : null;
    return byTitle?.id ?? "";
  }

  function getStructureChapterSummaries(): StructureChapterSummary[] {
    const validIds = new Set(structureChapters.map((chapter) => chapter.id));
    const children = new Map<string, StructureChapterRecord[]>();
    structureChapters.forEach((chapter) => {
      const parentId = chapter.parentId && validIds.has(chapter.parentId) ? chapter.parentId : "";
      const list = children.get(parentId) ?? [];
      list.push(chapter);
      children.set(parentId, list);
    });
    children.forEach((items) => {
      items.sort((a, b) => a.order - b.order || a.title.localeCompare(b.title, "zh-CN"));
    });

    const stats = new Map<string, { sceneCount: number; words: number }>();
    outlineScenes.forEach((scene) => {
      const chapterId = resolveSceneChapterId(scene);
      if (!chapterId) return;
      const current = stats.get(chapterId) ?? { sceneCount: 0, words: 0 };
      current.sceneCount += 1;
      current.words += scene.currentWords;
      stats.set(chapterId, current);
    });

    const result: StructureChapterSummary[] = [];
    const walk = (parentId: string, depth: number) => {
      (children.get(parentId) ?? []).forEach((chapter) => {
        const currentStats = stats.get(chapter.id) ?? { sceneCount: 0, words: 0 };
        result.push({
          ...chapter,
          depth,
          sceneCount: currentStats.sceneCount,
          words: currentStats.words,
          hasChildren: (children.get(chapter.id) ?? []).length > 0,
        });
        if (!chapter.collapsed) walk(chapter.id, depth + 1);
      });
    };
    walk("", 0);

    return result;
  }

  function structureChapterOptions() {
    return getStructureChapterSummaries();
  }

  function renderStructureSidebar() {
    const chapters = getStructureChapterSummaries();
    const query = searchQuery.trim().toLowerCase();
    const visible = chapters.filter((chapter) => {
      if (!query) return true;
      return [chapter.title, chapter.notes].join(" ").toLowerCase().includes(query);
    });
    const activeChapterId = selectedStructureChapterId || visible[0]?.id || "";
    return (
      <div className="structure-sidebar-list structure-tree-list">
        <div className="section-title">章节索引</div>
        {visible.map((chapter) => (
          <div key={chapter.id} className="structure-tree-row-wrap">
            <button
              className={`structure-sidebar-item structure-tree-row ${activeChapterId === chapter.id ? "active" : ""}`.trim()}
              style={{ paddingLeft: 12 + chapter.depth * 16 }}
              onClick={() => {
                setSelectedStructureChapterId(chapter.id);
                setSelectedStructureSceneId("");
              }}
            >
              <span className="structure-tree-toggle" aria-hidden="true">{chapter.hasChildren ? (chapter.collapsed ? "›" : "⌄") : ""}</span>
              <span className="structure-sidebar-item__title">{chapter.title}</span>
              <small>{chapter.sceneCount} 场 · {chapter.words.toLocaleString("zh-CN")} 字</small>
            </button>
            <span className="structure-tree-inline-actions">
              <button onClick={() => toggleStructureChapterCollapsed(chapter.id)} title={chapter.collapsed ? "展开" : "折叠"}>{chapter.hasChildren ? (chapter.collapsed ? "›" : "⌄") : ""}</button>
              <button onClick={() => openCreateStructureChapterModal(chapter.id)} title="添加子章节">＋</button>
              <button onClick={() => openEditStructureChapterModal(chapter)} title="编辑章节"><LineIcon name="more" size={13} /></button>
              <button onClick={() => deleteStructureChapter(chapter.id)} title="移入回收站"><LineIcon name="trash" size={13} /></button>
            </span>
          </div>
        ))}
        {visible.length === 0 ? (
          <div className="empty-state small structure-index-empty">
            <p>结构索引为空。章节需要在结构模块里手动添加，不会自动关联大纲文档。</p>
            <button className="soft-button" onClick={() => openCreateStructureChapterModal()}>新建章节</button>
          </div>
        ) : null}
      </div>
    );
  }

  function renderBinderTrash(collection: BinderCollection) {
    const items = binderTrash.filter((item) => item.collection === collection);
    return (
      <div className="binder-trash">
        <button
          type="button"
          className="binder-trash-head"
          onClick={() => setOpenTrashCollection(collection)}
          title="打开回收站"
        >
          <LineIcon name="trash" size={16} />
          <span>回收站</span>
          <small>{items.length}</small>
        </button>
      </div>
    );
  }

  function renderStructureTrash() {
    return (
      <div className="binder-trash structure-trash-entry">
        <button
          type="button"
          className="binder-trash-head"
          onClick={() => setOpenTrashCollection("structure")}
          title="打开结构回收站"
        >
          <LineIcon name="trash" size={16} />
          <span>回收站</span>
          <small>{structureChapterTrash.length}</small>
        </button>
      </div>
    );
  }

  function renderTrashDialog() {
    if (!openTrashCollection) return null;
    if (openTrashCollection === "structure") {
      const items = structureChapterTrash;
      return (
        <div className="modal-backdrop trash-dialog-backdrop" onClick={() => setOpenTrashCollection("")}>
          <div className="modal trash-dialog" onClick={(event) => event.stopPropagation()}>
            <div className="modal-head">
              <div>
                <h2>结构回收站</h2>
                <p className="muted">删除的结构章节会先放在这里。可以还原，也可以单个清除或全部清除。</p>
              </div>
              <button onClick={() => setOpenTrashCollection("")}>×</button>
            </div>
            <div className="trash-dialog-toolbar">
              <span>{items.length} 项已删除</span>
              <button className="text-button danger-text" disabled={items.length === 0 || isBusy} onClick={clearStructureTrashAll}>全部清除</button>
            </div>
            <div className="trash-dialog-list">
              {items.length === 0 ? (
                <div className="empty-state small trash-dialog-empty">
                  <LineIcon name="trash" size={28} />
                  <p>回收站是空的。</p>
                </div>
              ) : null}
              {items.map((item) => (
                <article className="trash-dialog-item" key={item.id}>
                  <div className="trash-dialog-item__icon">▦</div>
                  <div className="trash-dialog-item__main">
                    <strong>{item.title}</strong>
                    <small>{item.chapters.length} 个章节 · {item.scenes.length} 个场景 · 删除于 {formatTime(item.deletedAt)}</small>
                    {item.chapters.length > 1 ? <span>{item.chapters.slice(0, 4).map((chapter) => chapter.title).join("、")}{item.chapters.length > 4 ? "…" : ""}</span> : null}
                  </div>
                  <div className="trash-dialog-item__actions">
                    <button className="soft-button" disabled={isBusy} onClick={() => restoreStructureTrashItem(item)}>还原</button>
                    <button className="text-button danger-text" disabled={isBusy} onClick={() => clearStructureTrashItem(item.id)}>清除</button>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </div>
      );
    }

    const collection = openTrashCollection;
    const items = binderTrash.filter((item) => item.collection === collection);
    const label = collection === "outline" ? "大纲" : "撰写";
    return (
      <div className="modal-backdrop trash-dialog-backdrop" onClick={() => setOpenTrashCollection("")}>
        <div className="modal trash-dialog" onClick={(event) => event.stopPropagation()}>
          <div className="modal-head">
            <div>
              <h2>{label}回收站</h2>
              <p className="muted">删除的文稿会先放在这里。可以还原，也可以单个清除或全部清除。</p>
            </div>
            <button onClick={() => setOpenTrashCollection("")}>×</button>
          </div>
          <div className="trash-dialog-toolbar">
            <span>{items.length} 项已删除</span>
            <button className="text-button danger-text" disabled={items.length === 0 || isBusy} onClick={() => void clearTrashCollection(collection)}>全部清除</button>
          </div>
          <div className="trash-dialog-list">
            {items.length === 0 ? (
              <div className="empty-state small trash-dialog-empty">
                <LineIcon name="trash" size={28} />
                <p>回收站是空的。</p>
              </div>
            ) : null}
            {items.map((item) => (
              <article className="trash-dialog-item" key={item.id}>
                <div className="trash-dialog-item__icon">{item.node.icon || "▦"}</div>
                <div className="trash-dialog-item__main">
                  <strong>{item.node.title}</strong>
                  <small>{countBinderNodeTree(item.node)} 个文稿 · 删除于 {formatTime(item.deletedAt)}</small>
                  {item.documents.length > 1 ? <span>{item.documents.slice(0, 3).map((document) => document.title).join("、")}{item.documents.length > 3 ? "…" : ""}</span> : null}
                </div>
                <div className="trash-dialog-item__actions">
                  <button className="soft-button" disabled={isBusy} onClick={() => void restoreTrashItem(item)}>还原</button>
                  <button className="text-button danger-text" disabled={isBusy} onClick={() => void clearTrashItem(item.id)}>清除</button>
                </div>
              </article>
            ))}
          </div>
        </div>
      </div>
    );
  }

  function renderBinderRoot(collection: BinderCollection) {
    const root = binder[collection];
    const rootKey = nodeKey(collection, root.id);
    const expandedRoot = isExpanded(collection, root.id);
    // 只有根目录本身被选中时才高亮根行。
    // 当选中子文稿时，不再同时高亮根目录，避免“草稿/正文”两行高亮粘连。
    const active = activeCollection === collection && !activeNodeId;
    return (
      <div className="binder-root" key={collection}>
        <div className={`binder-row root ${active ? "active" : ""}`}>
          <button className="tree-toggle" onClick={() => toggleExpanded(collection, root.id)}>{expandedRoot ? "⌄" : "›"}</button>
          <button className="node-icon" onClick={() => openEditRootModal(collection)} title="修改根目录图标"><span className="node-glyph">{root.icon}</span></button>
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
          <button className="node-icon" onClick={(event) => { event.stopPropagation(); openEditNodeModal(collection, node); }} title="修改图标"><span className="node-glyph">{node.icon || (hasChildren ? "▣" : "▦")}</span></button>
          <span className="node-title-wrap">
            <button className="node-title" onClick={() => void selectBinderNode(collection, node)}>{node.title}</button>
            {statusForNode(node.id) ? (
              <span className="node-status-badge" style={{ backgroundColor: statusForNode(node.id)?.color }}>
                {statusForNode(node.id)?.label}
              </span>
            ) : null}
          </span>
          <button className="mini-button" onClick={(event) => { event.stopPropagation(); openCreateNodeModal(collection, node.id); }} title="添加子文稿">＋</button>
          <button className="mini-button" onClick={(event) => { event.stopPropagation(); setOpenBinderMenu(openBinderMenu === key ? "" : key); }} title="更多">…</button>
          {openBinderMenu === key ? (
            <div className="node-menu">
              <button onClick={() => openCreateNodeModal(collection, node.id)}>添加子文稿</button>
              <button onClick={() => openEditNodeModal(collection, node)}>重命名 / 图标</button>
              <div className="node-menu-item has-submenu">
                <span>状态</span>
                <span>‹</span>
                <div className="node-submenu">
                  {textStatuses.map((status) => (
                    <button key={status.id} onClick={() => setDocumentStatus(node.id, status.id)}>
                      <span className="status-dot" style={{ backgroundColor: status.color }} />
                      {status.label}
                    </button>
                  ))}
                </div>
              </div>
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
      openCreateNodeModal("draft", binder.draft.id);
      return;
    }
    if (workspaceTab === "outline") {
      openCreateNodeModal("outline", binder.outline.id);
      return;
    }
    if (workspaceTab === "structure") {
      openCreateStructureChapterModal(selectedStructureChapterId || "");
    }
  }

  function contextTitle() {
    if (workspaceTab === "write") return "写作中心";
    if (workspaceTab === "outline") return "大纲中心";
    if (workspaceTab === "structure") return "结构模块";
    return WORKSPACE_TABS.find((tab) => tab.id === workspaceTab)?.label ?? "写作中心";
  }

  function contextHint() {
    if (workspaceTab === "write") return currentProject?.name ? `正在编辑 · ${currentProject.name}` : "草稿、章节与正文";
    if (workspaceTab === "outline") return "独立的大纲文档与正文编辑器";
    if (workspaceTab === "structure") return "章节、场景与目标推进";
    return WORKSPACE_TABS.find((tab) => tab.id === workspaceTab)?.hint ?? "写作中心";
  }

  function renderSidebar() {
    if (!leftSidebarOpen) return null;
    return (
      <aside className="sidebar-shell" style={{ width: contextSidebarWidth + 72, flexBasis: contextSidebarWidth + 72, minWidth: contextSidebarWidth + 72 }}>
        <div className="navigation-rail">
          <button className="rail-logo" onClick={() => void switchWorkspaceTab("write")} title="MasterPieces" aria-label="MasterPieces">
            <span>M</span>
            <span className="rail-tooltip">MasterPieces</span>
          </button>
          <nav className="rail-nav" aria-label="功能导航">
            {WORKSPACE_TABS.map((tab) => (
              <button
                key={tab.id}
                className={`rail-button ${workspaceTab === tab.id ? "active" : ""}`}
                onClick={() => void switchWorkspaceTab(tab.id)}
                title={`${tab.label} · ${tab.hint}`}
                aria-label={tab.label}
              >
                <LineIcon name={TAB_ICON[tab.id]} />
                <span className="rail-tooltip">{tab.label}</span>
              </button>
            ))}
          </nav>
          <div className="rail-footer">
            <button
              className="rail-button"
              onClick={() => {
                setPreferencesTab("general");
                setModalMode("preferences");
              }}
              title="首选项"
              aria-label="首选项"
            >
              <LineIcon name="settings" />
              <span className="rail-tooltip">首选项</span>
            </button>
            <button className="rail-button" onClick={() => void returnToProjectSelection()} title="返回项目" aria-label="返回项目">
              <LineIcon name="back" />
              <span className="rail-tooltip">返回项目</span>
            </button>
          </div>
        </div>

        <section className="context-sidebar" style={{ width: contextSidebarWidth, flexBasis: contextSidebarWidth }}>
          <div className="sidebar-resizer" onMouseDown={beginResizeContextSidebar} title="拖拽调整侧边栏宽度" />
          <div className="context-head">
            <div className="context-head__copy">
              <strong className="context-title">{contextTitle()}</strong>
              <small className="context-subtitle">{contextHint()}</small>
            </div>
            <button className="context-add" onClick={createFromSidebar} title="新建" aria-label="新建">
              <LineIcon name="plus" size={17} />
            </button>
          </div>
          <div className="sidebar-search">
            <LineIcon name="search" size={16} />
            <input value={searchQuery} onChange={(event) => setSearchQuery(event.currentTarget.value)} placeholder="搜索章节、人物、设定…" />
          </div>
          <div className={`binder-section ${workspaceTab === "write" || workspaceTab === "outline" || workspaceTab === "structure" ? "binder-section--with-trash" : ""}`.trim()}>
            {workspaceTab === "structure" ? (
              <>
                <div className="binder-scroll-area structure-sidebar-scroll">
                  {renderStructureSidebar()}
                </div>
                {renderStructureTrash()}
              </>
            ) : (
              <>
                <div className="binder-scroll-area">
                  <div className="section-title">{workspaceTab === "outline" ? "大纲目录" : "文稿目录"}</div>
                  {workspaceTab === "outline" ? renderBinderRoot("outline") : renderBinderRoot("draft")}
                </div>
                {renderBinderTrash(workspaceTab === "outline" ? "outline" : "draft")}
              </>
            )}
          </div>
        </section>
      </aside>
    );
  }

  function renderDocumentHeader() {
    if (!activeNode) return null;
    const currentStatus = statusForNode(activeNode.id);
    return (
      <div className="document-header document-header--compact">
        <div className="doc-meta">
          <span><LineIcon name={activeCollection === "draft" ? "folder" : "outline"} size={15} /></span>
          <span>{activeRoot.title}</span>
          <span>/</span>
          <span>{activeNode.title}</span>
        </div>
        <div className="document-header__aside">
          {currentStatus ? (
            <span className="document-status-badge" style={{ backgroundColor: currentStatus.color }}>{currentStatus.label}</span>
          ) : (
            <span className="document-status-badge document-status-badge--muted">未标注</span>
          )}
          <span className="document-updated">更新 {formatTime(activeNode.updatedAt)}</span>
        </div>
      </div>
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

  function renderEditorView(hidden = false) {
    const hasActiveNode = Boolean(activeNode);
    return (
      <main className={`writer-main ${hidden ? "writer-main--parked" : ""}`.trim()} aria-hidden={hidden}>
        {renderEditorToolbar()}
        {immersiveMode ? (
          <div className="immersive-controls">
            <label className="immersive-zoom-control" title="沉浸式界面缩放">
              <span>界面缩放</span>
              <select
                value={immersiveZoom}
                onMouseDown={(event) => event.stopPropagation()}
                onChange={(event) => {
                  setImmersiveZoom(normalizeImmersiveZoom(event.currentTarget.value));
                  window.setTimeout(() => scheduleImmersiveFocusScroll(), 0);
                }}
              >
                {IMMERSIVE_ZOOM_OPTIONS.map((zoom) => (
                  <option key={zoom} value={zoom}>{zoom}%</option>
                ))}
              </select>
            </label>
            <button className="immersive-exit-button" onClick={() => void exitImmersiveMode()} title="退出沉浸式写作" aria-label="退出沉浸式写作">
              <LineIcon name="exitImmersive" size={18} />
              退出沉浸
            </button>
          </div>
        ) : null}
        <section ref={editorShellRef} className={`editor-shell ${!hasActiveNode ? "editor-shell--empty" : ""}`.trim()}>
          <div className={`editor-paper ${!hasActiveNode ? "editor-paper--parked" : ""}`.trim()} aria-hidden={!hasActiveNode}>
            {hasActiveNode ? renderDocumentHeader() : null}
            {editor && hasActiveNode ? (
              <BubbleMenu editor={editor} tippyOptions={{ duration: 120 }}>
                <div className="bubble-menu">
                  <button onClick={() => editor.chain().focus().toggleBold().run()}>B</button>
                  <button onClick={() => editor.chain().focus().toggleItalic().run()}>I</button>
                  <button onClick={openLinkModal}>链接</button>
                </div>
              </BubbleMenu>
            ) : null}
            <EditorContent editor={editor} />
            {hasActiveNode && slashMenuOpen ? (
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
          {!hasActiveNode ? (
            <div className="empty-state big editor-empty-state">
              <div className="empty-icon"><LineIcon name={activeCollection === "draft" ? "write" : "outline"} size={36} strokeWidth={1.45} /></div>
              <h2>{activeRoot.title}</h2>
              <p>{activeCollection === "draft" ? "这里是草稿根目录，可以无限添加子文稿。" : "这里是独立的大纲模块，界面和撰写一致，但内容与草稿分开保存。"}</p>
              <button className="primary-button" onClick={() => openCreateNodeModal(activeCollection, activeRoot.id)}>{activeCollection === "outline" ? "添加大纲" : "添加文稿"}</button>
            </div>
          ) : null}
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

  function createEmptyOutlineScene(seed: Partial<OutlineSceneRecord> = {}): OutlineSceneRecord {
    const createdAt = nowIso();
    return normalizeOutlineScene({
      id: makeId("scene"),
      title: "新的场景",
      chapter: "",
      sceneNo: "",
      status: "todo",
      pov: "",
      location: "",
      timeline: "",
      characters: [],
      items: [],
      tags: [],
      goal: "",
      conflict: "",
      outcome: "",
      summary: "",
      notes: "",
      targetWords: 0,
      currentWords: 0,
      createdAt,
      updatedAt: createdAt,
      ...seed,
    });
  }

  function openCreateStructureChapterModal(parentId = "") {
    const nextOrder = structureChapters.filter((chapter) => (chapter.parentId || "") === parentId).length;
    setStructureChapterDraft({
      id: makeId("chapter"),
      title: "新的章节",
      parentId,
      notes: "",
      targetWords: 0,
    });
    // order 在保存时根据同级章节计算，这里保留 nextOrder 只是为了让创建入口的含义明确。
    void nextOrder;
    setModalMode("createStructureChapter");
  }

  function openEditStructureChapterModal(chapter: StructureChapterSummary | StructureChapterRecord) {
    setStructureChapterDraft({
      id: chapter.id,
      title: chapter.title,
      parentId: chapter.parentId || "",
      notes: chapter.notes || "",
      targetWords: chapter.targetWords || 0,
    });
    setModalMode("editStructureChapter");
  }

  function saveStructureChapterDraft() {
    if (!structureChapterDraft) return;
    const title = structureChapterDraft.title.trim();
    if (!title) return showStatus("请输入章节标题。");
    const now = nowIso();
    setStructureChapters((items) => {
      const exists = items.some((item) => item.id === structureChapterDraft.id);
      const parentId = structureChapterDraft.parentId === structureChapterDraft.id ? "" : structureChapterDraft.parentId;
      if (exists) {
        return items.map((item) => item.id === structureChapterDraft.id ? {
          ...item,
          title,
          parentId,
          notes: structureChapterDraft.notes,
          targetWords: Math.max(0, Number(structureChapterDraft.targetWords) || 0),
          updatedAt: now,
        } : item);
      }
      const order = items.filter((item) => (item.parentId || "") === parentId).length;
      return [...items, normalizeStructureChapter({
        id: structureChapterDraft.id,
        title,
        parentId,
        order,
        notes: structureChapterDraft.notes,
        targetWords: Math.max(0, Number(structureChapterDraft.targetWords) || 0),
        collapsed: false,
        createdAt: now,
        updatedAt: now,
      }, order)];
    });
    setSelectedStructureChapterId(structureChapterDraft.id);
    closeModalAfterBusy();
    showStatus("结构章节已保存。");
  }

  function getStructureDescendantIds(chapterId: string) {
    const descendants = new Set<string>();
    const visit = (id: string) => {
      structureChapters.filter((chapter) => chapter.parentId === id).forEach((child) => {
        descendants.add(child.id);
        visit(child.id);
      });
    };
    visit(chapterId);
    return descendants;
  }

  function deleteStructureChapter(chapterId: string) {
    const chapter = structureChapterById(chapterId);
    if (!chapter) return;
    const descendants = getStructureDescendantIds(chapterId);
    const removeIds = new Set([chapterId, ...descendants]);
    const relatedScenes = outlineScenes.filter((scene) => removeIds.has(resolveSceneChapterId(scene) || scene.chapterId || ""));
    const accepted = window.confirm(`确定将结构章节「${chapter.title}」及其子章节移入回收站吗？相关场景也会一起放入结构回收站。`);
    if (!accepted) return;
    const trashItem: StructureChapterTrashItem = {
      id: makeId("structure-trash"),
      title: chapter.title,
      rootChapterId: chapter.id,
      chapters: structureChapters.filter((item) => removeIds.has(item.id)).map(cloneStructureChapter),
      scenes: relatedScenes.map(cloneOutlineScene),
      deletedAt: nowIso(),
    };
    setStructureChapterTrash((items) => [trashItem, ...items].slice(0, 80));
    setStructureChapters((items) => items.filter((item) => !removeIds.has(item.id)));
    setOutlineScenes((items) => items.filter((scene) => !removeIds.has(resolveSceneChapterId(scene) || scene.chapterId || "")));
    if (removeIds.has(selectedStructureChapterId)) {
      setSelectedStructureChapterId("");
      setSelectedStructureSceneId("");
    }
    closeModalAfterBusy();
    setOpenTrashCollection("structure");
    showStatus("结构章节已移入回收站，可在回收站中还原或清除。");
  }

  function restoreStructureTrashItem(item: StructureChapterTrashItem) {
    const accepted = window.confirm(`确定还原结构章节「${item.title}」吗？章节树和关联场景会一起恢复。`);
    if (!accepted) return;
    const now = nowIso();
    setStructureChapters((current) => {
      const restoreIds = new Set(item.chapters.map((chapter) => chapter.id));
      const withoutDuplicates = current.filter((chapter) => !restoreIds.has(chapter.id));
      return [
        ...withoutDuplicates,
        ...item.chapters.map((chapter) => ({ ...chapter, updatedAt: chapter.updatedAt || now })),
      ];
    });
    setOutlineScenes((current) => {
      const restoreIds = new Set(item.scenes.map((scene) => scene.id));
      const withoutDuplicates = current.filter((scene) => !restoreIds.has(scene.id));
      return [
        ...withoutDuplicates,
        ...item.scenes.map((scene) => ({ ...cloneOutlineScene(scene), updatedAt: scene.updatedAt || now })),
      ];
    });
    setStructureChapterTrash((items) => items.filter((trash) => trash.id !== item.id));
    setSelectedStructureChapterId(item.rootChapterId);
    setOpenTrashCollection("");
    showStatus("结构章节已还原。");
  }

  function clearStructureTrashItem(itemId: string) {
    const item = structureChapterTrash.find((trash) => trash.id === itemId);
    if (!item) return;
    const accepted = window.confirm(`确定从结构回收站清除「${item.title}」吗？此操作不可恢复。`);
    if (!accepted) return;
    setStructureChapterTrash((items) => items.filter((trash) => trash.id !== itemId));
    showStatus("已从结构回收站清除。");
  }

  function clearStructureTrashAll() {
    if (structureChapterTrash.length === 0) return;
    const accepted = window.confirm(`确定清空结构回收站中的 ${structureChapterTrash.length} 项吗？此操作不可恢复。`);
    if (!accepted) return;
    setStructureChapterTrash([]);
    showStatus("结构回收站已清空。");
  }

  function toggleStructureChapterCollapsed(chapterId: string) {
    setStructureChapters((items) => items.map((item) => item.id === chapterId ? { ...item, collapsed: !item.collapsed } : item));
  }

  function openCreateOutlineSceneModal(seed: Partial<OutlineSceneRecord> = {}) {
    const selectedChapter = seed.chapterId ? structureChapterById(seed.chapterId) : null;
    setOutlineSceneDraft(createEmptyOutlineScene({
      ...seed,
      chapterId: seed.chapterId || "",
      chapter: seed.chapter || selectedChapter?.title || "",
    }));
    setModalMode("createOutlineScene");
  }

  function openEditOutlineSceneModal(scene: OutlineSceneRecord) {
    setOutlineSceneDraft({ ...scene });
    setModalMode("editOutlineScene");
  }

  function saveOutlineSceneDraft() {
    if (!outlineSceneDraft) return;
    const title = outlineSceneDraft.title.trim();
    if (!title) return showStatus("请输入场景标题。");
    const chapter = outlineSceneDraft.chapterId ? structureChapterById(outlineSceneDraft.chapterId) : null;
    const next = normalizeOutlineScene({
      ...outlineSceneDraft,
      title,
      chapterId: chapter?.id || "",
      chapter: chapter?.title || outlineSceneDraft.chapter || "",
      updatedAt: nowIso(),
    });
    setOutlineScenes((items) => {
      const exists = items.some((item) => item.id === next.id);
      return exists ? items.map((item) => (item.id === next.id ? next : item)) : [next, ...items];
    });
    if (next.chapterId) setSelectedStructureChapterId(next.chapterId);
    setSelectedStructureSceneId(next.id);
    closeModalAfterBusy();
    showStatus("场景卡已保存。");
  }

  function deleteOutlineScene(scene: OutlineSceneRecord) {
    const accepted = window.confirm(`确定删除场景卡「${scene.title}」吗？`);
    if (!accepted) return;
    setOutlineScenes((items) => items.filter((item) => item.id !== scene.id));
    showStatus("场景卡已删除。");
  }

  function buildOutlineScenesFromDraft() {
    const draftNodes = flattenNodes(binder.draft);
    if (draftNodes.length === 0) {
      showStatus("草稿里还没有章节，先新建章节或手动添加场景卡。");
      return;
    }
    const existing = new Set(outlineScenes.map((item) => item.title.trim().toLowerCase()).filter(Boolean));
    const createdAt = nowIso();
    const generated = draftNodes
      .filter(({ node }) => !existing.has(node.title.trim().toLowerCase()))
      .map(({ node, depth }, index) => createEmptyOutlineScene({
        title: node.title,
        chapter: depth === 0 ? node.title : "",
        sceneNo: String(index + 1),
        status: "todo",
        summary: "从草稿目录生成，可补充摘要、目标、冲突、结果。",
        tags: depth > 0 ? ["子场景"] : ["章节"],
        createdAt,
        updatedAt: createdAt,
      }));
    if (generated.length === 0) {
      showStatus("草稿章节已全部生成过场景卡。");
      return;
    }
    setOutlineScenes((items) => [...generated, ...items]);
    showStatus(`已从草稿生成 ${generated.length} 张场景卡。`);
  }

  function updateAIService(kind: AIServiceKind, patch: Partial<AIServiceConfig>) {
    setAiSettings((current) => ({
      ...current,
      [kind]: normalizeAIServiceConfig({ ...current[kind], ...patch }, current[kind]),
    }));
  }

  function applyAIProviderPreset(kind: AIServiceKind, provider: AIProviderId) {
    const preset = AI_PROVIDER_PRESETS[provider];
    updateAIService(kind, {
      provider,
      baseUrl: kind === "reasoning" ? preset.chatBaseUrl : preset.imageBaseUrl,
      endpoint: kind === "reasoning" ? preset.chatEndpoint : preset.imageEndpoint,
      model: kind === "reasoning" ? preset.reasoningModel : preset.imageModel,
      imageSize: kind === "image" ? "1024x1024" : "",
    });
  }

  async function collectOutlineTextForAI() {
    await saveActiveDocument(false);
    if (!currentProject) throw new Error("请先打开项目。");
    const nodes = flattenNodes(binder.outline);
    const pieces: string[] = [];
    for (const { node, depth } of nodes) {
      let html = "";
      if (node.id === activeNodeId && activeCollection === "outline") {
        html = editor?.getHTML() ?? documentHtml;
      } else {
        try {
          html = await invoke<string>("read_binder_document", { path: currentProject.path, documentId: node.id });
        } catch {
          html = "";
        }
      }
      const text = stripHtmlToPlainText(html);
      if (text) pieces.push(`${"#".repeat(Math.min(depth + 1, 6))} ${node.title}\n${text}`);
    }
    if (pieces.length === 0 && activeCollection === "outline") {
      const text = stripHtmlToPlainText(editor?.getHTML() ?? documentHtml);
      if (text) pieces.push(text);
    }
    const outlineText = pieces.join("\n\n---\n\n").trim();
    if (!outlineText) throw new Error("大纲里还没有可分析的文字。请先在大纲模块写一些内容。");
    return outlineText;
  }

  function buildAIOutlineStructurePrompt(outlineText: string) {
    return `你是长篇小说结构编辑。请把下面“大纲文字”拆解为结构模块能使用的章节树与场景卡。\n\n操作规则：\n1. 只输出一个 JSON 对象，不要 Markdown，不要解释。\n2. JSON 顶层必须是 {"chapters": [...]}。\n3. 每个 chapter 可以有 title、summary、targetWords、children、scenes。\n4. children 表示树状子章节；如果大纲没有明确层级，也可以只给一级章节。\n5. 每个 scene 字段尽量包含：title、sceneNo、status、pov、location、timeline、characters、items、tags、goal、conflict、outcome、summary、notes、targetWords、currentWords。\n6. status 只能是 todo、draft、revising、done 之一；不知道就用 todo。\n7. characters、items、tags 必须是字符串数组。\n8. 不要编造过多细节；大纲没有明说时，允许写“待确认”或留空字符串。\n9. 目标 goal 写人物本场想要什么；冲突 conflict 写阻碍/代价；结果 outcome 写场景结束后局面变化。\n10. 场景必须归入最接近的章节。\n\n示例格式：\n{"chapters":[{"title":"第一章","summary":"","targetWords":3000,"scenes":[{"title":"开场","sceneNo":"1","status":"todo","pov":"","location":"","timeline":"","characters":[],"items":[],"tags":[],"goal":"","conflict":"","outcome":"","summary":"","notes":"","targetWords":1200,"currentWords":0}],"children":[]}]}\n\n大纲文字：\n${outlineText}`;
  }

  function normalizeAIStatus(value: unknown): OutlineSceneStatus {
    if (value === "draft" || value === "revising" || value === "done" || value === "todo") return value;
    const text = String(value ?? "");
    if (/完成|done/i.test(text)) return "done";
    if (/修订|修改|revise/i.test(text)) return "revising";
    if (/草稿|draft/i.test(text)) return "draft";
    return "todo";
  }

  function applyAIOutlineStructure(parsed: AIOutlineStructureResponse) {
    const chapters = Array.isArray(parsed.chapters) ? parsed.chapters : [];
    if (chapters.length === 0) throw new Error("AI 没有返回 chapters。请检查模型或提示词。 ");
    const createdAt = nowIso();
    const newChapters: StructureChapterRecord[] = [];
    const newScenes: OutlineSceneRecord[] = [];

    const createChapterTree = (items: AIOutlineStructureChapter[], parentId: string, depth: number) => {
      items.forEach((item, index) => {
        const title = typeof item.title === "string" && item.title.trim() ? item.title.trim() : `AI 章节 ${newChapters.length + 1}`;
        const chapter = normalizeStructureChapter({
          id: makeId("chapter-ai"),
          title,
          parentId,
          order: index,
          notes: typeof item.summary === "string" ? item.summary : "",
          targetWords: Number.isFinite(item.targetWords) ? Number(item.targetWords) : 0,
          collapsed: depth >= 2,
          createdAt,
          updatedAt: createdAt,
        }, index);
        newChapters.push(chapter);

        const scenes = Array.isArray(item.scenes) ? item.scenes : [];
        scenes.forEach((scene, sceneIndex) => {
          const sceneTitle = typeof scene.title === "string" && scene.title.trim() ? scene.title.trim() : `${title} · 场景 ${sceneIndex + 1}`;
          newScenes.push(createEmptyOutlineScene({
            id: makeId("scene-ai"),
            title: sceneTitle,
            chapterId: chapter.id,
            chapter: chapter.title,
            sceneNo: typeof scene.sceneNo === "string" && scene.sceneNo.trim() ? scene.sceneNo.trim() : String(sceneIndex + 1),
            status: normalizeAIStatus(scene.status),
            pov: typeof scene.pov === "string" ? scene.pov : "",
            location: typeof scene.location === "string" ? scene.location : "",
            timeline: typeof scene.timeline === "string" ? scene.timeline : "",
            characters: asStringList(scene.characters),
            items: asStringList(scene.items),
            tags: asStringList(scene.tags),
            goal: typeof scene.goal === "string" ? scene.goal : "",
            conflict: typeof scene.conflict === "string" ? scene.conflict : "",
            outcome: typeof scene.outcome === "string" ? scene.outcome : "",
            summary: typeof scene.summary === "string" ? scene.summary : "",
            notes: typeof scene.notes === "string" ? scene.notes : "AI 从大纲生成，请人工复核。",
            targetWords: Number.isFinite(scene.targetWords) ? Number(scene.targetWords) : 0,
            currentWords: Number.isFinite(scene.currentWords) ? Number(scene.currentWords) : 0,
            createdAt,
            updatedAt: createdAt,
          }));
        });

        if (Array.isArray(item.children) && item.children.length > 0) {
          createChapterTree(item.children, chapter.id, depth + 1);
        }
      });
    };

    createChapterTree(chapters, "", 0);
    if (newChapters.length === 0) throw new Error("AI 没有生成可用章节。 ");
    setStructureChapters((items) => [...items, ...newChapters]);
    if (newScenes.length > 0) setOutlineScenes((items) => [...newScenes, ...items]);
    setWorkspaceTab("structure");
    setSelectedStructureChapterId(newChapters[0]?.id ?? "");
    setSelectedStructureSceneId(newScenes[0]?.id ?? "");
    showStatus(`AI 已生成 ${newChapters.length} 个结构章节、${newScenes.length} 个场景。请进入结构模块复核。`);
  }

  async function generateStructureFromOutlineWithAI() {
    if (isBusy) return;
    const config = aiSettings.reasoning;
    if (!config.apiKey.trim()) {
      setPreferencesTab("ai");
      setModalMode("preferences");
      showStatus("请先在首选项 > AI 中填写推理 AI 的 API Key 和模型。 ");
      return;
    }
    if (!config.baseUrl.trim() || !config.endpoint.trim() || !config.model.trim()) {
      setPreferencesTab("ai");
      setModalMode("preferences");
      showStatus("请补全推理 AI 的 Base URL、Endpoint 和模型名。 ");
      return;
    }
    if ((structureChapters.length > 0 || outlineScenes.length > 0) && !window.confirm("AI 结果会追加到现有结构中，原有内容不会删除。继续？")) return;
    setIsBusy(true);
    try {
      const outlineText = await collectOutlineTextForAI();
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.apiKey.trim()}`,
        ...safeParseHeaderJson(config.extraHeaders),
      };
      const body = {
        model: config.model.trim(),
        messages: [
          { role: "system", content: "你是只输出 JSON 的小说结构分析器。你会严格按照用户要求生成可解析 JSON。" },
          { role: "user", content: buildAIOutlineStructurePrompt(outlineText) },
        ],
        temperature: config.temperature,
        max_tokens: config.maxTokens || undefined,
        response_format: { type: "json_object" },
      };
      const response = await fetch(joinApiUrl(config.baseUrl, config.endpoint), {
        method: "POST",
        headers,
        body: JSON.stringify(body),
      });
      const raw = await response.text();
      if (!response.ok) throw new Error(`AI 请求失败：${response.status} ${raw.slice(0, 300)}`);
      const data = JSON.parse(raw);
      const content = data?.choices?.[0]?.message?.content ?? data?.choices?.[0]?.text ?? raw;
      const parsed = parseJsonObjectFromText(String(content)) as AIOutlineStructureResponse;
      applyAIOutlineStructure(parsed);
    } catch (error) {
      showStatus(`AI 结构失败：${String(error)}`);
    } finally {
      setIsBusy(false);
    }
  }

  function filteredOutlineScenes() {
    const query = searchQuery.trim().toLowerCase();
    return outlineScenes.filter((scene) => {
      if (!query) return true;
      return [
        scene.title,
        scene.chapter,
        scene.sceneNo,
        scene.status,
        scene.pov,
        scene.location,
        scene.timeline,
        scene.goal,
        scene.conflict,
        scene.outcome,
        scene.summary,
        scene.notes,
        scene.characters.join(" "),
        scene.items.join(" "),
        scene.tags.join(" "),
      ].join(" ").toLowerCase().includes(query);
    });
  }

  function renderSceneCard(scene: OutlineSceneRecord) {
    const meta = OUTLINE_SCENE_STATUS_META[scene.status];
    return (
      <article key={scene.id} className="outline-scene-card">
        <button className="outline-scene-card__main" onClick={() => openEditOutlineSceneModal(scene)}>
          <div className="outline-scene-card__top">
            <span className={`scene-status scene-status--${meta.tone}`}>{meta.label}</span>
            <small>{scene.chapter || "未分章"}{scene.sceneNo ? ` · ${scene.sceneNo}` : ""}</small>
          </div>
          <h3>{scene.title}</h3>
          <p>{scene.summary || "还没有场景摘要。"}</p>
          <div className="scene-gco">
            <span><strong>目标</strong>{scene.goal || "待定"}</span>
            <span><strong>冲突</strong>{scene.conflict || "待定"}</span>
            <span><strong>结果</strong>{scene.outcome || "待定"}</span>
          </div>
          <div className="scene-meta-row">
            {scene.pov ? <span>视角：{scene.pov}</span> : null}
            {scene.location ? <span>地点：{scene.location}</span> : null}
            {scene.timeline ? <span>时间：{scene.timeline}</span> : null}
          </div>
          <div className="scene-tag-row">
            {[...scene.characters, ...scene.items, ...scene.tags].slice(0, 6).map((tag) => <span key={tag}>#{tag}</span>)}
          </div>
        </button>
        <div className="outline-scene-card__foot">
          <span>{scene.currentWords.toLocaleString("zh-CN")} / {scene.targetWords.toLocaleString("zh-CN")} 字</span>
          <button className="text-button" onClick={() => openEditOutlineSceneModal(scene)}>编辑</button>
        </div>
      </article>
    );
  }

  function renderOutlineBoard() {
    const draftNodes = flattenNodes(binder.draft);
    const outlineNodes = flattenNodes(binder.outline);
    const visibleScenes = filteredOutlineScenes();
    const targetWords = outlineScenes.reduce((sum, scene) => sum + scene.targetWords, 0);
    const currentWords = outlineScenes.reduce((sum, scene) => sum + scene.currentWords, 0);
    const doneCount = outlineScenes.filter((scene) => scene.status === "done").length;
    const completion = outlineScenes.length ? Math.round((doneCount / outlineScenes.length) * 100) : 0;
    const povCount = new Set(outlineScenes.map((scene) => scene.pov.trim()).filter(Boolean)).size;
    const locationCount = new Set(outlineScenes.map((scene) => scene.location.trim()).filter(Boolean)).size;
    const columns = OUTLINE_SCENE_STATUS_ORDER.map((status) => ({
      status,
      meta: OUTLINE_SCENE_STATUS_META[status],
      scenes: visibleScenes.filter((scene) => scene.status === status),
    }));

    return (
      <main className="outline-main">
        <div className="outline-hero">
          <div>
            <span className="eyebrow">YWRITE-STYLE OUTLINE</span>
            <h1>大纲 · 章节 / 场景工程</h1>
            <p>把大纲升级为章节、场景、视角、地点、目标、冲突、结果和备注的管理中心。</p>
          </div>
          <div className="header-actions">
            <button className="soft-button" onClick={buildOutlineScenesFromDraft}>从草稿生成场景卡</button>
            <button className="soft-button" onClick={() => openCreateNodeModal("outline", binder.outline.id)}>新建大纲文档</button>
            <button className="primary-button" onClick={() => openCreateOutlineSceneModal()}>＋ 新建场景卡</button>
          </div>
        </div>

        <section className="outline-stats" aria-label="大纲统计">
          <div><strong>{draftNodes.length}</strong><span>草稿章节</span></div>
          <div><strong>{outlineScenes.length}</strong><span>场景卡</span></div>
          <div><strong>{completion}%</strong><span>完成度</span></div>
          <div><strong>{currentWords.toLocaleString("zh-CN")}</strong><span>当前字数</span></div>
          <div><strong>{targetWords.toLocaleString("zh-CN")}</strong><span>目标字数</span></div>
          <div><strong>{povCount} / {locationCount}</strong><span>视角 / 地点</span></div>
        </section>

        <div className="outline-layout">
          <aside className="outline-navigator">
            <section className="outline-panel">
              <div className="outline-panel__head">
                <strong>{binder.draft.icon} 草稿章节</strong>
                <span>{draftNodes.length}</span>
              </div>
              <div className="outline-mini-list">
                {draftNodes.slice(0, 16).map(({ node, depth, collection }) => (
                  <button key={`${collection}-${node.id}`} onClick={() => void selectBinderNode(collection, node)}>
                    <span>{"—".repeat(depth)} {node.title}</span>
                    <small>{formatTime(node.updatedAt)}</small>
                  </button>
                ))}
                {draftNodes.length === 0 ? <p className="muted">暂无草稿章节。</p> : null}
              </div>
            </section>
            <section className="outline-panel">
              <div className="outline-panel__head">
                <strong>{binder.outline.icon} 大纲文档</strong>
                <span>{outlineNodes.length}</span>
              </div>
              <div className="outline-mini-list">
                {outlineNodes.slice(0, 16).map(({ node, depth, collection }) => (
                  <button key={`${collection}-${node.id}`} onClick={() => void selectBinderNode(collection, node)}>
                    <span>{"—".repeat(depth)} {node.title}</span>
                    <small>{formatTime(node.updatedAt)}</small>
                  </button>
                ))}
                {outlineNodes.length === 0 ? <p className="muted">暂无大纲文档。</p> : null}
              </div>
            </section>
          </aside>

          <section className="scene-board">
            <div className="scene-board__head">
              <div>
                <h2>场景看板</h2>
                <p>按状态推进场景，编辑卡片可维护视角、人物、地点、道具、目标/冲突/结果。</p>
              </div>
              <span>{visibleScenes.length} / {outlineScenes.length}</span>
            </div>
            <div className="scene-columns">
              {columns.map((column) => (
                <section key={column.status} className="scene-column">
                  <div className="scene-column__head">
                    <strong>{column.meta.label}</strong>
                    <span>{column.scenes.length}</span>
                  </div>
                  <div className="scene-column__body">
                    {column.scenes.map(renderSceneCard)}
                    {column.scenes.length === 0 ? <p className="muted">暂无{column.meta.label}场景。</p> : null}
                  </div>
                </section>
              ))}
            </div>
          </section>
        </div>
      </main>
    );
  }

  function renderStructureModule() {
    const chapters = getStructureChapterSummaries();
    const query = searchQuery.trim().toLowerCase();
    const selectedSummary = selectedStructureChapterId
      ? chapters.find((chapter) => chapter.id === selectedStructureChapterId) ?? chapters[0] ?? null
      : chapters[0] ?? null;
    const selectedChapterId = selectedSummary?.id ?? "";
    const selectedChapterTitle = selectedSummary?.title ?? "";
    const visibleScenes = filteredOutlineScenes().filter((scene) => {
      const chapterId = resolveSceneChapterId(scene);
      if (selectedChapterId && chapterId !== selectedChapterId) return false;
      if (!query) return true;
      return [scene.title, scene.summary, scene.pov, scene.location, scene.timeline, scene.goal, scene.conflict, scene.outcome, scene.characters.join(" "), scene.items.join(" "), scene.tags.join(" ")]
        .join(" ")
        .toLowerCase()
        .includes(query);
    });
    const selectedScene = visibleScenes.find((scene) => scene.id === selectedStructureSceneId) ?? visibleScenes[0] ?? null;
    const totalWords = visibleScenes.reduce((sum, scene) => sum + scene.currentWords, 0);
    const targetWords = selectedSummary?.targetWords || visibleScenes.reduce((sum, scene) => sum + scene.targetWords, 0);
    const chapterCount = structureChapters.length;
    const sceneNo = String(visibleScenes.length + 1);
    const detailTabs: Array<{ id: StructureDetailTab; label: string }> = [
      { id: "content", label: "内容" },
      { id: "description", label: "描述" },
      { id: "characters", label: "人物" },
      { id: "locations", label: "地点" },
      { id: "items", label: "物品" },
      { id: "goals", label: "目标" },
      { id: "notes", label: "备注" },
    ];

    const renderDetail = () => {
      if (!selectedScene) {
        return (
          <div className="structure-empty-detail">
            <h3>{selectedChapterId ? "还没有场景" : "还没有结构章节"}</h3>
            <p>{selectedChapterId ? "先为当前章节添加一个场景，再补充内容、人物、地点、物品和目标。" : "结构章节需要手动创建，也可以在大纲里点击“解构大纲”生成初稿。"}</p>
            {selectedChapterId ? (
              <button className="primary-button" onClick={() => openCreateOutlineSceneModal({ chapterId: selectedChapterId, chapter: selectedChapterTitle, sceneNo })}>新建场景</button>
            ) : (
              <button className="primary-button" onClick={() => openCreateStructureChapterModal()}>新建章节</button>
            )}
          </div>
        );
      }

      if (structureDetailTab === "content") {
        return <div className="structure-detail-copy"><p>{selectedScene.summary || "这里显示场景正文摘要。点击上方“编辑场景”可以填写完整内容。"}</p></div>;
      }
      if (structureDetailTab === "description") {
        return <div className="structure-detail-copy"><p>{selectedScene.timeline ? `时间：${selectedScene.timeline}` : "时间未填写。"}</p><p>{selectedScene.pov ? `视角：${selectedScene.pov}` : "视角人物未填写。"}</p><p>{selectedScene.location ? `地点：${selectedScene.location}` : "地点未填写。"}</p></div>;
      }
      if (structureDetailTab === "characters") {
        return <div className="structure-chip-cloud">{selectedScene.characters.length ? selectedScene.characters.map((item) => <span key={item}>{item}</span>) : <p>未添加出场人物。</p>}</div>;
      }
      if (structureDetailTab === "locations") {
        return <div className="structure-chip-cloud">{selectedScene.location ? <span>{selectedScene.location}</span> : <p>未设置地点。</p>}</div>;
      }
      if (structureDetailTab === "items") {
        return <div className="structure-chip-cloud">{selectedScene.items.length ? selectedScene.items.map((item) => <span key={item}>{item}</span>) : <p>未添加物品、线索或道具。</p>}</div>;
      }
      if (structureDetailTab === "goals") {
        return (
          <div className="structure-goal-grid">
            <section><strong>目标</strong><p>{selectedScene.goal || "待填写"}</p></section>
            <section><strong>冲突</strong><p>{selectedScene.conflict || "待填写"}</p></section>
            <section><strong>结果</strong><p>{selectedScene.outcome || "待填写"}</p></section>
          </div>
        );
      }
      return <div className="structure-detail-copy"><p>{selectedScene.notes || "暂无备注。"}</p></div>;
    };

    return (
      <main className="structure-main">
        <header className="structure-topbar">
          <div>
            <span className="eyebrow">STRUCTURE</span>
            <h1>结构模块</h1>
            <p>手动维护章节树与场景卡；这里不自动关联大纲文档，大纲只作为 AI 分析来源。</p>
          </div>
          <div className="header-actions">
            <button className="soft-button" onClick={() => openCreateStructureChapterModal()}>新建章节</button>
            <button className="soft-button" disabled={!selectedChapterId} onClick={() => openCreateStructureChapterModal(selectedChapterId)}>新建子章节</button>
            <button className="primary-button" disabled={!selectedChapterId} onClick={() => openCreateOutlineSceneModal({ chapterId: selectedChapterId, chapter: selectedChapterTitle, sceneNo })}>＋ 新建场景</button>
          </div>
        </header>

        <section className="structure-summary" aria-label="结构统计">
          <div><strong>{chapterCount}</strong><span>手动章节</span></div>
          <div><strong>{outlineScenes.length}</strong><span>场景</span></div>
          <div><strong>{totalWords.toLocaleString("zh-CN")}</strong><span>当前章节字数</span></div>
          <div><strong>{targetWords.toLocaleString("zh-CN")}</strong><span>目标字数</span></div>
        </section>

        <section className="structure-workbench">
          <aside className="structure-chapters-panel">
            <div className="structure-panel-head">
              <strong>章节树</strong>
              <span>Manual · {chapters.length}</span>
            </div>
            <div className="structure-chapter-list structure-chapter-tree">
              {chapters.map((chapter) => (
                <div key={chapter.id} className={`structure-chapter-row-wrap ${selectedChapterId === chapter.id ? "active" : ""}`.trim()}>
                  <button
                    className={`structure-chapter-row ${selectedChapterId === chapter.id ? "active" : ""}`.trim()}
                    style={{ paddingLeft: 14 + chapter.depth * 18 }}
                    onClick={() => {
                      setSelectedStructureChapterId(chapter.id);
                      setSelectedStructureSceneId("");
                    }}
                    onDoubleClick={() => openEditStructureChapterModal(chapter)}
                  >
                    <span className="structure-tree-glyph">{chapter.hasChildren ? (chapter.collapsed ? "›" : "⌄") : "·"}</span>
                    <span className="structure-chapter-main">
                      <strong>{chapter.title}</strong>
                      <small>{chapter.sceneCount} 场 · {chapter.words.toLocaleString("zh-CN")} 字{chapter.targetWords ? ` / ${chapter.targetWords.toLocaleString("zh-CN")}` : ""}</small>
                    </span>
                  </button>
                  <div className="structure-chapter-actions">
                    {chapter.hasChildren ? <button onClick={() => toggleStructureChapterCollapsed(chapter.id)} title={chapter.collapsed ? "展开" : "折叠"}>{chapter.collapsed ? "›" : "⌄"}</button> : null}
                    <button onClick={() => openCreateStructureChapterModal(chapter.id)} title="新建子章节">＋</button>
                    <button onClick={() => openEditStructureChapterModal(chapter)} title="编辑章节"><LineIcon name="more" size={15} /></button>
                    <button onClick={() => deleteStructureChapter(chapter.id)} title="移入回收站"><LineIcon name="trash" size={14} /></button>
                  </div>
                </div>
              ))}
              {chapters.length === 0 ? <div className="structure-empty-list"><p>暂无章节。点击“新建章节”手动创建；或在大纲模块点击“解构大纲”生成初稿。</p><button className="soft-button" onClick={() => openCreateStructureChapterModal()}>新建章节</button></div> : null}
            </div>
          </aside>

          <section className="structure-scenes-panel">
            <div className="structure-panel-head">
              <strong>{selectedChapterTitle || "未选择章节"} · 场景</strong>
              <span>Words: {totalWords.toLocaleString("zh-CN")}</span>
            </div>
            <div className="structure-table" role="table" aria-label="场景列表">
              <div className="structure-table-row structure-table-head" role="row">
                <span>标题</span><span>字数</span><span>状态</span><span>POV</span><span>地点</span>
              </div>
              {visibleScenes.map((scene) => {
                const meta = OUTLINE_SCENE_STATUS_META[scene.status];
                return (
                  <button
                    key={scene.id}
                    className={`structure-table-row ${selectedScene?.id === scene.id ? "active" : ""}`.trim()}
                    onClick={() => setSelectedStructureSceneId(scene.id)}
                    onDoubleClick={() => openEditOutlineSceneModal(scene)}
                    role="row"
                  >
                    <span>{scene.title}</span>
                    <span>{scene.currentWords.toLocaleString("zh-CN")}</span>
                    <span><em className={`scene-status scene-status--${meta.tone}`}>{meta.label}</em></span>
                    <span>{scene.pov || "—"}</span>
                    <span>{scene.location || "—"}</span>
                  </button>
                );
              })}
              {visibleScenes.length === 0 ? <div className="structure-table-empty">当前章节还没有场景。</div> : null}
            </div>

            <div className="structure-detail-panel">
              <nav className="structure-tabs" aria-label="场景详情">
                {detailTabs.map((tab) => (
                  <button key={tab.id} className={structureDetailTab === tab.id ? "active" : ""} onClick={() => setStructureDetailTab(tab.id)}>{tab.label}</button>
                ))}
                <div className="structure-detail-actions">
                  {selectedScene ? <button className="soft-button" onClick={() => openEditOutlineSceneModal(selectedScene)}>编辑场景</button> : null}
                </div>
              </nav>
              <div className="structure-detail-body">{renderDetail()}</div>
            </div>
          </section>
        </section>
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
      <div className={`app-frame writer-frame ${immersiveMode ? "immersive-mode" : ""}`.trim()}>
        {renderTitlebar()}
        <div className="workspace-shell">
          {renderSidebar()}
          {renderEditorView(!(workspaceTab === "write" || workspaceTab === "outline"))}
          {workspaceTab === "structure" ? renderStructureModule() : null}
          {workspaceTab === "characters" ? renderResourceView("characters") : null}
          {workspaceTab === "lore" ? renderResourceView("lore") : null}
          {workspaceTab === "timeline" ? renderResourceView("timeline") : null}
          {workspaceTab === "ideas" ? renderResourceView("ideas") : null}
        </div>
        {statusMessage ? <div className="toast">{statusMessage}</div> : null}
        {renderTrashDialog()}
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
        {renderTrashDialog()}
        {renderModal()}
      </div>
    );
  }

  function renderIconPicker() {
    return (
      <div className="icon-picker" aria-label="选择标题图标">
        {BINDER_ICON_GROUPS.map((group) => (
          <div className="icon-picker__group" key={group.label}>
            <strong>{group.label}</strong>
            <div className="icon-picker__grid">
              {group.icons.map((icon) => (
                <button
                  type="button"
                  key={`${group.label}-${icon}`}
                  className={nodeIconInput === icon ? "active" : ""}
                  onClick={() => setNodeIconInput(icon)}
                  title={`使用图标 ${icon}`}
                  aria-label={`使用图标 ${icon}`}
                >
                  {icon}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  }

  function renderStructureChapterModal() {
    if (!structureChapterDraft) return null;
    const isEditing = modalMode === "editStructureChapter";
    const blockedIds = isEditing ? new Set([structureChapterDraft.id, ...getStructureDescendantIds(structureChapterDraft.id)]) : new Set<string>();
    const parentOptions = structureChapterOptions().filter((chapter) => !blockedIds.has(chapter.id));
    return (
      <>
        <div className="modal-head">
          <h2>{isEditing ? "编辑结构章节" : "新建结构章节"}</h2>
          <button onClick={closeModal}>×</button>
        </div>
        <label className="field-label">章节标题</label>
        <input
          className="input"
          value={structureChapterDraft.title}
          onChange={(event) => setStructureChapterDraft({ ...structureChapterDraft, title: event.currentTarget.value })}
          placeholder="例如：第一章 破庙避雨"
          autoFocus
        />
        <div className="form-grid two">
          <div>
            <label className="field-label">父章节</label>
            <select className="input" value={structureChapterDraft.parentId} onChange={(event) => setStructureChapterDraft({ ...structureChapterDraft, parentId: event.currentTarget.value })}>
              <option value="">顶级章节</option>
              {parentOptions.map((chapter) => (
                <option key={chapter.id} value={chapter.id}>{`${"　".repeat(chapter.depth)}${chapter.title}`}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="field-label">目标字数</label>
            <input className="input" type="number" min="0" value={structureChapterDraft.targetWords} onChange={(event) => setStructureChapterDraft({ ...structureChapterDraft, targetWords: Math.max(0, Number(event.currentTarget.value) || 0) })} />
          </div>
        </div>
        <label className="field-label">章节备注</label>
        <textarea className="textarea" value={structureChapterDraft.notes} onChange={(event) => setStructureChapterDraft({ ...structureChapterDraft, notes: event.currentTarget.value })} placeholder="章节目标、节奏、伏笔、转折、待补充内容……" />
        <div className="modal-actions">
          {isEditing ? <button className="text-button danger-text" onClick={() => deleteStructureChapter(structureChapterDraft.id)}>删除章节</button> : <div />}
          <button className="soft-button" onClick={closeModal}>取消</button>
          <button className="primary-button" onClick={saveStructureChapterDraft}>保存</button>
        </div>
      </>
    );
  }

  function renderOutlineSceneModal() {
    if (!outlineSceneDraft) return null;
    const isEditing = modalMode === "editOutlineScene";
    return (
      <>
        <div className="modal-head">
          <h2>{isEditing ? "编辑场景卡" : "新建场景卡"}</h2>
          <button onClick={closeModal}>×</button>
        </div>
        <label className="field-label">场景标题</label>
        <input
          className="input"
          value={outlineSceneDraft.title}
          onChange={(event) => setOutlineSceneDraft({ ...outlineSceneDraft, title: event.currentTarget.value })}
          placeholder="例如：主角第一次进入旧城"
          autoFocus
        />
        <div className="form-grid two">
          <div>
            <label className="field-label">所属结构章节</label>
            <select
              className="input"
              value={outlineSceneDraft.chapterId || ""}
              onChange={(event) => {
                const chapter = structureChapterById(event.currentTarget.value);
                setOutlineSceneDraft({ ...outlineSceneDraft, chapterId: chapter?.id || "", chapter: chapter?.title || "" });
              }}
            >
              <option value="">不选择章节</option>
              {structureChapterOptions().map((chapter) => (
                <option key={chapter.id} value={chapter.id}>{`${"　".repeat(chapter.depth)}${chapter.title}`}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="field-label">场景序号</label>
            <input className="input" value={outlineSceneDraft.sceneNo} onChange={(event) => setOutlineSceneDraft({ ...outlineSceneDraft, sceneNo: event.currentTarget.value })} placeholder="1" />
          </div>
        </div>
        <div className="form-grid two">
          <div>
            <label className="field-label">状态</label>
            <select className="input" value={outlineSceneDraft.status} onChange={(event) => setOutlineSceneDraft({ ...outlineSceneDraft, status: event.currentTarget.value as OutlineSceneStatus })}>
              {OUTLINE_SCENE_STATUS_ORDER.map((status) => <option key={status} value={status}>{OUTLINE_SCENE_STATUS_META[status].label}</option>)}
            </select>
          </div>
          <div>
            <label className="field-label">视角人物</label>
            <input className="input" value={outlineSceneDraft.pov} onChange={(event) => setOutlineSceneDraft({ ...outlineSceneDraft, pov: event.currentTarget.value })} placeholder="POV / 叙述视角" />
          </div>
        </div>
        <div className="form-grid two">
          <div>
            <label className="field-label">地点</label>
            <input className="input" value={outlineSceneDraft.location} onChange={(event) => setOutlineSceneDraft({ ...outlineSceneDraft, location: event.currentTarget.value })} placeholder="场景地点" />
          </div>
          <div>
            <label className="field-label">时间点</label>
            <input className="input" value={outlineSceneDraft.timeline} onChange={(event) => setOutlineSceneDraft({ ...outlineSceneDraft, timeline: event.currentTarget.value })} placeholder="第 3 天夜 / 故事前史" />
          </div>
        </div>
        <label className="field-label">场景摘要</label>
        <textarea className="textarea" value={outlineSceneDraft.summary} onChange={(event) => setOutlineSceneDraft({ ...outlineSceneDraft, summary: event.currentTarget.value })} placeholder="这一场发生了什么，为什么必须存在？" />
        <div className="outline-gco-fields">
          <label>
            <span className="field-label">目标 Goal</span>
            <textarea className="textarea" value={outlineSceneDraft.goal} onChange={(event) => setOutlineSceneDraft({ ...outlineSceneDraft, goal: event.currentTarget.value })} placeholder="人物在这一场想得到什么？" />
          </label>
          <label>
            <span className="field-label">冲突 Conflict</span>
            <textarea className="textarea" value={outlineSceneDraft.conflict} onChange={(event) => setOutlineSceneDraft({ ...outlineSceneDraft, conflict: event.currentTarget.value })} placeholder="谁阻止了他？代价是什么？" />
          </label>
          <label>
            <span className="field-label">结果 Outcome</span>
            <textarea className="textarea" value={outlineSceneDraft.outcome} onChange={(event) => setOutlineSceneDraft({ ...outlineSceneDraft, outcome: event.currentTarget.value })} placeholder="场景结束后局面如何变化？" />
          </label>
        </div>
        <div className="form-grid two">
          <div>
            <label className="field-label">出场人物，逗号分隔</label>
            <input className="input" value={listToText(outlineSceneDraft.characters)} onChange={(event) => setOutlineSceneDraft({ ...outlineSceneDraft, characters: textToList(event.currentTarget.value) })} placeholder="主角，反派，证人" />
          </div>
          <div>
            <label className="field-label">地点/道具/线索，逗号分隔</label>
            <input className="input" value={listToText(outlineSceneDraft.items)} onChange={(event) => setOutlineSceneDraft({ ...outlineSceneDraft, items: textToList(event.currentTarget.value) })} placeholder="旧地图，密信，地下室" />
          </div>
        </div>
        <label className="field-label">标签，逗号分隔</label>
        <input className="input" value={listToText(outlineSceneDraft.tags)} onChange={(event) => setOutlineSceneDraft({ ...outlineSceneDraft, tags: textToList(event.currentTarget.value) })} placeholder="伏笔，反转，感情线" />
        <div className="form-grid two">
          <div>
            <label className="field-label">当前字数</label>
            <input className="input" type="number" min="0" value={outlineSceneDraft.currentWords} onChange={(event) => setOutlineSceneDraft({ ...outlineSceneDraft, currentWords: Math.max(0, Number(event.currentTarget.value) || 0) })} />
          </div>
          <div>
            <label className="field-label">目标字数</label>
            <input className="input" type="number" min="0" value={outlineSceneDraft.targetWords} onChange={(event) => setOutlineSceneDraft({ ...outlineSceneDraft, targetWords: Math.max(0, Number(event.currentTarget.value) || 0) })} />
          </div>
        </div>
        <label className="field-label">备注 / 待办</label>
        <textarea className="textarea" value={outlineSceneDraft.notes} onChange={(event) => setOutlineSceneDraft({ ...outlineSceneDraft, notes: event.currentTarget.value })} placeholder="伏笔回收、待查资料、连续性提醒……" />
        <div className="modal-actions">
          {isEditing ? <button className="text-button danger-text" onClick={() => deleteOutlineScene(outlineSceneDraft)}>删除</button> : <div />}
          <button className="soft-button" onClick={closeModal}>取消</button>
          <button className="primary-button" onClick={saveOutlineSceneDraft}>保存</button>
        </div>
      </>
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

  function renderAISettingsPanel() {
    const tabs: Array<{ id: AIServiceKind; label: string; desc: string }> = [
      { id: "reasoning", label: "推理 AI", desc: "大纲分析与结构 JSON" },
      { id: "image", label: "图片生成 AI", desc: "封面、人物图与场景图" },
    ];
    const kind = aiPreferencesKind;
    const config = aiSettings[kind];
    const preset = AI_PROVIDER_PRESETS[config.provider];
    return (
      <div className="prefs-panel ai-prefs-panel">
        <div className="ai-prefs-head">
          <div>
            <h3>AI</h3>
            <p className="muted">配置两个独立 AI：推理 AI 用于“大纲 → 解构大纲”；图片生成 AI 预留给后续封面、人物卡和场景图功能。</p>
          </div>
        </div>

        <div className="ai-horizontal-tabs" role="tablist" aria-label="AI 设置类型">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={kind === tab.id}
              className={kind === tab.id ? "active" : ""}
              onClick={() => setAiPreferencesKind(tab.id)}
            >
              <strong>{tab.label}</strong>
              <span>{tab.desc}</span>
            </button>
          ))}
        </div>

        <section className="ai-config-card ai-config-card--single">
          <div className="ai-config-card__head">
            <div>
              <strong>{kind === "reasoning" ? "推理 AI" : "图片生成 AI"}</strong>
              <span>{kind === "reasoning" ? "用于分析大纲、生成结构 JSON" : "用于后续图片生成工作流"}</span>
            </div>
          </div>
          <div className="form-grid two">
            <label>
              <span className="field-label">服务商</span>
              <select className="input" value={config.provider} onChange={(event) => applyAIProviderPreset(kind, event.currentTarget.value as AIProviderId)}>
                {(Object.keys(AI_PROVIDER_PRESETS) as AIProviderId[]).map((provider) => <option key={provider} value={provider}>{AI_PROVIDER_PRESETS[provider].label}</option>)}
              </select>
            </label>
            <label>
              <span className="field-label">模型名</span>
              <input className="input" value={config.model} onChange={(event) => updateAIService(kind, { model: event.currentTarget.value })} placeholder={kind === "reasoning" ? "Qwen/Qwen3-32B" : "black-forest-labs/FLUX.1-schnell"} />
            </label>
          </div>
          <label className="field-label">API Key</label>
          <input className="input" type="password" value={config.apiKey} onChange={(event) => updateAIService(kind, { apiKey: event.currentTarget.value })} placeholder="sk-... / Bearer Token" />
          <div className="form-grid two">
            <label>
              <span className="field-label">Base URL</span>
              <input className="input" value={config.baseUrl} onChange={(event) => updateAIService(kind, { baseUrl: event.currentTarget.value })} placeholder={kind === "reasoning" ? preset.chatBaseUrl : preset.imageBaseUrl} />
            </label>
            <label>
              <span className="field-label">Endpoint</span>
              <input className="input" value={config.endpoint} onChange={(event) => updateAIService(kind, { endpoint: event.currentTarget.value })} placeholder={kind === "reasoning" ? preset.chatEndpoint : preset.imageEndpoint} />
            </label>
          </div>
          <div className="form-grid two">
            <label>
              <span className="field-label">Temperature</span>
              <input className="input" type="number" step="0.1" min="0" max="2" value={config.temperature} onChange={(event) => updateAIService(kind, { temperature: clampNumber(Number(event.currentTarget.value) || 0, 0, 2) })} />
            </label>
            <label>
              <span className="field-label">{kind === "reasoning" ? "Max Tokens" : "图片尺寸"}</span>
              {kind === "reasoning" ? (
                <input className="input" type="number" min="0" value={config.maxTokens} onChange={(event) => updateAIService(kind, { maxTokens: Math.max(0, Number(event.currentTarget.value) || 0) })} />
              ) : (
                <input className="input" value={config.imageSize} onChange={(event) => updateAIService(kind, { imageSize: event.currentTarget.value })} placeholder="1024x1024" />
              )}
            </label>
          </div>
          <label className="field-label">额外请求头 JSON</label>
          <textarea className="textarea ai-headers-textarea" value={config.extraHeaders} onChange={(event) => updateAIService(kind, { extraHeaders: event.currentTarget.value })} placeholder={config.provider === "openrouter" ? '{"HTTP-Referer":"https://your.app","X-Title":"MasterPieces"}' : "可留空"} />
          <p className="muted ai-config-hint">{preset.hint}</p>
        </section>

        <div className="ai-help-box">
          <strong>A.I 结构如何工作</strong>
          <p>点击大纲工具栏的“解构大纲”后，程序会读取大纲模块中的文字，要求推理 AI 只返回 JSON：章节树、场景、人物、地点、物品、Goal / Conflict / Outcome、备注和字数。返回结果会追加到结构模块，便于你人工复核和继续调整。</p>
        </div>
      </div>
    );
  }

  function renderModal() {
    if (!modalMode) return null;
    const allToolbarItems = toolbarItems();
    const uiFontOptions = uiFontFamily !== UI_SYSTEM_FONT_VALUE && !systemFonts.includes(uiFontFamily)
      ? [uiFontFamily, ...systemFonts]
      : systemFonts;
    const activeTheme = APP_THEMES.find((theme) => theme.id === appTheme) ?? APP_THEMES[0];
    return (
      <div className="modal-backdrop" onClick={closeModal}>
        <div className="modal" onClick={(event) => event.stopPropagation()}>
          {modalMode === "createProject" ? (
            <>
              <div className="modal-head"><h2>创建项目</h2><button onClick={closeModal}>×</button></div>
              <label className="field-label">项目名称</label>
              <input className="input" value={projectNameInput} onChange={(event) => setProjectNameInput(event.currentTarget.value)} placeholder="我的小说" autoFocus />
              <label className="field-label">存档文件夹</label>
              <div className="input-row"><input className="input" value={pathInput} onChange={(event) => setPathInput(event.currentTarget.value)} placeholder="选择或输入存档文件夹路径" /><button className="soft-button" onClick={() => void chooseFolderForInput("create")}>选择…</button></div>
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
              {renderIconPicker()}
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
              {renderIconPicker()}
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
    <div className="prefs-switch">
      <button
        type="button"
        className={`prefs-card ${preferencesTab === "general" ? "active" : ""}`.trim()}
        onClick={() => { setPreferencesTab("general"); setGeneralPreferencesSection("typography"); }}
      >
        <strong>通用</strong>
        <span>界面文字与显示</span>
      </button>
      <button
        type="button"
        className={`prefs-card ${preferencesTab === "editor" ? "active" : ""}`.trim()}
        onClick={() => { setPreferencesTab("editor"); setEditorPreferencesSection("overview"); }}
      >
        <strong>编辑</strong>
        <span>主工具栏、当前文档格式、状态</span>
      </button>
      <button
        type="button"
        className={`prefs-card ${preferencesTab === "ai" ? "active" : ""}`.trim()}
        onClick={() => setPreferencesTab("ai")}
      >
        <strong>AI</strong>
        <span>推理与图片生成模型</span>
      </button>
      <button
        type="button"
        className={`prefs-card ${preferencesTab === "export" ? "active" : ""}`.trim()}
        onClick={() => setPreferencesTab("export")}
      >
        <strong>导出</strong>
        <span>导出 Markdown 压缩包</span>
      </button>
    </div>

    {preferencesTab === "general" ? (
      <div className="prefs-panel general-prefs-panel">
        <h3>通用</h3>
        <p className="muted">通用设置拆分为界面文字与主题。主题切换会立即应用到整个界面。</p>
        <div className="prefs-subcard-row">
          <button
            type="button"
            className={`prefs-subcard ${generalPreferencesSection === "typography" ? "active" : ""}`.trim()}
            onClick={() => setGeneralPreferencesSection("typography")}
          >
            <strong>界面文字</strong>
            <span>字体调用系统字体，默认使用系统默认字体</span>
          </button>
          <button
            type="button"
            className={`prefs-subcard ${generalPreferencesSection === "theme" ? "active" : ""}`.trim()}
            onClick={() => setGeneralPreferencesSection("theme")}
          >
            <strong>主题</strong>
            <span>暖日与幽橙两套外观</span>
          </button>
        </div>

        {generalPreferencesSection === "typography" ? (
          <div className="general-subpanel">
            <div className="prefs-section-head">
              <h4>界面文字</h4>
            </div>
            <p className="muted">统一调整整个界面的文字字体和大小。字体列表来自系统字体；默认使用系统默认字体。</p>
            <div className="prefs-field-grid">
              <label>
                <span className="field-label">界面文字字体</span>
                <select className="input" value={uiFontFamily} onChange={(event) => setUiFontFamily(event.currentTarget.value)}>
                  <option value={UI_SYSTEM_FONT_VALUE}>系统默认字体</option>
                  {uiFontOptions.map((font) => (
                    <option key={font} value={font}>{font}</option>
                  ))}
                </select>
              </label>
              <label>
                <span className="field-label">界面文字大小</span>
                <input
                  className="input"
                  value={uiFontSize}
                  onChange={(event) => setUiFontSize(event.currentTarget.value)}
                  onBlur={(event) => setUiFontSize(normalizeCssSize(event.currentTarget.value, "14px"))}
                  placeholder="14px"
                />
              </label>
            </div>
          </div>
        ) : null}

        {generalPreferencesSection === "theme" ? (
          <div className="general-subpanel theme-subpanel">
            <div className="prefs-section-head">
              <h4>主题</h4>
            </div>
            <p className="muted">选择不同外观后立即改变界面颜色；暖日是当前默认外观，幽橙是深色外观。</p>
            <div className="prefs-field-grid prefs-field-grid--single">
              <label>
                <span className="field-label">外观</span>
                <select className="input" value={appTheme} onChange={(event) => setAppTheme(event.currentTarget.value as AppThemeId)}>
                  {APP_THEMES.map((theme) => (
                    <option key={theme.id} value={theme.id}>{theme.label}</option>
                  ))}
                </select>
              </label>
            </div>
            <div className={`theme-preview theme-preview--${appTheme}`}>
              <div className="theme-preview__window">
                <span />
                <span />
                <span />
              </div>
              <div>
                <strong>{activeTheme.label}</strong>
                <p>{activeTheme.hint}</p>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    ) : preferencesTab === "editor" ? (
      <div className="prefs-panel editor-prefs-panel">
        {editorPreferencesSection === "overview" ? (
          <>
            <h3>编辑</h3>
            <p className="muted">编辑设置拆分为独立卡片。点击卡片进入对应设置。</p>
            <div className="prefs-subcard-row">
              <button
                type="button"
                className="prefs-subcard"
                onClick={() => setEditorPreferencesSection("toolbar")}
              >
                <strong>主工具栏</strong>
                <span>字体、缩进、字号、行高与编辑按钮</span>
              </button>
              <button
                type="button"
                className="prefs-subcard"
                onClick={() => setEditorPreferencesSection("status")}
              >
                <strong>状态</strong>
                <span>配置文档菜单中的状态与颜色</span>
              </button>
            </div>
          </>
        ) : null}

        {editorPreferencesSection === "toolbar" ? (
          <div className="toolbar-pref-card">
            <div className="prefs-section-head">
              <button className="text-button" onClick={() => setEditorPreferencesSection("overview")}>‹ 返回编辑</button>
              <h4>主工具栏</h4>
            </div>
            <p className="muted">字体、首行缩进、字号、行高固定排在工具栏最前面。字体和字号作用于选中的文字；未选中文字时，会影响之后输入的文字。未勾选的按钮会进入“…”菜单。</p>
            <div className="check-grid">
              {allToolbarItems.map((item) => (
                <label key={item.id}>
                  <input type="checkbox" checked={visibleToolbarIds.includes(item.id)} onChange={() => toggleToolbarPreference(item.id)} />
                  <span>{item.icon}</span>
                  <strong>{item.title}</strong>
                </label>
              ))}
            </div>
          </div>
        ) : null}

        {editorPreferencesSection === "status" ? (
          <div className="status-pref-card">
            <div className="prefs-section-head">
              <button className="text-button" onClick={() => setEditorPreferencesSection("overview")}>‹ 返回编辑</button>
              <h4>状态</h4>
            </div>
            <p className="muted">这些状态会出现在文档“…”菜单的“状态”里，选择后会在文档名旁显示同色标记。</p>
            <div className="status-editor-list">
              {textStatuses.map((status, index) => (
                <div className="status-editor-row" key={status.id}>
                  <span className="status-order">{index + 1}</span>
                  <input
                    className="input"
                    value={status.label}
                    onChange={(event) => updateTextStatus(status.id, { label: event.currentTarget.value })}
                    placeholder="状态"
                  />
                  <input
                    className="status-color-input"
                    type="color"
                    value={status.color}
                    onChange={(event) => updateTextStatus(status.id, { color: event.currentTarget.value })}
                    aria-label={`${status.label} 颜色`}
                  />
                  <button className="text-button danger-text" onClick={() => removeTextStatus(status.id)} disabled={textStatuses.length <= 1}>删除</button>
                </div>
              ))}
            </div>
            <div className="card-actions">
              <button className="soft-button" onClick={addTextStatus}>添加状态</button>
              <button className="soft-button" onClick={resetTextStatuses}>恢复默认状态</button>
            </div>
          </div>
        ) : null}
      </div>
    ) : preferencesTab === "ai" ? (
      renderAISettingsPanel()
    ) : (
      <div className="prefs-panel export-panel">
        <h3>导出</h3>
        <p className="muted">将当前项目整理成 Markdown 文件夹，并自动压缩到桌面。</p>
        <div className="export-option-card">
          <div>
            <strong>Markdown 项目压缩包</strong>
            <p>包含项目文件、大纲、结构、人物、设定、时间线、灵感等文件夹；结构会导出章节树和场景卡中的文本信息。</p>
          </div>
          <button className="primary-button" onClick={() => void exportProjectMarkdown()} disabled={isBusy || !currentProject}>
            {isBusy ? "导出中…" : "导出到桌面"}
          </button>
        </div>
        <p className="muted export-note">导出前会先保存当前打开的文稿。生成的压缩包名称会带项目名和时间戳。</p>
      </div>
    )}

    <div className="modal-actions">
      <div className="prefs-footer-spacer" />
      {preferencesTab === "editor" && editorPreferencesSection === "toolbar" ? (
        <button className="soft-button" onClick={() => setVisibleToolbarIds(DEFAULT_VISIBLE_TOOLBAR_IDS)}>恢复默认工具栏</button>
      ) : null}
      <button className="primary-button" onClick={closeModal}>完成</button>
    </div>
  </>
) : null}

          {modalMode === "createStructureChapter" || modalMode === "editStructureChapter" ? renderStructureChapterModal() : null}

          {modalMode === "createOutlineScene" || modalMode === "editOutlineScene" ? renderOutlineSceneModal() : null}

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

export default function App() {
  return (
    <AppErrorBoundary>
      <MasterPiecesApp />
    </AppErrorBoundary>
  );
}

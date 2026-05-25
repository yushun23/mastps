import { useEffect, useMemo, useRef, useState } from "react";
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

type DocumentRecord = {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
};

type View = "splash" | "projects" | "hub" | "outline" | "writer" | "outlineWriter";

type WorkspaceMode = "manuscript" | "outline";

type ModalMode =
  | "create"
  | "import"
  | "rename"
  | "relocate"
  | "actions"
  | "createDocument"
  | "renameDocument"
  | "insertLink"
  | "insertImage"
  | "preferences"
  | null;

type ToolbarGroup = "history" | "format" | "inline" | "align" | "list" | "insert" | "table";

type ToolbarItemId =
  | "undo"
  | "redo"
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
  | "alignLeft"
  | "alignCenter"
  | "alignRight"
  | "alignJustify"
  | "bulletList"
  | "orderedList"
  | "taskList"
  | "blockquote"
  | "codeBlock"
  | "horizontalRule"
  | "link"
  | "image"
  | "table"
  | "addRow"
  | "addColumn"
  | "mergeCells"
  | "splitCell"
  | "deleteTable";

type ToolbarDefinition = {
  id: ToolbarItemId;
  title: string;
  icon: string;
  group: ToolbarGroup;
};

const RECENT_PROJECTS_KEY = "masterpieces.recentProjects.v1";
const TOOLBAR_PREFS_KEY = "masterpieces.visibleToolbarButtons.v2";

const FONT_SIZE_OPTIONS = ["14px", "16px", "18px", "20px", "24px", "28px", "32px"];
const LINE_HEIGHT_OPTIONS = ["1.4", "1.6", "1.8", "2", "2.2", "2.5"];
const COLOR_PRESETS = ["#f5f5f5", "#111111", "#7c2d12", "#92400e", "#166534", "#1d4ed8", "#6d28d9", "#be123c"];
const HIGHLIGHT_PRESETS = ["#fef08a", "#fed7aa", "#bbf7d0", "#bfdbfe", "#e9d5ff"];

const TOOLBAR_GROUP_LABELS: Record<ToolbarGroup, string> = {
  history: "历史",
  format: "段落层级",
  inline: "文字样式",
  align: "对齐",
  list: "列表与块",
  insert: "插入",
  table: "表格",
};

const TOOLBAR_CATALOG: ToolbarDefinition[] = [
  { id: "undo", title: "撤销", icon: "↶", group: "history" },
  { id: "redo", title: "重做", icon: "↷", group: "history" },
  { id: "paragraph", title: "正文", icon: "¶", group: "format" },
  { id: "h1", title: "一级标题", icon: "H1", group: "format" },
  { id: "h2", title: "二级标题", icon: "H2", group: "format" },
  { id: "h3", title: "三级标题", icon: "H3", group: "format" },
  { id: "h4", title: "四级标题", icon: "H4", group: "format" },
  { id: "bold", title: "加粗", icon: "B", group: "inline" },
  { id: "italic", title: "斜体", icon: "I", group: "inline" },
  { id: "underline", title: "下划线", icon: "U", group: "inline" },
  { id: "strike", title: "删除线", icon: "S", group: "inline" },
  { id: "code", title: "行内代码", icon: "</>", group: "inline" },
  { id: "alignLeft", title: "左对齐", icon: "≡", group: "align" },
  { id: "alignCenter", title: "居中", icon: "≣", group: "align" },
  { id: "alignRight", title: "右对齐", icon: "≡", group: "align" },
  { id: "alignJustify", title: "两端对齐", icon: "▤", group: "align" },
  { id: "bulletList", title: "无序列表", icon: "•", group: "list" },
  { id: "orderedList", title: "有序列表", icon: "1.", group: "list" },
  { id: "taskList", title: "任务清单", icon: "☑", group: "list" },
  { id: "blockquote", title: "引用", icon: "“”", group: "list" },
  { id: "codeBlock", title: "代码块", icon: "▣", group: "list" },
  { id: "horizontalRule", title: "分割线", icon: "—", group: "insert" },
  { id: "link", title: "链接", icon: "🔗", group: "insert" },
  { id: "image", title: "图片", icon: "▧", group: "insert" },
  { id: "table", title: "表格", icon: "▦", group: "insert" },
  { id: "addRow", title: "增加行", icon: "↕", group: "table" },
  { id: "addColumn", title: "增加列", icon: "↔", group: "table" },
  { id: "mergeCells", title: "合并单元格", icon: "⇄", group: "table" },
  { id: "splitCell", title: "拆分单元格", icon: "⇆", group: "table" },
  { id: "deleteTable", title: "删除表格", icon: "×", group: "table" },
];

const DEFAULT_VISIBLE_TOOLBAR_IDS: ToolbarItemId[] = [
  "paragraph",
  "h1",
  "h2",
  "h3",
  "bold",
  "italic",
  "underline",
  "strike",
  "blockquote",
  "code",
  "alignLeft",
  "alignCenter",
  "alignRight",
  "bulletList",
  "orderedList",
  "link",
  "table",
  "undo",
  "redo",
];

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
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as ProjectRecord[]) : [];
  } catch {
    return [];
  }
}

function saveRecentProjects(projects: ProjectRecord[]) {
  localStorage.setItem(RECENT_PROJECTS_KEY, JSON.stringify(projects));
}

function isToolbarItemId(value: string): value is ToolbarItemId {
  return TOOLBAR_CATALOG.some((item) => item.id === value);
}

function loadToolbarPreferences(): ToolbarItemId[] {
  try {
    const raw = localStorage.getItem(TOOLBAR_PREFS_KEY);
    if (!raw) return DEFAULT_VISIBLE_TOOLBAR_IDS;
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return DEFAULT_VISIBLE_TOOLBAR_IDS;
    const ids = parsed.filter((item): item is ToolbarItemId => typeof item === "string" && isToolbarItemId(item));
    return ids.length > 0 ? ids : DEFAULT_VISIBLE_TOOLBAR_IDS;
  } catch {
    return DEFAULT_VISIBLE_TOOLBAR_IDS;
  }
}

function App() {
  const [view, setView] = useState<View>("splash");
  const [projects, setProjects] = useState<ProjectRecord[]>(() => loadRecentProjects());
  const [selectedId, setSelectedId] = useState("");
  const [currentProject, setCurrentProject] = useState<ProjectRecord | null>(null);
  const [workspaceMode, setWorkspaceMode] = useState<WorkspaceMode>("manuscript");
  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [activeDocumentId, setActiveDocumentId] = useState("");
  const [documentHtml, setDocumentHtml] = useState("");
  const [modalMode, setModalMode] = useState<ModalMode>(null);
  const [modalProject, setModalProject] = useState<ProjectRecord | null>(null);
  const [modalDocument, setModalDocument] = useState<DocumentRecord | null>(null);
  const [projectNameInput, setProjectNameInput] = useState("");
  const [documentTitleInput, setDocumentTitleInput] = useState("");
  const [pathInput, setPathInput] = useState("");
  const [linkUrlInput, setLinkUrlInput] = useState("");
  const [imageUrlInput, setImageUrlInput] = useState("");
  const [slashMenuOpen, setSlashMenuOpen] = useState(false);
  const [toolbarMoreOpen, setToolbarMoreOpen] = useState(false);
  const [leftSidebarOpen, setLeftSidebarOpen] = useState(true);
  const [aiPanelOpen, setAiPanelOpen] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const [isBusy, setIsBusy] = useState(false);
  const [editorTick, setEditorTick] = useState(0);
  const [visibleToolbarIds, setVisibleToolbarIds] = useState<ToolbarItemId[]>(() => loadToolbarPreferences());
  const saveTimerRef = useRef<number | null>(null);

  const selectedProject = useMemo(
    () => projects.find((project) => project.id === selectedId) ?? null,
    [projects, selectedId],
  );

  const activeDocument = useMemo(
    () => documents.find((doc) => doc.id === activeDocumentId) ?? null,
    [documents, activeDocumentId],
  );

  const workspaceLabels = workspaceMode === "outline"
    ? { module: "大纲", section: "自由写作", listTitle: "自由写作大纲", volume: "大纲资料库", empty: "还没有大纲", createButton: "新建大纲", createPlaceholder: "例如：主线大纲" }
    : { module: "写作", section: "正文", listTitle: "正文草稿", volume: `第一卷：${currentProject?.name ?? "未命名项目"}`, empty: "还没有文档", createButton: "新建文档", createPlaceholder: "例如：第一章" };

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
        placeholder: ({ node }) => (node.type.name === "heading" ? "请输入标题……" : "开始写作或整理大纲，输入 / 可打开快捷菜单……"),
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
          if (event.key === "Escape") setSlashMenuOpen(false);
          if (event.key === "/") window.setTimeout(() => setSlashMenuOpen(true), 0);
          return false;
        },
      },
    },
    onUpdate: ({ editor: nextEditor }) => {
      setDocumentHtml(nextEditor.getHTML());
      setEditorTick((value) => value + 1);
      scheduleSave();
    },
    onSelectionUpdate: () => setEditorTick((value) => value + 1),
  });

  useEffect(() => {
    const timer = window.setTimeout(() => setView("projects"), 450);
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
    if (!editor || !isEditorView()) return;
    const current = editor.getHTML();
    if (current !== documentHtml) {
      editor.commands.setContent(documentHtml || "", false);
      setEditorTick((value) => value + 1);
    }
  }, [editor, documentHtml, activeDocumentId, view, workspaceMode]);

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
    window.setTimeout(() => setStatusMessage(""), 4200);
  }

  function isEditorView(nextView: View = view) {
    return nextView === "writer" || nextView === "outlineWriter";
  }

  function collectionCommands(mode: WorkspaceMode = workspaceMode) {
    if (mode === "outline") {
      return {
        list: "list_outline_documents",
        create: "create_outline_document",
        rename: "rename_outline_document",
        delete: "delete_outline_document",
        read: "read_outline_document",
        save: "save_outline_document",
      } as const;
    }
    return {
      list: "list_documents",
      create: "create_document",
      rename: "rename_document",
      delete: "delete_document",
      read: "read_document",
      save: "save_document",
    } as const;
  }

  function openEditorView(mode: WorkspaceMode) {
    setWorkspaceMode(mode);
    setToolbarMoreOpen(false);
    setSlashMenuOpen(false);
    setView(mode === "outline" ? "outlineWriter" : "writer");
  }

  function closeEditorToParent() {
    void saveActiveDocument(false);
    setToolbarMoreOpen(false);
    setSlashMenuOpen(false);
    setView(workspaceMode === "outline" ? "outline" : "hub");
  }

  function closeModal() {
    if (isBusy) return;
    setModalMode(null);
    setModalProject(null);
    setModalDocument(null);
    setProjectNameInput("");
    setDocumentTitleInput("");
    setPathInput("");
    setLinkUrlInput("");
    setImageUrlInput("");
  }

  function closeModalAfterBusy() {
    setModalMode(null);
    setModalProject(null);
    setModalDocument(null);
    setProjectNameInput("");
    setDocumentTitleInput("");
    setPathInput("");
    setLinkUrlInput("");
    setImageUrlInput("");
  }

  function openCreateModal() {
    setModalMode("create");
    setModalProject(null);
    setProjectNameInput("");
    setPathInput("");
  }

  function openImportModal() {
    setModalMode("import");
    setModalProject(null);
    setProjectNameInput("");
    setPathInput("");
  }

  function openRenameModal(project: ProjectRecord) {
    setModalMode("rename");
    setModalProject(project);
    setProjectNameInput(project.name);
    setPathInput(project.path);
  }

  function openRelocateModal(project: ProjectRecord) {
    setModalMode("relocate");
    setModalProject(project);
    setProjectNameInput(project.name);
    setPathInput(project.path);
  }

  function openActionsModal(project: ProjectRecord) {
    setSelectedId(project.id);
    setModalProject(project);
    setModalMode("actions");
    setProjectNameInput(project.name);
    setPathInput(project.path);
  }

  function openCreateDocumentModal() {
    setDocumentTitleInput("");
    setModalDocument(null);
    setModalMode("createDocument");
  }

  function openRenameDocumentModal(document: DocumentRecord) {
    setModalDocument(document);
    setDocumentTitleInput(document.title);
    setModalMode("renameDocument");
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
      setSelectedId(created.id);
      closeModalAfterBusy();
      showStatus(`项目已创建：${created.name}`);
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
      setSelectedId(imported.id);
      closeModalAfterBusy();
      showStatus(`已打开项目：${imported.name}`);
    } catch (error) {
      showStatus(`打开失败：${String(error)}`);
    } finally {
      setIsBusy(false);
    }
  }

  async function openProject() {
    if (!selectedProject) return;
    if (selectedProject.exists === false) {
      openRelocateModal(selectedProject);
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
      updateProjects([updatedProject, ...projects.filter((project) => project.id !== updatedProject.id)]);
      setCurrentProject(updatedProject);
      setView("hub");
    } catch {
      showStatus("项目文件未找到，请重新定位该项目。");
      updateProjects(projects.map((project) => (project.id === selectedProject.id ? { ...project, exists: false } : project)));
      openRelocateModal(selectedProject);
    } finally {
      setIsBusy(false);
    }
  }

  async function renameProject() {
    if (!modalProject) return;
    const name = projectNameInput.trim();
    if (!name) return showStatus("请输入新的项目名称。");
    if (name === modalProject.name) return closeModal();
    setIsBusy(true);
    try {
      const manifest = await invoke<ProjectManifest>("rename_project", { path: modalProject.path, name });
      updateProjects(
        projects.map((item) =>
          item.id === modalProject.id
            ? { ...item, name: manifest.name, updatedAt: manifest.updatedAt, exists: true }
            : item,
        ),
      );
      if (currentProject?.id === modalProject.id) {
        setCurrentProject({ ...currentProject, name: manifest.name, updatedAt: manifest.updatedAt, exists: true });
      }
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
      setSelectedId(imported.id);
      setCurrentProject(imported);
      closeModalAfterBusy();
      showStatus(`已重新定位：${imported.path}`);
    } catch (error) {
      showStatus(`重新定位失败：${String(error)}`);
    } finally {
      setIsBusy(false);
    }
  }

  function removeFromRecent(project: ProjectRecord) {
    updateProjects(projects.filter((item) => item.id !== project.id));
    if (selectedId === project.id) setSelectedId("");
    closeModalAfterBusy();
    showStatus(`已从最近项目列表移除：${project.name}`);
  }

  async function loadDocuments(project = currentProject, mode: WorkspaceMode = workspaceMode) {
    if (!project) return [];
    const commands = collectionCommands(mode);
    const nextDocuments = await invoke<DocumentRecord[]>(commands.list, { path: project.path });
    setDocuments(nextDocuments);
    return nextDocuments;
  }

  async function enterWorkspace(mode: WorkspaceMode) {
    if (!currentProject) return;
    await saveActiveDocument(false);
    setWorkspaceMode(mode);
    setDocuments([]);
    setActiveDocumentId("");
    setDocumentHtml("");
    setIsBusy(true);
    try {
      const nextDocuments = await loadDocuments(currentProject, mode);
      const firstDoc = nextDocuments[0];
      if (firstDoc) {
        setActiveDocumentId(firstDoc.id);
        const html = await invoke<string>(collectionCommands(mode).read, {
          path: currentProject.path,
          documentId: firstDoc.id,
        });
        setDocumentHtml(html);
      } else {
        setActiveDocumentId("");
        setDocumentHtml("");
      }
      openEditorView(mode);
    } catch (error) {
      showStatus(`${mode === "outline" ? "读取大纲" : "读取文档"}失败：${String(error)}`);
    } finally {
      setIsBusy(false);
    }
  }

  async function enterWriter() {
    await enterWorkspace("manuscript");
  }

  async function enterOutlineFreeWriting() {
    await enterWorkspace("outline");
  }

  async function selectDocument(document: DocumentRecord) {
    if (!currentProject || document.id === activeDocumentId) return;
    await saveActiveDocument(false);
    setActiveDocumentId(document.id);
    try {
      const html = await invoke<string>(collectionCommands().read, { path: currentProject.path, documentId: document.id });
      setDocumentHtml(html);
    } catch (error) {
      showStatus(`${workspaceMode === "outline" ? "读取大纲" : "读取文档"}失败：${String(error)}`);
    }
  }

  async function saveActiveDocument(showSaved = true, nextHtml?: string) {
    if (!currentProject || !activeDocumentId) return;
    const content = nextHtml ?? editor?.getHTML() ?? documentHtml;
    try {
      const manifest = await invoke<ProjectManifest>(collectionCommands().save, {
        path: currentProject.path,
        documentId: activeDocumentId,
        content,
      });
      const updatedProject = { ...currentProject, updatedAt: manifest.updatedAt, exists: true };
      setCurrentProject(updatedProject);
      updateProjects(projects.map((item) => (item.id === updatedProject.id ? updatedProject : item)));
      setDocuments((items) =>
        items.map((doc) => (doc.id === activeDocumentId ? { ...doc, updatedAt: manifest.updatedAt } : doc)),
      );
      if (showSaved) showStatus("已保存。");
    } catch (error) {
      showStatus(`保存失败：${String(error)}`);
    }
  }

  function scheduleSave() {
    if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current);
    saveTimerRef.current = window.setTimeout(() => {
      void saveActiveDocument(false);
    }, 900);
  }

  async function createDocument() {
    if (!currentProject) return;
    const title = documentTitleInput.trim();
    if (!title) return showStatus(workspaceMode === "outline" ? "请输入大纲名称。" : "请输入文档名称。");
    setIsBusy(true);
    try {
      const nextDocuments = await invoke<DocumentRecord[]>(collectionCommands().create, { path: currentProject.path, title });
      setDocuments(nextDocuments);
      const created = nextDocuments.find((doc) => !documents.some((oldDoc) => oldDoc.id === doc.id)) ?? nextDocuments[nextDocuments.length - 1];
      if (created) {
        setActiveDocumentId(created.id);
        setDocumentHtml("");
      }
      closeModalAfterBusy();
      showStatus(workspaceMode === "outline" ? "大纲已创建。" : "文档已创建。");
    } catch (error) {
      showStatus(`${workspaceMode === "outline" ? "创建大纲" : "创建文档"}失败：${String(error)}`);
    } finally {
      setIsBusy(false);
    }
  }

  async function renameDocument() {
    if (!currentProject || !modalDocument) return;
    const title = documentTitleInput.trim();
    if (!title) return showStatus(workspaceMode === "outline" ? "请输入大纲名称。" : "请输入文档名称。");
    setIsBusy(true);
    try {
      const nextDocuments = await invoke<DocumentRecord[]>(collectionCommands().rename, {
        path: currentProject.path,
        documentId: modalDocument.id,
        title,
      });
      setDocuments(nextDocuments);
      closeModalAfterBusy();
      showStatus(workspaceMode === "outline" ? "大纲已重命名。" : "文档已重命名。");
    } catch (error) {
      showStatus(`${workspaceMode === "outline" ? "重命名大纲" : "重命名文档"}失败：${String(error)}`);
    } finally {
      setIsBusy(false);
    }
  }

  async function deleteDocument(document: DocumentRecord) {
    if (!currentProject) return;
    setIsBusy(true);
    try {
      const nextDocuments = await invoke<DocumentRecord[]>(collectionCommands().delete, {
        path: currentProject.path,
        documentId: document.id,
      });
      setDocuments(nextDocuments);
      if (document.id === activeDocumentId) {
        const nextActive = nextDocuments[0];
        if (nextActive) {
          setActiveDocumentId(nextActive.id);
          const html = await invoke<string>(collectionCommands().read, { path: currentProject.path, documentId: nextActive.id });
          setDocumentHtml(html);
        } else {
          setActiveDocumentId("");
          setDocumentHtml("");
        }
      }
      showStatus(workspaceMode === "outline" ? "大纲已删除。" : "文档已删除。");
    } catch (error) {
      showStatus(`${workspaceMode === "outline" ? "删除大纲" : "删除文档"}失败：${String(error)}`);
    } finally {
      setIsBusy(false);
    }
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

  function runToolbarCommand(id: ToolbarItemId) {
    if (!editor) return;
    setToolbarMoreOpen(false);
    switch (id) {
      case "undo":
        editor.chain().focus().undo().run();
        break;
      case "redo":
        editor.chain().focus().redo().run();
        break;
      case "paragraph":
        setParagraph();
        break;
      case "h1":
        setHeading(1);
        break;
      case "h2":
        setHeading(2);
        break;
      case "h3":
        setHeading(3);
        break;
      case "h4":
        setHeading(4);
        break;
      case "bold":
        editor.chain().focus().toggleBold().run();
        break;
      case "italic":
        editor.chain().focus().toggleItalic().run();
        break;
      case "underline":
        editor.chain().focus().toggleUnderline().run();
        break;
      case "strike":
        editor.chain().focus().toggleStrike().run();
        break;
      case "code":
        editor.chain().focus().toggleCode().run();
        break;
      case "alignLeft":
        setTextAlign("left");
        break;
      case "alignCenter":
        setTextAlign("center");
        break;
      case "alignRight":
        setTextAlign("right");
        break;
      case "alignJustify":
        setTextAlign("justify");
        break;
      case "bulletList":
        editor.chain().focus().toggleBulletList().run();
        break;
      case "orderedList":
        editor.chain().focus().toggleOrderedList().run();
        break;
      case "taskList":
        editor.chain().focus().toggleTaskList().run();
        break;
      case "blockquote":
        editor.chain().focus().toggleBlockquote().run();
        break;
      case "codeBlock":
        editor.chain().focus().toggleCodeBlock().run();
        break;
      case "horizontalRule":
        editor.chain().focus().setHorizontalRule().run();
        break;
      case "link":
        openLinkModal();
        break;
      case "image":
        openImageModal();
        break;
      case "table":
        insertTable();
        break;
      case "addRow":
        editor.chain().focus().addRowAfter().run();
        break;
      case "addColumn":
        editor.chain().focus().addColumnAfter().run();
        break;
      case "mergeCells":
        editor.chain().focus().mergeCells().run();
        break;
      case "splitCell":
        editor.chain().focus().splitCell().run();
        break;
      case "deleteTable":
        editor.chain().focus().deleteTable().run();
        break;
    }
  }

  function isToolbarActive(id: ToolbarItemId) {
    if (!editor) return false;
    switch (id) {
      case "paragraph":
        return editor.isActive("paragraph");
      case "h1":
        return editor.isActive("heading", { level: 1 });
      case "h2":
        return editor.isActive("heading", { level: 2 });
      case "h3":
        return editor.isActive("heading", { level: 3 });
      case "h4":
        return editor.isActive("heading", { level: 4 });
      case "bold":
        return editor.isActive("bold");
      case "italic":
        return editor.isActive("italic");
      case "underline":
        return editor.isActive("underline");
      case "strike":
        return editor.isActive("strike");
      case "code":
        return editor.isActive("code");
      case "alignLeft":
        return editor.isActive({ textAlign: "left" });
      case "alignCenter":
        return editor.isActive({ textAlign: "center" });
      case "alignRight":
        return editor.isActive({ textAlign: "right" });
      case "alignJustify":
        return editor.isActive({ textAlign: "justify" });
      case "bulletList":
        return editor.isActive("bulletList");
      case "orderedList":
        return editor.isActive("orderedList");
      case "taskList":
        return editor.isActive("taskList");
      case "blockquote":
        return editor.isActive("blockquote");
      case "codeBlock":
        return editor.isActive("codeBlock");
      case "link":
        return editor.isActive("link");
      case "table":
      case "addRow":
      case "addColumn":
      case "mergeCells":
      case "splitCell":
      case "deleteTable":
        return editor.isActive("table");
      default:
        return false;
    }
  }

  function isToolbarDisabled(id: ToolbarItemId) {
    if (!editor) return true;
    if (["addRow", "addColumn", "mergeCells", "splitCell", "deleteTable"].includes(id)) return !editor.isActive("table");
    return false;
  }

  function toggleToolbarPreference(id: ToolbarItemId) {
    setVisibleToolbarIds((ids) => (ids.includes(id) ? ids.filter((item) => item !== id) : [...ids, id]));
  }

  function characterCount() {
    return editor?.state.doc.textContent.length ?? documentHtml.replace(/<[^>]*>/g, "").length;
  }

  function renderToolbarButton(item: ToolbarDefinition, compact = false) {
    const active = isToolbarActive(item.id);
    const disabled = isToolbarDisabled(item.id);
    return (
      <button
        key={item.id}
        className={`toolbar-button ${active ? "is-active" : ""} ${compact ? "is-compact" : ""}`}
        disabled={disabled}
        title={item.title}
        aria-label={item.title}
        onMouseDown={(event) => event.preventDefault()}
        onClick={() => runToolbarCommand(item.id)}
      >
        <span className="toolbar-button-icon">{item.icon}</span>
        {compact ? <span className="toolbar-button-label">{item.title}</span> : null}
      </button>
    );
  }

  function renderEditorToolbar() {
    if (!editor) return null;
    void editorTick;
    const visibleItems = TOOLBAR_CATALOG.filter((item) => visibleToolbarIds.includes(item.id));
    const overflowItems = TOOLBAR_CATALOG.filter((item) => !visibleToolbarIds.includes(item.id));
    const firstRow = visibleItems.filter((item) => ["format", "inline"].includes(item.group));
    const secondRow = visibleItems.filter((item) => !["format", "inline"].includes(item.group));
    const currentFontSize = editor.getAttributes("textStyle").fontSize ?? "18px";
    const currentLineHeight = editor.getAttributes("paragraph").lineHeight || editor.getAttributes("heading").lineHeight || "1.8";

    return (
      <div className="editor-toolbar-shell">
        <div className="editor-toolbar-row editor-toolbar-topline">
          <button className="icon-button" onClick={() => setLeftSidebarOpen((value) => !value)} title="显示/隐藏左侧栏">
            ◧
          </button>
          <div className="toolbar-breadcrumbs">
            <span>{currentProject?.name ?? "未命名项目"}</span>
            <span>›</span>
            <span>{workspaceLabels.module}</span>
            <span>›</span>
            <strong>{activeDocument?.title ?? "未选择文档"}</strong>
          </div>
          <div className="toolbar-spacer" />
          <span className="word-count">{characterCount().toLocaleString("zh-CN")} 字</span>
          <button className="icon-button" title="搜索">
            ⌕
          </button>
          <button
            className={`icon-button ai-toggle ${aiPanelOpen ? "is-active" : ""}`}
            onClick={() => setAiPanelOpen((value) => !value)}
            title="AI 助手"
          >
            ✨
          </button>
        </div>

        <div className="editor-toolbar-row">
          {firstRow.map((item) => renderToolbarButton(item))}
          <div className="toolbar-divider" />
          <select
            className="toolbar-select"
            value={currentFontSize}
            onMouseDown={(event) => event.stopPropagation()}
            onChange={(event) => applyFontSize(event.currentTarget.value)}
            aria-label="字号"
          >
            {FONT_SIZE_OPTIONS.map((size) => (
              <option key={size} value={size}>
                字号 {size}
              </option>
            ))}
          </select>
          <select
            className="toolbar-select"
            value={currentLineHeight}
            onMouseDown={(event) => event.stopPropagation()}
            onChange={(event) => applyLineHeight(event.currentTarget.value)}
            aria-label="行高"
          >
            {LINE_HEIGHT_OPTIONS.map((lineHeight) => (
              <option key={lineHeight} value={lineHeight}>
                行高 {lineHeight}
              </option>
            ))}
          </select>
          <button className="toolbar-button save-button" onMouseDown={(event) => event.preventDefault()} onClick={() => void saveActiveDocument(true)} title="保存">
            <span className="toolbar-button-icon">✓</span>
          </button>
        </div>

        <div className="editor-toolbar-row toolbar-relative">
          {secondRow.map((item) => renderToolbarButton(item))}
          <div className="toolbar-divider" />
          <div className="swatch-group" aria-label="文字颜色">
            <span className="swatch-label">A</span>
            {COLOR_PRESETS.map((color) => (
              <button
                key={color}
                className="color-swatch"
                style={{ backgroundColor: color }}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => editor.chain().focus().setColor(color).run()}
                aria-label={`文字颜色 ${color}`}
              />
            ))}
          </div>
          <div className="swatch-group" aria-label="高亮颜色">
            <span className="swatch-label">▰</span>
            {HIGHLIGHT_PRESETS.map((color) => (
              <button
                key={color}
                className="color-swatch is-highlight"
                style={{ backgroundColor: color }}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => editor.chain().focus().toggleHighlight({ color }).run()}
                aria-label={`高亮 ${color}`}
              />
            ))}
          </div>
          <button
            className={`toolbar-button more-button ${toolbarMoreOpen ? "is-active" : ""}`}
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => setToolbarMoreOpen((value) => !value)}
            title="更多编辑按钮"
          >
            <span className="toolbar-button-icon">…</span>
          </button>
          {toolbarMoreOpen ? (
            <div className="toolbar-overflow-panel">
              <div className="overflow-header">
                <strong>更多编辑按钮</strong>
                <button onClick={() => setModalMode("preferences")}>首选项…</button>
              </div>
              {Object.entries(TOOLBAR_GROUP_LABELS).map(([group, label]) => {
                const items = overflowItems.filter((item) => item.group === group);
                if (items.length === 0) return null;
                return (
                  <div className="overflow-group" key={group}>
                    <h4>{label}</h4>
                    <div className="overflow-grid">{items.map((item) => renderToolbarButton(item, true))}</div>
                  </div>
                );
              })}
              {overflowItems.length === 0 ? <p className="empty-overflow">所有按钮已显示在主工具栏。</p> : null}
            </div>
          ) : null}
        </div>
      </div>
    );
  }

  function renderBubbleMenu() {
    if (!editor) return null;
    return (
      <BubbleMenu editor={editor} tippyOptions={{ duration: 120 }}>
        <div className="bubble-menu">
          <button onClick={() => editor.chain().focus().toggleBold().run()}>B</button>
          <button onClick={() => editor.chain().focus().toggleItalic().run()}>I</button>
          <button onClick={() => editor.chain().focus().toggleHighlight({ color: "#fef08a" }).run()}>▰</button>
          <button onClick={openLinkModal}>🔗</button>
        </div>
      </BubbleMenu>
    );
  }

  function renderSlashMenu() {
    if (!slashMenuOpen || !editor) return null;
    return (
      <div className="slash-menu">
        <button onMouseDown={(event) => event.preventDefault()} onClick={() => applySlashCommand("heading1")}>
          <strong>H1</strong> 一级标题
        </button>
        <button onMouseDown={(event) => event.preventDefault()} onClick={() => applySlashCommand("heading2")}>
          <strong>H2</strong> 二级标题
        </button>
        <button onMouseDown={(event) => event.preventDefault()} onClick={() => applySlashCommand("bullet")}>
          <strong>•</strong> 无序列表
        </button>
        <button onMouseDown={(event) => event.preventDefault()} onClick={() => applySlashCommand("task")}>
          <strong>☑</strong> 任务清单
        </button>
        <button onMouseDown={(event) => event.preventDefault()} onClick={() => applySlashCommand("quote")}>
          <strong>“”</strong> 引用
        </button>
        <button onMouseDown={(event) => event.preventDefault()} onClick={() => applySlashCommand("table")}>
          <strong>▦</strong> 表格
        </button>
      </div>
    );
  }

  function renderStatus() {
    if (!statusMessage) return null;
    return <div className="status-toast">{statusMessage}</div>;
  }

  function renderPreferencesModal() {
    return (
      <div className="modal-overlay" onClick={closeModal}>
        <div className="modal-card preferences-card" onClick={(event) => event.stopPropagation()}>
          <div className="modal-eyebrow">Preferences</div>
          <div className="modal-title-row">
            <h2>编辑栏首选项</h2>
            <button className="ghost-button" onClick={() => setVisibleToolbarIds(DEFAULT_VISIBLE_TOOLBAR_IDS)}>
              恢复默认
            </button>
          </div>
          <p className="modal-muted">勾选后会显示在主编辑栏；未勾选的按钮会收纳到 “…” 菜单。主编辑栏按两排优先展示常用功能。</p>
          <div className="preferences-grid">
            {Object.entries(TOOLBAR_GROUP_LABELS).map(([group, label]) => {
              const items = TOOLBAR_CATALOG.filter((item) => item.group === group);
              if (!items.length) return null;
              return (
                <section key={group} className="preference-group">
                  <h3>{label}</h3>
                  {items.map((item) => (
                    <label key={item.id} className="preference-item">
                      <input
                        type="checkbox"
                        checked={visibleToolbarIds.includes(item.id)}
                        onChange={() => toggleToolbarPreference(item.id)}
                      />
                      <span className="preference-icon">{item.icon}</span>
                      <span>{item.title}</span>
                    </label>
                  ))}
                </section>
              );
            })}
          </div>
          <div className="modal-actions">
            <button className="primary-button" onClick={closeModal}>
              完成
            </button>
          </div>
        </div>
      </div>
    );
  }

  function renderModal() {
    if (!modalMode) return null;
    if (modalMode === "preferences") return renderPreferencesModal();

    if (modalMode === "actions" && modalProject) {
      return (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-card" onClick={(event) => event.stopPropagation()}>
            <h2>{modalProject.name}</h2>
            <p className="modal-muted">请选择要执行的操作。</p>
            <div className="modal-actions column-actions">
              <button onClick={() => openRenameModal(modalProject)}>修改项目名称</button>
              <button onClick={() => openRelocateModal(modalProject)}>重新定位项目文件</button>
              <button className="danger-button" onClick={() => removeFromRecent(modalProject)}>
                从列表删除
              </button>
              <button className="ghost-button" onClick={closeModal}>
                取消
              </button>
            </div>
          </div>
        </div>
      );
    }

    if (modalMode === "insertLink" || modalMode === "insertImage") {
      const isLink = modalMode === "insertLink";
      return (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-card" onClick={(event) => event.stopPropagation()}>
            <h2>{isLink ? "插入/编辑链接" : "插入图片"}</h2>
            <p className="modal-muted">{isLink ? "选中文字后输入链接地址；留空可移除链接。" : "当前版本先支持图片 URL，后续可接入本地图片资源库。"}</p>
            <label className="form-label">
              {isLink ? "链接地址" : "图片地址"}
              <input
                value={isLink ? linkUrlInput : imageUrlInput}
                onChange={(event) => (isLink ? setLinkUrlInput(event.currentTarget.value) : setImageUrlInput(event.currentTarget.value))}
                placeholder={isLink ? "https://example.com" : "https://example.com/image.png"}
              />
            </label>
            <div className="modal-actions">
              <button className="ghost-button" onClick={closeModal}>
                取消
              </button>
              <button className="primary-button" onClick={isLink ? applyLink : applyImage}>
                确定
              </button>
            </div>
          </div>
        </div>
      );
    }

    if (modalMode === "createDocument" || modalMode === "renameDocument") {
      const submit = modalMode === "createDocument" ? createDocument : renameDocument;
      return (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-card" onClick={(event) => event.stopPropagation()}>
            <h2>{modalMode === "createDocument" ? workspaceLabels.createButton : workspaceMode === "outline" ? "重命名大纲" : "重命名文档"}</h2>
            <label className="form-label">
              {workspaceMode === "outline" ? "大纲名称" : "文档名称"}
              <input value={documentTitleInput} onChange={(event) => setDocumentTitleInput(event.currentTarget.value)} placeholder={workspaceLabels.createPlaceholder} />
            </label>
            <div className="modal-actions">
              <button className="ghost-button" onClick={closeModal}>
                取消
              </button>
              <button className="primary-button" onClick={() => void submit()} disabled={isBusy}>
                {isBusy ? "处理中…" : "确定"}
              </button>
            </div>
          </div>
        </div>
      );
    }

    const title = modalMode === "create" ? "创建项目" : modalMode === "import" ? "打开已有项目" : modalMode === "rename" ? "修改项目名称" : "重新定位项目";
    const confirmLabel = modalMode === "create" ? "创建" : modalMode === "import" ? "打开" : modalMode === "rename" ? "保存名称" : "保存新位置";
    const submit = modalMode === "create" ? createProject : modalMode === "import" ? importExistingProject : modalMode === "rename" ? renameProject : relocateProject;

    return (
      <div className="modal-overlay" onClick={closeModal}>
        <div className="modal-card" onClick={(event) => event.stopPropagation()}>
          <h2>{title}</h2>
          {modalMode === "create" || modalMode === "rename" ? (
            <label className="form-label">
              项目名称
              <input value={projectNameInput} onChange={(event) => setProjectNameInput(event.currentTarget.value)} placeholder="例如：我的小说" />
            </label>
          ) : null}
          {modalMode === "create" ? (
            <label className="form-label">
              存档文件夹
              <div className="input-row">
                <input value={pathInput} onChange={(event) => setPathInput(event.currentTarget.value)} placeholder="请选择文件夹" />
                <button onClick={() => void chooseFolderForInput("create")}>选择…</button>
              </div>
              <small>程序会在这个文件夹里创建一个 .masterpiece 项目档案。</small>
            </label>
          ) : null}
          {modalMode === "import" || modalMode === "relocate" ? (
            <label className="form-label">
              项目文件夹
              <div className="input-row">
                <input value={pathInput} onChange={(event) => setPathInput(event.currentTarget.value)} placeholder="请选择 .masterpiece 项目文件夹" />
                <button onClick={() => void chooseFolderForInput("project")}>选择…</button>
              </div>
              <small>请选择或输入以 .masterpiece 结尾的项目文件夹。</small>
            </label>
          ) : null}
          <div className="modal-actions">
            <button className="ghost-button" onClick={closeModal}>
              取消
            </button>
            <button className="primary-button" onClick={() => void submit()} disabled={isBusy}>
              {isBusy ? "处理中…" : confirmLabel}
            </button>
          </div>
        </div>
      </div>
    );
  }

  function renderProjectList() {
    return (
      <div className="mastps-app project-screen">
        <div className="ambient-layer" />
        {renderStatus()}
        {renderModal()}
        <section className="project-hero">
          <div>
            <span className="hero-eyebrow">MasterPieces</span>
            <h1>选择项目</h1>
          </div>
          <div className="hero-actions">
            <button className="secondary-button" onClick={openImportModal}>
              打开已有项目
            </button>
            <button className="square-primary-button" onClick={openCreateModal} title="创建项目">
              +
            </button>
          </div>
        </section>
        <section className="project-table-card">
          <div className="project-table-header">
            <span>序号</span>
            <span>项目名称</span>
            <span>最后修改时间</span>
            <span>创建时间</span>
          </div>
          {projects.length === 0 ? <div className="empty-row">暂无项目，请点击右上角 + 创建。</div> : null}
          {projects.map((project, index) => (
            <button
              key={project.id}
              className={`project-row ${selectedId === project.id ? "is-selected" : ""}`}
              onClick={() => setSelectedId(project.id)}
              onDoubleClick={() => void openProject()}
              onContextMenu={(event) => {
                event.preventDefault();
                openActionsModal(project);
              }}
            >
              <span>{index + 1}</span>
              <strong>{project.name}{project.exists === false ? "（项目文件未找到）" : ""}</strong>
              <span>{formatTime(project.updatedAt)}</span>
              <span>{formatTime(project.createdAt)}</span>
            </button>
          ))}
        </section>
        <button className="enter-project-button" onClick={() => void openProject()} disabled={!selectedProject || isBusy}>
          进入
        </button>
      </div>
    );
  }

  function renderHub() {
    if (!currentProject) return null;
    return (
      <div className="mastps-app hub-screen">
        <div className="ambient-layer" />
        {renderStatus()}
        {renderModal()}
        <button className="back-button" onClick={() => setView("projects")}>
          ← 项目
        </button>
        <section className="hub-card">
          <span className="hero-eyebrow">写作中心</span>
          <h1>{currentProject.name}</h1>
          <div className="hub-actions">
            <button className="hub-action-card" onClick={() => void enterWriter()}>
              <span>✍</span>
              <strong>写作</strong>
              <small>进入项目文档目录与正文编辑区</small>
            </button>
            <button className="hub-action-card" onClick={() => setView("outline")}>
              <span>🧭</span>
              <strong>大纲</strong>
              <small>进入大纲模块，管理剧情结构与大纲草稿</small>
            </button>
            <button className="hub-action-card" onClick={() => setModalMode("preferences")}>
              <span>⚙</span>
              <strong>首选项</strong>
              <small>配置编辑按钮与写作界面</small>
            </button>
          </div>
        </section>
      </div>
    );
  }

  function renderOutlineModule() {
    if (!currentProject) return null;
    return (
      <div className="mastps-app hub-screen outline-module-screen">
        <div className="ambient-layer" />
        {renderStatus()}
        {renderModal()}
        <button className="back-button" onClick={() => setView("hub")}>
          ← 写作中心
        </button>
        <section className="hub-card outline-module-card">
          <span className="hero-eyebrow">大纲模块</span>
          <h1>{currentProject.name}</h1>
          <p className="hub-intro">这里用于存放与正文分离的大纲资料。进入“自由写作”后，会打开一个与正文写作界面相同的专属编辑器，但内容会保存到大纲库中。</p>
          <div className="hub-actions">
            <button className="hub-action-card primary-module-card" onClick={() => void enterOutlineFreeWriting()}>
              <span>📝</span>
              <strong>自由写作</strong>
              <small>使用完整编辑器自由记录主线、支线、章节梗概、人物动机和伏笔。</small>
            </button>
          </div>
        </section>
      </div>
    );
  }

  function renderLeftSidebar() {
    if (!currentProject || !leftSidebarOpen) return null;
    return (
      <aside className="left-sidebar">
        <div className="sidebar-title">
          <span className="app-mark">▯</span>
          <strong>{currentProject.name}</strong>
          <button onClick={() => setLeftSidebarOpen(false)} title="隐藏侧边栏">
            ˅
          </button>
        </div>
        <div className="sidebar-section">
          <p>项目设定</p>
          <button>♙ 人物档案</button>
          <button>□ 世界观设定</button>
          <button className={workspaceMode === "outline" ? "is-section-active" : ""}>✒ 大纲与时间线</button>
        </div>
        <div className="sidebar-section grow-section">
          <div className="section-heading">
            <p>{workspaceLabels.listTitle}</p>
            <button onClick={openCreateDocumentModal}>+</button>
          </div>
          <div className="volume-row">⌄ ▰ {workspaceLabels.volume}</div>
          <div className="document-list">
            {documents.map((doc) => (
              <button
                key={doc.id}
                className={`document-item ${doc.id === activeDocumentId ? "is-active" : ""}`}
                onClick={() => void selectDocument(doc)}
                onContextMenu={(event) => {
                  event.preventDefault();
                  openRenameDocumentModal(doc);
                }}
              >
                <span>▤</span>
                <span>{doc.title}</span>
                {doc.id !== "main" ? (
                  <span
                    className="document-delete"
                    onClick={(event) => {
                      event.stopPropagation();
                      void deleteDocument(doc);
                    }}
                    title="删除文档"
                  >
                    ×
                  </span>
                ) : null}
              </button>
            ))}
            {documents.length === 0 ? <p className="empty-documents">{workspaceLabels.empty}，点击 + 新建。</p> : null}
          </div>
        </div>
        <button className="settings-entry" onClick={() => setModalMode("preferences")}>
          ⚙ 软件设置
        </button>
      </aside>
    );
  }

  function renderAiPanel() {
    if (!aiPanelOpen) return null;
    return (
      <aside className="ai-sidebar">
        <div className="ai-tabs">
          <button className="is-active">✨ AI 助手</button>
          <button>▤ 参考设定</button>
        </div>
        <div className="ai-scroll">
          <div className="ai-card">
            <h3>✨ 剧情推演（本地 Ollama）</h3>
            <p>根据设定，主角在这里醒来后，遇到巡逻兵的概率很高。建议让他先发现遗留的终端机，获取部分背景信息，然后再展开冲突。需要我帮你生成一段环境描写的扩写吗？</p>
            <div className="ai-card-actions">
              <button>扩写环境</button>
              <button>生成巡逻兵设定</button>
            </div>
          </div>
          <div className="chapter-memo">
            <h3>本章目标备忘</h3>
            <ul>
              <li>交代末日背景</li>
              <li>主角发现自己失忆</li>
              <li>埋下手臂受伤的伏笔</li>
            </ul>
          </div>
        </div>
        <div className="ai-input-row">
          <input placeholder="询问 AI 关于剧情的建议…" disabled />
          <button disabled>↵</button>
        </div>
      </aside>
    );
  }

  function renderWriter() {
    if (!currentProject) return null;
    return (
      <div className="mastps-app writer-screen">
        <div className="ambient-layer" />
        {renderStatus()}
        {renderModal()}
        {renderLeftSidebar()}
        <section className="writer-workspace">
          <header className="window-bar">
            <strong>{workspaceMode === "outline" ? "Mastps Outline" : "Mastps Editor UI"}</strong>
            <div className="window-actions">
              <button onClick={() => editor?.chain().focus().undo().run()} title="撤销">
                ↶
              </button>
              <button onClick={() => editor?.chain().focus().redo().run()} title="重做">
                ↷
              </button>
              <button onClick={closeEditorToParent} title="关闭编辑器">
                ×
              </button>
            </div>
          </header>
          {renderEditorToolbar()}
          <main className="editor-canvas">
            {renderBubbleMenu()}
            {renderSlashMenu()}
            {activeDocumentId ? (
              <EditorContent editor={editor} />
            ) : (
              <div className="empty-editor">
                <h2>{workspaceLabels.empty}</h2>
                <p>{workspaceMode === "outline" ? "从左侧新建一个大纲后即可开始整理结构。" : "从左侧新建一个正文文档后即可开始写作。"}</p>
                <button className="primary-button" onClick={openCreateDocumentModal}>
                  {workspaceLabels.createButton}
                </button>
              </div>
            )}
          </main>
        </section>
        {renderAiPanel()}
      </div>
    );
  }

  if (view === "splash") {
    return (
      <div className="mastps-app splash-screen">
        <div className="ambient-layer" />
        <h1>MasterPieces</h1>
      </div>
    );
  }

  if (view === "hub") return renderHub();
  if (view === "outline") return renderOutlineModule();
  if (view === "writer" || view === "outlineWriter") return renderWriter();
  return renderProjectList();
}

export default App;

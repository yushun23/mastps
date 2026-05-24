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

type View = "splash" | "projects" | "hub" | "writer";
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

type ToolbarItem = {
  id: ToolbarItemId;
  title: string;
  icon: string;
  group: "format" | "layout" | "insert" | "table" | "history" | "style";
  run?: () => void;
  active?: () => boolean;
  disabled?: () => boolean;
  control?: "fontSize" | "lineHeight" | "color" | "highlight";
};

const RECENT_PROJECTS_KEY = "masterpieces.recentProjects.v1";
const TOOLBAR_PREFS_KEY = "masterpieces.toolbar.visible.v2";

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
  "justify",
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

const TOOLBAR_GROUP_LABELS: Record<ToolbarItem["group"], string> = {
  format: "文本格式",
  layout: "段落与列表",
  insert: "插入",
  table: "表格",
  history: "历史",
  style: "样式",
};

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

function App() {
  const [view, setView] = useState<View>("splash");
  const [projects, setProjects] = useState<ProjectRecord[]>(() => loadRecentProjects());
  const [selectedId, setSelectedId] = useState("");
  const [currentProject, setCurrentProject] = useState<ProjectRecord | null>(null);
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
  const [statusMessage, setStatusMessage] = useState("");
  const [isBusy, setIsBusy] = useState(false);
  const [leftSidebarOpen, setLeftSidebarOpen] = useState(true);
  const [aiPanelOpen, setAiPanelOpen] = useState(false);
  const [toolbarMoreOpen, setToolbarMoreOpen] = useState(false);
  const [visibleToolbarIds, setVisibleToolbarIds] = useState<ToolbarItemId[]>(() => loadToolbarVisibleIds());
  const [editorTick, setEditorTick] = useState(0);
  const saveTimerRef = useRef<number | null>(null);

  const selectedProject = useMemo(
    () => projects.find((project) => project.id === selectedId) ?? null,
    [projects, selectedId],
  );

  const activeDocument = useMemo(
    () => documents.find((doc) => doc.id === activeDocumentId) ?? null,
    [documents, activeDocumentId],
  );

  useEffect(() => {
    const timer = window.setTimeout(() => setView("projects"), 600);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (view !== "projects") return;
    void refreshProjectStatus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view]);

  useEffect(() => {
    localStorage.setItem(TOOLBAR_PREFS_KEY, JSON.stringify(visibleToolbarIds));
  }, [visibleToolbarIds]);

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
        placeholder: ({ node }) =>
          node.type.name === "heading"
            ? "请输入标题……"
            : "开始写作，输入 / 可打开快捷菜单……",
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
    if (!editor) return;
    const current = editor.getHTML();
    if (current !== documentHtml) {
      editor.commands.setContent(documentHtml || "", false);
      setEditorTick((value) => value + 1);
    }
  }, [editor, documentHtml, activeDocumentId]);

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
      setSelectedId(imported.id);
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
      openRelocateModal(selectedProject);
      showStatus("项目文件未找到，请输入新的项目位置。");
      return;
    }

    setIsBusy(true);
    try {
      const manifest = await invoke<ProjectManifest>("read_project_manifest", { path: selectedProject.path });
      const updatedProject = {
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
      updateProjects(
        projects.map((project) =>
          project.id === selectedProject.id ? { ...project, exists: false } : project,
        ),
      );
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
      showStatus(`已重新记住项目位置：${imported.path}`);
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

  async function loadDocuments(project = currentProject) {
    if (!project) return [];
    const nextDocuments = await invoke<DocumentRecord[]>("list_documents", { path: project.path });
    setDocuments(nextDocuments);
    return nextDocuments;
  }

  async function enterWriter() {
    if (!currentProject) return;
    setIsBusy(true);
    try {
      const nextDocuments = await loadDocuments(currentProject);
      const firstDoc = nextDocuments[0];
      if (firstDoc) {
        setActiveDocumentId(firstDoc.id);
        const html = await invoke<string>("read_document", {
          path: currentProject.path,
          documentId: firstDoc.id,
        });
        setDocumentHtml(html);
      }
      setView("writer");
    } catch (error) {
      showStatus(`读取文档失败：${String(error)}`);
    } finally {
      setIsBusy(false);
    }
  }

  async function selectDocument(document: DocumentRecord) {
    if (!currentProject || document.id === activeDocumentId) return;
    await saveActiveDocument(false);
    setActiveDocumentId(document.id);
    try {
      const html = await invoke<string>("read_document", {
        path: currentProject.path,
        documentId: document.id,
      });
      setDocumentHtml(html);
    } catch (error) {
      showStatus(`读取文档失败：${String(error)}`);
    }
  }

  async function saveActiveDocument(showSaved = true, nextHtml?: string) {
    if (!currentProject || !activeDocumentId) return;
    const content = nextHtml ?? editor?.getHTML() ?? documentHtml;
    try {
      const manifest = await invoke<ProjectManifest>("save_document", {
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
    if (!title) return showStatus("请输入文档名称。");

    setIsBusy(true);
    try {
      const nextDocuments = await invoke<DocumentRecord[]>("create_document", {
        path: currentProject.path,
        title,
      });
      setDocuments(nextDocuments);
      const created = nextDocuments[nextDocuments.length - 1];
      if (created) {
        setActiveDocumentId(created.id);
        setDocumentHtml("");
      }
      closeModalAfterBusy();
      showStatus("文档已创建。");
    } catch (error) {
      showStatus(`创建文档失败：${String(error)}`);
    } finally {
      setIsBusy(false);
    }
  }

  async function renameDocument() {
    if (!currentProject || !modalDocument) return;
    const title = documentTitleInput.trim();
    if (!title) return showStatus("请输入文档名称。");

    setIsBusy(true);
    try {
      const nextDocuments = await invoke<DocumentRecord[]>("rename_document", {
        path: currentProject.path,
        documentId: modalDocument.id,
        title,
      });
      setDocuments(nextDocuments);
      closeModalAfterBusy();
      showStatus("文档已重命名。");
    } catch (error) {
      showStatus(`重命名文档失败：${String(error)}`);
    } finally {
      setIsBusy(false);
    }
  }

  async function deleteDocument(document: DocumentRecord) {
    if (!currentProject) return;
    setIsBusy(true);
    try {
      const nextDocuments = await invoke<DocumentRecord[]>("delete_document", {
        path: currentProject.path,
        documentId: document.id,
      });
      setDocuments(nextDocuments);
      const nextActive = nextDocuments[0];
      if (nextActive) {
        setActiveDocumentId(nextActive.id);
        const html = await invoke<string>("read_document", {
          path: currentProject.path,
          documentId: nextActive.id,
        });
        setDocumentHtml(html);
      } else {
        setActiveDocumentId("");
        setDocumentHtml("");
      }
      showStatus("文档已删除。");
    } catch (error) {
      showStatus(`删除文档失败：${String(error)}`);
    } finally {
      setIsBusy(false);
    }
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
    if (!editor) return;
    editor.chain().focus().setMark("textStyle", { fontSize: size }).run();
  }

  function applyLineHeight(lineHeight: string) {
    if (!editor) return;
    const chain = editor.chain().focus();
    if (editor.isActive("heading")) {
      chain.updateAttributes("heading", { lineHeight }).run();
    } else {
      chain.updateAttributes("paragraph", { lineHeight }).run();
    }
  }

  function openLinkModal() {
    if (!editor) return;
    setLinkUrlInput(editor.getAttributes("link").href ?? "");
    setModalMode("insertLink");
  }

  function applyLink() {
    if (!editor) return;
    const href = linkUrlInput.trim();
    if (!href) {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
    } else {
      editor.chain().focus().extendMarkRange("link").setLink({ href }).run();
    }
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
    const storage = editor.storage as Record<string, { characters?: () => number }>;
    return storage.characterCount?.characters?.() ?? editor.state.doc.textContent.length;
  }

  function toolbarItems(): ToolbarItem[] {
    const canUseTableTools = () => !editor?.isActive("table");
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
      { id: "row", title: "追加表格行", icon: "↕", group: "table", run: () => editor?.chain().focus().addRowAfter().run(), disabled: canUseTableTools },
      { id: "column", title: "追加表格列", icon: "↔", group: "table", run: () => editor?.chain().focus().addColumnAfter().run(), disabled: canUseTableTools },
      { id: "merge", title: "合并单元格", icon: "⇄", group: "table", run: () => editor?.chain().focus().mergeCells().run(), disabled: canUseTableTools },
      { id: "split", title: "拆分单元格", icon: "⇆", group: "table", run: () => editor?.chain().focus().splitCell().run(), disabled: canUseTableTools },
      { id: "deleteTable", title: "删除表格", icon: "×", group: "table", run: () => editor?.chain().focus().deleteTable().run(), disabled: canUseTableTools },
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
        type="button"
        className={`toolbar-button ${isActive ? "active" : ""} ${compact ? "compact" : ""}`}
        onMouseDown={(event) => event.preventDefault()}
        onClick={() => {
          item.run?.();
          setToolbarMoreOpen(false);
        }}
        disabled={isDisabled}
        title={item.title}
        aria-label={item.title}
      >
        <span className={`toolbar-icon toolbar-icon-${item.id}`}>{item.icon}</span>
        {compact ? <span>{item.title}</span> : <span className="tooltip-text">{item.title}</span>}
      </button>
    );
  }

  function renderToolbarControl(item: ToolbarItem, compact = false) {
    if (!editor) return null;
    const currentFontSize = editor.getAttributes("textStyle").fontSize ?? "18px";
    const currentLineHeight =
      editor.getAttributes("paragraph").lineHeight || editor.getAttributes("heading").lineHeight || "1.8";

    if (item.control === "fontSize") {
      return (
        <label key={item.id} className={`toolbar-select-wrap ${compact ? "compact" : ""}`} title="字号">
          <span className="select-label">字号</span>
          <select
            value={currentFontSize}
            onMouseDown={(event) => event.stopPropagation()}
            onChange={(event) => applyFontSize(event.currentTarget.value)}
          >
            {FONT_SIZE_OPTIONS.map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </select>
        </label>
      );
    }

    if (item.control === "lineHeight") {
      return (
        <label key={item.id} className={`toolbar-select-wrap ${compact ? "compact" : ""}`} title="行高">
          <span className="select-label">行高</span>
          <select
            value={currentLineHeight}
            onMouseDown={(event) => event.stopPropagation()}
            onChange={(event) => applyLineHeight(event.currentTarget.value)}
          >
            {LINE_HEIGHT_OPTIONS.map((lineHeight) => (
              <option key={lineHeight} value={lineHeight}>
                {lineHeight}
              </option>
            ))}
          </select>
        </label>
      );
    }

    if (item.control === "color") {
      return (
        <div key={item.id} className={`color-group ${compact ? "compact" : ""}`} title="文字颜色">
          <span className="color-label">A</span>
          {COLOR_PRESETS.map((color) => (
            <button
              key={color}
              type="button"
              className="color-swatch"
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
      <div key={item.id} className={`color-group ${compact ? "compact" : ""}`} title="高亮">
        <span className="highlight-label">▰</span>
        {HIGHLIGHT_PRESETS.map((color) => (
          <button
            key={color}
            type="button"
            className="color-swatch soft"
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

    return (
      <header className="editor-header">
        <div className="editor-meta-row">
          <div className="breadcrumb-wrap">
            <button
              type="button"
              className="icon-button"
              onClick={() => setLeftSidebarOpen((value) => !value)}
              title="显示/隐藏左侧栏"
            >
              ◧
            </button>
            <span>{currentProject?.name ?? "未命名项目"}</span>
            <span className="breadcrumb-separator">›</span>
            <span className="breadcrumb-current">{activeDocument?.title ?? "未选择文档"}</span>
          </div>
          <div className="editor-meta-actions">
            <span className="word-count-pill">{characterCount().toLocaleString("zh-CN")} 字</span>
            <button type="button" className="icon-button" title="搜索">
              ⌕
            </button>
            <button
              type="button"
              className={`ai-toggle-button ${aiPanelOpen ? "active" : ""}`}
              onClick={() => setAiPanelOpen((value) => !value)}
              title="AI 助手"
            >
              ✨
            </button>
          </div>
        </div>

        <div className="full-toolbar" onMouseLeave={() => undefined}>
          <div className="toolbar-row primary-toolbar-row">
            {firstRow.map((item) => renderToolbarButton(item))}
            <button
              type="button"
              className={`toolbar-button more-button ${toolbarMoreOpen ? "active" : ""}`}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => setToolbarMoreOpen((value) => !value)}
              title="更多编辑按钮"
            >
              <span className="toolbar-icon">…</span>
              <span className="tooltip-text">更多</span>
            </button>
            <span className="toolbar-spacer" />
            <button
              type="button"
              className="toolbar-button save-toolbar-button"
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => void saveActiveDocument(true)}
              title="保存"
            >
              <span className="toolbar-icon">✓</span>
              <span className="tooltip-text">保存</span>
            </button>
          </div>
          <div className="toolbar-row secondary-toolbar-row">{secondRow.map((item) => renderToolbarButton(item))}</div>

          {toolbarMoreOpen ? (
            <div className="toolbar-more-menu">
              <div className="toolbar-more-head">
                <span>更多编辑按钮</span>
                <button type="button" onClick={() => setModalMode("preferences")}>
                  首选项…
                </button>
              </div>
              {Object.entries(TOOLBAR_GROUP_LABELS).map(([group, label]) => {
                const items = overflowItems.filter((item) => item.group === group);
                if (items.length === 0) return null;
                return (
                  <section key={group} className="toolbar-more-section">
                    <h4>{label}</h4>
                    <div className="toolbar-more-grid">{items.map((item) => renderToolbarButton(item, true))}</div>
                  </section>
                );
              })}
              {overflowItems.length === 0 ? <p className="toolbar-empty-hint">所有按钮已显示在主工具栏。</p> : null}
            </div>
          ) : null}
        </div>
      </header>
    );
  }

  function renderBubbleMenu() {
    if (!editor) return null;
    return (
      <BubbleMenu editor={editor} tippyOptions={{ duration: 120 }} className="bubble-menu">
        <button
          type="button"
          className={`toolbar-button ${isEditorActive("bold") ? "active" : ""}`}
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => editor.chain().focus().toggleBold().run()}
        >
          <span className="toolbar-icon toolbar-icon-bold">B</span>
        </button>
        <button
          type="button"
          className={`toolbar-button ${isEditorActive("italic") ? "active" : ""}`}
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => editor.chain().focus().toggleItalic().run()}
        >
          <span className="toolbar-icon toolbar-icon-italic">I</span>
        </button>
        <button
          type="button"
          className="toolbar-button"
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => editor.chain().focus().toggleHighlight({ color: "#fef08a" }).run()}
        >
          <span className="toolbar-icon">▰</span>
        </button>
      </BubbleMenu>
    );
  }

  function renderSlashMenu() {
    if (!slashMenuOpen || !editor) return null;
    return (
      <div className="slash-menu">
        <button type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => applySlashCommand("heading1")}>
          <span>H1</span> 一级标题
        </button>
        <button type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => applySlashCommand("heading2")}>
          <span>H2</span> 二级标题
        </button>
        <button type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => applySlashCommand("bullet")}>
          <span>•</span> 无序列表
        </button>
        <button type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => applySlashCommand("task")}>
          <span>☑</span> 任务清单
        </button>
        <button type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => applySlashCommand("quote")}>
          <span>“”</span> 引用
        </button>
        <button type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => applySlashCommand("table")}>
          <span>▦</span> 表格
        </button>
      </div>
    );
  }

  function renderStatus() {
    if (!statusMessage) return null;
    return <div className="status-toast">{statusMessage}</div>;
  }

  function renderPreferencesModal() {
    const allItems = toolbarItems();
    return (
      <div className="modal-backdrop" onClick={closeModal}>
        <div className="modal-card preference-card" onClick={(event) => event.stopPropagation()}>
          <div className="modal-title-row">
            <div>
              <p className="eyebrow">Preferences</p>
              <h2>编辑栏首选项</h2>
            </div>
            <button type="button" className="ghost-button" onClick={() => setVisibleToolbarIds(DEFAULT_VISIBLE_TOOLBAR_IDS)}>
              恢复默认
            </button>
          </div>
          <p className="modal-hint">勾选后会显示在主编辑栏；未勾选的按钮会收纳到 “…” 菜单。主编辑栏支持自动换行，最多按两排优先展示。</p>
          <div className="preference-groups">
            {Object.entries(TOOLBAR_GROUP_LABELS).map(([group, label]) => {
              const items = allItems.filter((item) => item.group === group);
              if (!items.length) return null;
              return (
                <section key={group} className="preference-group">
                  <h3>{label}</h3>
                  <div className="preference-check-grid">
                    {items.map((item) => (
                      <label key={item.id} className="preference-check">
                        <input
                          type="checkbox"
                          checked={visibleToolbarIds.includes(item.id)}
                          onChange={() => toggleToolbarPreference(item.id)}
                        />
                        <span className="preference-icon">{item.icon}</span>
                        <span>{item.title}</span>
                      </label>
                    ))}
                  </div>
                </section>
              );
            })}
          </div>
          <div className="modal-actions">
            <button type="button" className="secondary-button" onClick={closeModal}>
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
        <div className="modal-backdrop" onClick={closeModal}>
          <div className="modal-card compact" onClick={(event) => event.stopPropagation()}>
            <h2>{modalProject.name}</h2>
            <p className="modal-hint">请选择要执行的操作。</p>
            <div className="modal-action-list">
              <button type="button" onClick={() => openRenameModal(modalProject)}>
                修改项目名称
              </button>
              <button type="button" onClick={() => openRelocateModal(modalProject)}>
                重新定位项目文件
              </button>
              <button type="button" className="danger-text" onClick={() => removeFromRecent(modalProject)}>
                从列表删除
              </button>
            </div>
            <div className="modal-actions">
              <button type="button" className="secondary-button" onClick={closeModal}>
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
        <div className="modal-backdrop" onClick={closeModal}>
          <div className="modal-card compact" onClick={(event) => event.stopPropagation()}>
            <h2>{isLink ? "插入/编辑链接" : "插入图片"}</h2>
            <p className="modal-hint">
              {isLink ? "选中文字后输入链接地址；留空可移除链接。" : "当前版本先支持图片 URL，后续可接入本地图片资源库。"}
            </p>
            <label className="form-row">
              {isLink ? "链接地址" : "图片地址"}
              <input
                value={isLink ? linkUrlInput : imageUrlInput}
                onChange={(event) =>
                  isLink ? setLinkUrlInput(event.currentTarget.value) : setImageUrlInput(event.currentTarget.value)
                }
                placeholder={isLink ? "https://example.com" : "https://example.com/image.png"}
              />
            </label>
            <div className="modal-actions">
              <button type="button" className="secondary-button" onClick={closeModal}>
                取消
              </button>
              <button type="button" className="enter-button inline" onClick={isLink ? applyLink : applyImage}>
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
        <div className="modal-backdrop" onClick={closeModal}>
          <div className="modal-card compact" onClick={(event) => event.stopPropagation()}>
            <h2>{modalMode === "createDocument" ? "新建文档" : "重命名文档"}</h2>
            <label className="form-row">
              文档名称
              <input
                value={documentTitleInput}
                onChange={(event) => setDocumentTitleInput(event.currentTarget.value)}
                placeholder="例如：第一章"
              />
            </label>
            <div className="modal-actions">
              <button type="button" className="secondary-button" onClick={closeModal}>
                取消
              </button>
              <button type="button" className="enter-button inline" onClick={() => void submit()} disabled={isBusy}>
                {isBusy ? "处理中…" : "确定"}
              </button>
            </div>
          </div>
        </div>
      );
    }

    const title =
      modalMode === "create"
        ? "创建项目"
        : modalMode === "import"
          ? "打开已有项目"
          : modalMode === "rename"
            ? "修改项目名称"
            : "重新定位项目";
    const confirmLabel =
      modalMode === "create"
        ? "创建"
        : modalMode === "import"
          ? "打开"
          : modalMode === "rename"
            ? "保存名称"
            : "保存新位置";
    const submit =
      modalMode === "create"
        ? createProject
        : modalMode === "import"
          ? importExistingProject
          : modalMode === "rename"
            ? renameProject
            : relocateProject;

    return (
      <div className="modal-backdrop" onClick={closeModal}>
        <div className="modal-card" onClick={(event) => event.stopPropagation()}>
          <h2>{title}</h2>
          {modalMode === "create" || modalMode === "rename" ? (
            <label className="form-row">
              项目名称
              <input
                value={projectNameInput}
                onChange={(event) => setProjectNameInput(event.currentTarget.value)}
                placeholder="例如：我的小说"
              />
            </label>
          ) : null}
          {modalMode === "create" ? (
            <label className="form-row">
              存档文件夹
              <div className="path-picker-row">
                <input value={pathInput} onChange={(event) => setPathInput(event.currentTarget.value)} placeholder="请选择文件夹" />
                <button type="button" className="secondary-button" onClick={() => void chooseFolderForInput("create")}>
                  选择…
                </button>
              </div>
              <small>程序会在这个文件夹里创建一个 .masterpiece 项目档案。</small>
            </label>
          ) : null}
          {modalMode === "import" || modalMode === "relocate" ? (
            <label className="form-row">
              项目文件夹
              <div className="path-picker-row">
                <input
                  value={pathInput}
                  onChange={(event) => setPathInput(event.currentTarget.value)}
                  placeholder="请选择 .masterpiece 项目文件夹"
                />
                <button type="button" className="secondary-button" onClick={() => void chooseFolderForInput("project")}>
                  选择…
                </button>
              </div>
              <small>请选择或输入以 .masterpiece 结尾的项目文件夹。</small>
            </label>
          ) : null}
          <div className="modal-actions">
            <button type="button" className="secondary-button" onClick={closeModal}>
              取消
            </button>
            <button type="button" className="enter-button inline" onClick={() => void submit()} disabled={isBusy}>
              {isBusy ? "处理中…" : confirmLabel}
            </button>
          </div>
        </div>
      </div>
    );
  }

  function renderProjectList() {
    return (
      <div className="app-screen project-screen">
        {renderStatus()}
        {renderModal()}
        <div className="aurora aurora-one" />
        <div className="aurora aurora-two" />
        <div className="project-header glass-panel">
          <div>
            <p className="eyebrow">MasterPieces</p>
            <h1>选择项目</h1>
          </div>
          <div className="header-actions">
            <button type="button" className="secondary-button" onClick={openImportModal}>
              打开已有项目
            </button>
            <button type="button" className="add-button" onClick={openCreateModal} aria-label="创建项目">
              +
            </button>
          </div>
        </div>

        <div className="project-card glass-panel">
          <div className="project-table-head">
            <span>序号</span>
            <span>项目名称</span>
            <span>最后修改时间</span>
            <span>创建时间</span>
          </div>
          {projects.length === 0 && <div className="empty-row">暂无项目，请点击右上角 + 创建。</div>}
          {projects.map((project, index) => (
            <div
              key={project.id}
              className={`project-row ${project.id === selectedId ? "selected" : ""} ${project.exists === false ? "missing" : ""}`}
              onClick={() => setSelectedId(project.id)}
              onDoubleClick={() => void openProject()}
              onContextMenu={(event) => {
                event.preventDefault();
                openActionsModal(project);
              }}
            >
              <span>{index + 1}</span>
              <strong>
                {project.name}
                {project.exists === false ? "（项目文件未找到）" : ""}
              </strong>
              <span>{formatTime(project.updatedAt)}</span>
              <span>{formatTime(project.createdAt)}</span>
            </div>
          ))}
        </div>
        <button type="button" className="enter-button" onClick={() => void openProject()} disabled={!selectedProject || isBusy}>
          进入
        </button>
      </div>
    );
  }

  function renderHub() {
    if (!currentProject) return null;
    return (
      <div className="app-screen hub-screen">
        {renderStatus()}
        {renderModal()}
        <div className="aurora aurora-one" />
        <div className="hub-header glass-panel">
          <button type="button" className="ghost-button" onClick={() => setView("projects")}>
            ← 项目
          </button>
          <div>
            <p className="eyebrow">写作中心</p>
            <h1>{currentProject.name}</h1>
          </div>
        </div>
        <div className="hub-grid">
          <button type="button" className="feature-card glass-panel" onClick={() => void enterWriter()}>
            <span className="feature-icon">✍</span>
            <strong>写作</strong>
            <small>进入项目文档目录与正文编辑区</small>
          </button>
          <button type="button" className="feature-card glass-panel muted-feature" onClick={() => setModalMode("preferences")}>
            <span className="feature-icon">⚙</span>
            <strong>首选项</strong>
            <small>配置编辑按钮与写作界面</small>
          </button>
        </div>
      </div>
    );
  }

  function renderLeftSidebar() {
    if (!currentProject || !leftSidebarOpen) return null;
    return (
      <aside className="doc-sidebar glass-sidebar">
        <div className="sidebar-project-header">
          <div className="project-mark">▯</div>
          <strong>{currentProject.name}</strong>
          <button type="button" className="sidebar-collapse-button" onClick={() => setLeftSidebarOpen(false)} title="隐藏侧边栏">
            ˅
          </button>
        </div>

        <div className="sidebar-scroll">
          <section className="sidebar-section">
            <div className="sidebar-section-title">项目设定</div>
            <button type="button" className="nav-item">
              <span>♙</span> 人物档案
            </button>
            <button type="button" className="nav-item">
              <span>□</span> 世界观设定
            </button>
            <button type="button" className="nav-item">
              <span>✒</span> 大纲与时间线
            </button>
          </section>

          <section className="sidebar-section">
            <div className="sidebar-section-title with-action">
              <span>正文草稿</span>
              <button type="button" className="tiny-button" onClick={openCreateDocumentModal} title="新建文档">
                …
              </button>
            </div>
            <div className="tree-item active-tree">
              <span>⌄</span>
              <span>▰</span>
              <strong>第一卷：{currentProject.name}</strong>
            </div>
            <div className="doc-list">
              {documents.map((doc) => (
                <div
                  key={doc.id}
                  className={`tree-child clickable ${doc.id === activeDocumentId ? "active-doc" : ""}`}
                  onClick={() => void selectDocument(doc)}
                  onContextMenu={(event) => {
                    event.preventDefault();
                    openRenameDocumentModal(doc);
                  }}
                >
                  <span className="doc-title-wrap">
                    <span>▤</span>
                    <span className="doc-title-text">{doc.title}</span>
                  </span>
                  {doc.id !== "main" ? (
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        void deleteDocument(doc);
                      }}
                      title="删除文档"
                    >
                      ×
                    </button>
                  ) : null}
                </div>
              ))}
              {documents.length === 0 ? <div className="empty-doc-hint">还没有文档，点击 “…” 新建。</div> : null}
            </div>
          </section>
        </div>

        <div className="sidebar-footer">
          <button type="button" className="nav-item" onClick={() => setModalMode("preferences")}>
            <span>⚙</span> 软件设置
          </button>
        </div>
      </aside>
    );
  }

  function renderAiPanel() {
    if (!aiPanelOpen) return null;
    return (
      <aside className="ai-sidebar glass-sidebar">
        <div className="ai-tabs">
          <button type="button" className="ai-tab active">
            <span>✨</span> AI 助手
          </button>
          <button type="button" className="ai-tab">
            <span>▤</span> 参考设定
          </button>
        </div>
        <div className="ai-panel-body">
          <div className="ai-card">
            <div className="ai-card-title">
              <span>✨</span>
              <strong>剧情推演（本地 Ollama）</strong>
            </div>
            <p>
              根据设定，主角在这里醒来后，遇到巡逻兵的概率很高。建议让他先发现遗留的终端机，获取部分背景信息，然后再展开冲突。需要我帮你生成一段环境描写的扩写吗？
            </p>
            <div className="ai-actions">
              <button type="button">扩写环境</button>
              <button type="button" className="secondary-ai-action">生成巡逻兵设定</button>
            </div>
          </div>
          <div className="chapter-note-card">
            <h3>本章目标备忘</h3>
            <ul>
              <li>交代末日背景</li>
              <li>主角发现自己失忆</li>
              <li>埋下手臂受伤的伏笔</li>
            </ul>
          </div>
        </div>
        <div className="ai-input-wrap">
          <input readOnly placeholder="询问 AI 关于剧情的建议..." />
          <button type="button">↵</button>
        </div>
      </aside>
    );
  }

  function renderWriter() {
    if (!currentProject) return null;
    return (
      <div className="writer-shell dark-shell">
        {renderStatus()}
        {renderModal()}
        <div className="aurora aurora-one" />
        <div className="aurora aurora-two" />
        {renderLeftSidebar()}
        <main className="editor-pane">
          <div className="window-titlebar">
            <div className="window-title">Mastps Editor UI</div>
            <div className="window-actions">
              <button type="button" title="同步状态">☁</button>
              <button type="button" onClick={() => editor?.chain().focus().undo().run()} title="撤销">
                ↶
              </button>
              <button type="button" onClick={() => editor?.chain().focus().redo().run()} title="重做">
                ↷
              </button>
              <button type="button" onClick={() => setView("hub")} title="关闭编辑器">
                ×
              </button>
            </div>
          </div>
          {renderEditorToolbar()}
          <div className="editor-workspace">
            {renderBubbleMenu()}
            {renderSlashMenu()}
            <EditorContent editor={editor} className="tiptap-editor-frame" />
          </div>
        </main>
        {renderAiPanel()}
      </div>
    );
  }

  if (view === "splash") {
    return (
      <div className="app-shell centered splash-screen">
        <div className="aurora aurora-one" />
        <div className="splash-card glass-panel">
          <h1>MasterPieces</h1>
        </div>
      </div>
    );
  }

  if (view === "hub") return renderHub();
  if (view === "writer") return renderWriter();
  return renderProjectList();
}

export default App;

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
  | null;

const RECENT_PROJECTS_KEY = "masterpieces.recentProjects.v1";

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
const COLOR_PRESETS = ["#111111", "#7c2d12", "#92400e", "#166534", "#1d4ed8", "#6d28d9", "#be123c"];
const HIGHLIGHT_PRESETS = ["#fef08a", "#fed7aa", "#bbf7d0", "#bfdbfe", "#e9d5ff"];

type IconName =
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
  | "left"
  | "center"
  | "right"
  | "justify"
  | "bullet"
  | "ordered"
  | "task"
  | "quote"
  | "codeBlock"
  | "rule"
  | "link"
  | "image"
  | "table"
  | "highlight"
  | "color"
  | "save"
  | "delete"
  | "row"
  | "column"
  | "merge"
  | "split";

function Icon({ name }: { name: IconName }) {
  const text: Record<IconName, string> = {
    undo: "↶",
    redo: "↷",
    paragraph: "¶",
    h1: "H1",
    h2: "H2",
    h3: "H3",
    h4: "H4",
    bold: "B",
    italic: "I",
    underline: "U",
    strike: "S",
    code: "</>",
    left: "≡",
    center: "≣",
    right: "≡",
    justify: "▤",
    bullet: "•",
    ordered: "1.",
    task: "☑",
    quote: "❝",
    codeBlock: "▣",
    rule: "—",
    link: "🔗",
    image: "▧",
    table: "▦",
    highlight: "▰",
    color: "A",
    save: "✓",
    delete: "×",
    row: "↕",
    column: "↔",
    merge: "⇄",
    split: "↔",
  };
  return <span className={`toolbar-icon toolbar-icon-${name}`}>{text[name]}</span>;
}

type ToolbarButtonProps = {
  title: string;
  icon: IconName;
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
};

function ToolbarButton({ title, icon, active, disabled, onClick }: ToolbarButtonProps) {
  return (
    <button
      type="button"
      className={`toolbar-button ${active ? "active" : ""}`}
      onMouseDown={(event) => event.preventDefault()}
      onClick={onClick}
      title={title}
      aria-label={title}
      disabled={disabled}
    >
      <Icon name={icon} />
      <span className="tooltip-text">{title}</span>
    </button>
  );
}


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

function App() {
  const [view, setView] = useState<View>("splash");
  const [projects, setProjects] = useState<ProjectRecord[]>(() =>
    loadRecentProjects(),
  );
  const [selectedId, setSelectedId] = useState<string>("");
  const [currentProject, setCurrentProject] = useState<ProjectRecord | null>(
    null,
  );
  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [activeDocumentId, setActiveDocumentId] = useState("");
  const [documentHtml, setDocumentHtml] = useState("");
  const [modalMode, setModalMode] = useState<ModalMode>(null);
  const [modalProject, setModalProject] = useState<ProjectRecord | null>(null);
  const [modalDocument, setModalDocument] = useState<DocumentRecord | null>(
    null,
  );
  const [projectNameInput, setProjectNameInput] = useState("");
  const [documentTitleInput, setDocumentTitleInput] = useState("");
  const [pathInput, setPathInput] = useState("");
  const [linkUrlInput, setLinkUrlInput] = useState("");
  const [imageUrlInput, setImageUrlInput] = useState("");
  const [slashMenuOpen, setSlashMenuOpen] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const [isBusy, setIsBusy] = useState(false);
  const saveTimerRef = useRef<number | null>(null);
  const [editorTick, setEditorTick] = useState(0);

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

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3, 4] },
      }),
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
          node.type.name === "heading" ? "请输入标题……" : "开始写作，输入 / 可打开快捷菜单……",
      }),
    ],
    content: "",
    editorProps: {
      attributes: {
        class: "writer-editor rich-editor",
      },
      handleDOMEvents: {
        blur: () => {
          void saveActiveDocument(false);
          return false;
        },
        keydown: (_view, event) => {
          if (event.key === "Escape") setSlashMenuOpen(false);
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
      const prompt =
        kind === "create"
          ? "请选择项目要保存到哪个文件夹"
          : "请选择 .masterpiece 项目文件夹";
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
          const manifest = await invoke<ProjectManifest>(
            "read_project_manifest",
            { path: project.path },
          );
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
      const created = await invoke<ProjectRecord>("create_project", {
        name,
        parentPath,
      });
      const nextProjects = [
        created,
        ...projects.filter((project) => project.id !== created.id),
      ];
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
      const nextProjects = [
        imported,
        ...projects.filter((project) => project.id !== imported.id),
      ];
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
      const manifest = await invoke<ProjectManifest>("read_project_manifest", {
        path: selectedProject.path,
      });
      const updatedProject = {
        ...selectedProject,
        name: manifest.name,
        createdAt: manifest.createdAt,
        updatedAt: manifest.updatedAt,
        exists: true,
      };
      updateProjects([
        updatedProject,
        ...projects.filter((project) => project.id !== updatedProject.id),
      ]);
      setCurrentProject(updatedProject);
      setView("hub");
    } catch {
      showStatus("项目文件未找到，请重新定位该项目。");
      updateProjects(
        projects.map((project) =>
          project.id === selectedProject.id
            ? { ...project, exists: false }
            : project,
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
      const manifest = await invoke<ProjectManifest>("rename_project", {
        path: modalProject.path,
        name,
      });
      updateProjects(
        projects.map((item) =>
          item.id === modalProject.id
            ? {
                ...item,
                name: manifest.name,
                updatedAt: manifest.updatedAt,
                exists: true,
              }
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
        ...projects.filter(
          (item) => item.id !== imported.id && item.id !== modalProject.id,
        ),
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
    const nextDocuments = await invoke<DocumentRecord[]>("list_documents", {
      path: project.path,
    });
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
      const updatedProject = {
        ...currentProject,
        updatedAt: manifest.updatedAt,
        exists: true,
      };
      setCurrentProject(updatedProject);
      updateProjects(
        projects.map((item) =>
          item.id === updatedProject.id ? updatedProject : item,
        ),
      );
      setDocuments((items) =>
        items.map((doc) =>
          doc.id === activeDocumentId
            ? { ...doc, updatedAt: manifest.updatedAt }
            : doc,
        ),
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

  function renderEditorToolbar() {
    if (!editor) return null;
    const canUseTableTools = editor.isActive("table");
    const currentFontSize = editor.getAttributes("textStyle").fontSize ?? "18px";
    const currentLineHeight =
      editor.getAttributes("paragraph").lineHeight || editor.getAttributes("heading").lineHeight || "1.8";

    return (
      <div className="editor-toolbar full-toolbar">
        <div className="toolbar-row">
          <ToolbarButton title="撤销" icon="undo" onClick={() => editor.chain().focus().undo().run()} />
          <ToolbarButton title="重做" icon="redo" onClick={() => editor.chain().focus().redo().run()} />
          <span className="toolbar-divider" />
          <ToolbarButton title="正文" icon="paragraph" active={isEditorActive("paragraph")} onClick={setParagraph} />
          <ToolbarButton title="一级标题" icon="h1" active={isEditorActive("heading", { level: 1 })} onClick={() => setHeading(1)} />
          <ToolbarButton title="二级标题" icon="h2" active={isEditorActive("heading", { level: 2 })} onClick={() => setHeading(2)} />
          <ToolbarButton title="三级标题" icon="h3" active={isEditorActive("heading", { level: 3 })} onClick={() => setHeading(3)} />
          <ToolbarButton title="四级标题" icon="h4" active={isEditorActive("heading", { level: 4 })} onClick={() => setHeading(4)} />
          <span className="toolbar-divider" />
          <ToolbarButton title="加粗" icon="bold" active={isEditorActive("bold")} onClick={() => editor.chain().focus().toggleBold().run()} />
          <ToolbarButton title="斜体" icon="italic" active={isEditorActive("italic")} onClick={() => editor.chain().focus().toggleItalic().run()} />
          <ToolbarButton title="下划线" icon="underline" active={isEditorActive("underline")} onClick={() => editor.chain().focus().toggleUnderline().run()} />
          <ToolbarButton title="删除线" icon="strike" active={isEditorActive("strike")} onClick={() => editor.chain().focus().toggleStrike().run()} />
          <ToolbarButton title="行内代码" icon="code" active={isEditorActive("code")} onClick={() => editor.chain().focus().toggleCode().run()} />
          <span className="toolbar-divider" />
          <ToolbarButton title="左对齐" icon="left" active={isEditorActive("textAlign", { textAlign: "left" })} onClick={() => setTextAlign("left")} />
          <ToolbarButton title="居中" icon="center" active={isEditorActive("textAlign", { textAlign: "center" })} onClick={() => setTextAlign("center")} />
          <ToolbarButton title="右对齐" icon="right" active={isEditorActive("textAlign", { textAlign: "right" })} onClick={() => setTextAlign("right")} />
          <ToolbarButton title="两端对齐" icon="justify" active={isEditorActive("textAlign", { textAlign: "justify" })} onClick={() => setTextAlign("justify")} />
          <span className="toolbar-spacer" />
          <span className="toolbar-doc-title">{activeDocument?.title ?? "未选择文档"}</span>
          <span className="word-count">{editor.storage.characterCount?.characters?.() ?? editor.state.doc.textContent.length} 字</span>
          <ToolbarButton title="保存" icon="save" onClick={() => void saveActiveDocument(true)} />
        </div>

        <div className="toolbar-row">
          <ToolbarButton title="无序列表" icon="bullet" active={isEditorActive("bulletList")} onClick={() => editor.chain().focus().toggleBulletList().run()} />
          <ToolbarButton title="有序列表" icon="ordered" active={isEditorActive("orderedList")} onClick={() => editor.chain().focus().toggleOrderedList().run()} />
          <ToolbarButton title="任务清单" icon="task" active={isEditorActive("taskList")} onClick={() => editor.chain().focus().toggleTaskList().run()} />
          <span className="toolbar-divider" />
          <ToolbarButton title="引用" icon="quote" active={isEditorActive("blockquote")} onClick={() => editor.chain().focus().toggleBlockquote().run()} />
          <ToolbarButton title="代码块" icon="codeBlock" active={isEditorActive("codeBlock")} onClick={() => editor.chain().focus().toggleCodeBlock().run()} />
          <ToolbarButton title="分割线" icon="rule" onClick={() => editor.chain().focus().setHorizontalRule().run()} />
          <span className="toolbar-divider" />
          <ToolbarButton title="链接" icon="link" active={isEditorActive("link")} onClick={openLinkModal} />
          <ToolbarButton title="图片" icon="image" onClick={openImageModal} />
          <ToolbarButton title="插入表格" icon="table" active={canUseTableTools} onClick={insertTable} />
          <ToolbarButton title="增加行" icon="row" disabled={!canUseTableTools} onClick={() => editor.chain().focus().addRowAfter().run()} />
          <ToolbarButton title="增加列" icon="column" disabled={!canUseTableTools} onClick={() => editor.chain().focus().addColumnAfter().run()} />
          <ToolbarButton title="合并单元格" icon="merge" disabled={!canUseTableTools} onClick={() => editor.chain().focus().mergeCells().run()} />
          <ToolbarButton title="拆分单元格" icon="split" disabled={!canUseTableTools} onClick={() => editor.chain().focus().splitCell().run()} />
          <ToolbarButton title="删除表格" icon="delete" disabled={!canUseTableTools} onClick={() => editor.chain().focus().deleteTable().run()} />
          <span className="toolbar-divider" />
          <label className="toolbar-select-wrap" title="字体大小">
            <span className="select-label">字号</span>
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
          <label className="toolbar-select-wrap" title="行高">
            <span className="select-label">行高</span>
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
          <span className="color-group" title="文字颜色">
            <Icon name="color" />
            {COLOR_PRESETS.map((color) => (
              <button
                key={color}
                type="button"
                className="color-swatch"
                style={{ backgroundColor: color }}
                aria-label={`文字颜色 ${color}`}
                title={`文字颜色 ${color}`}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => editor.chain().focus().setColor(color).run()}
              />
            ))}
          </span>
          <span className="color-group" title="高亮">
            <Icon name="highlight" />
            {HIGHLIGHT_PRESETS.map((color) => (
              <button
                key={color}
                type="button"
                className="color-swatch"
                style={{ backgroundColor: color }}
                aria-label={`高亮 ${color}`}
                title={`高亮 ${color}`}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => editor.chain().focus().toggleHighlight({ color }).run()}
              />
            ))}
          </span>
        </div>
      </div>
    );
  }

  function renderBubbleMenu() {
    if (!editor) return null;
    return (
      <BubbleMenu editor={editor} className="bubble-menu" tippyOptions={{ duration: 120 }}>
        <ToolbarButton title="加粗" icon="bold" active={isEditorActive("bold")} onClick={() => editor.chain().focus().toggleBold().run()} />
        <ToolbarButton title="斜体" icon="italic" active={isEditorActive("italic")} onClick={() => editor.chain().focus().toggleItalic().run()} />
        <ToolbarButton title="高亮" icon="highlight" active={isEditorActive("highlight")} onClick={() => editor.chain().focus().toggleHighlight({ color: "#fef08a" }).run()} />
        <ToolbarButton title="链接" icon="link" active={isEditorActive("link")} onClick={openLinkModal} />
      </BubbleMenu>
    );
  }

  function renderSlashMenu() {
    if (!slashMenuOpen || !editor) return null;
    return (
      <div className="slash-menu">
        <button onMouseDown={(event) => event.preventDefault()} onClick={() => applySlashCommand("heading1")}>
          <Icon name="h1" /> 一级标题
        </button>
        <button onMouseDown={(event) => event.preventDefault()} onClick={() => applySlashCommand("heading2")}>
          <Icon name="h2" /> 二级标题
        </button>
        <button onMouseDown={(event) => event.preventDefault()} onClick={() => applySlashCommand("bullet")}>
          <Icon name="bullet" /> 无序列表
        </button>
        <button onMouseDown={(event) => event.preventDefault()} onClick={() => applySlashCommand("task")}>
          <Icon name="task" /> 任务清单
        </button>
        <button onMouseDown={(event) => event.preventDefault()} onClick={() => applySlashCommand("quote")}>
          <Icon name="quote" /> 引用
        </button>
        <button onMouseDown={(event) => event.preventDefault()} onClick={() => applySlashCommand("table")}>
          <Icon name="table" /> 表格
        </button>
      </div>
    );
  }

  function renderStatus() {
    if (!statusMessage) return null;
    return <div className="status-toast">{statusMessage}</div>;
  }

  function renderModal() {
    if (!modalMode) return null;

    if (modalMode === "actions" && modalProject) {
      return (
        <div className="modal-backdrop" onMouseDown={closeModal}>
          <section
            className="modal-card compact"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <h2>{modalProject.name}</h2>
            <p className="modal-hint">请选择要执行的操作。</p>
            <div className="modal-action-list">
              <button onClick={() => openRenameModal(modalProject)}>
                修改项目名称
              </button>
              <button onClick={() => openRelocateModal(modalProject)}>
                重新定位项目文件
              </button>
              <button
                className="danger-text"
                onClick={() => removeFromRecent(modalProject)}
              >
                从列表删除
              </button>
            </div>
            <div className="modal-actions">
              <button className="secondary-button" onClick={closeModal}>
                取消
              </button>
            </div>
          </section>
        </div>
      );
    }

    if (modalMode === "insertLink" || modalMode === "insertImage") {
      const isLink = modalMode === "insertLink";
      return (
        <div className="modal-backdrop" onMouseDown={closeModal}>
          <section
            className="modal-card"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <h2>{isLink ? "插入/编辑链接" : "插入图片"}</h2>
            <p className="modal-hint">
              {isLink ? "选中文字后输入链接地址；留空可移除链接。" : "当前版本先支持图片 URL，后续会接入本地图片资源库。"}
            </p>
            <label className="form-row">
              <span>{isLink ? "链接地址" : "图片地址"}</span>
              <input
                autoFocus
                value={isLink ? linkUrlInput : imageUrlInput}
                onChange={(event) =>
                  isLink
                    ? setLinkUrlInput(event.currentTarget.value)
                    : setImageUrlInput(event.currentTarget.value)
                }
                placeholder={isLink ? "https://example.com" : "https://example.com/image.png"}
              />
            </label>
            <div className="modal-actions">
              <button className="secondary-button" onClick={closeModal} disabled={isBusy}>
                取消
              </button>
              <button
                className="enter-button inline"
                onClick={isLink ? applyLink : applyImage}
                disabled={isBusy}
              >
                确定
              </button>
            </div>
          </section>
        </div>
      );
    }

    if (modalMode === "createDocument" || modalMode === "renameDocument") {
      const submit =
        modalMode === "createDocument" ? createDocument : renameDocument;
      return (
        <div className="modal-backdrop" onMouseDown={closeModal}>
          <section
            className="modal-card"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <h2>
              {modalMode === "createDocument" ? "新建文档" : "重命名文档"}
            </h2>
            <label className="form-row">
              <span>文档名称</span>
              <input
                autoFocus
                value={documentTitleInput}
                onChange={(event) =>
                  setDocumentTitleInput(event.currentTarget.value)
                }
                placeholder="例如：第一章"
              />
            </label>
            <div className="modal-actions">
              <button
                className="secondary-button"
                onClick={closeModal}
                disabled={isBusy}
              >
                取消
              </button>
              <button
                className="enter-button inline"
                onClick={() => void submit()}
                disabled={isBusy}
              >
                {isBusy ? "处理中…" : "确定"}
              </button>
            </div>
          </section>
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
      <div className="modal-backdrop" onMouseDown={closeModal}>
        <section
          className="modal-card"
          onMouseDown={(event) => event.stopPropagation()}
        >
          <h2>{title}</h2>
          {modalMode === "create" || modalMode === "rename" ? (
            <label className="form-row">
              <span>项目名称</span>
              <input
                autoFocus
                value={projectNameInput}
                onChange={(event) =>
                  setProjectNameInput(event.currentTarget.value)
                }
                placeholder="例如：我的小说"
              />
            </label>
          ) : null}

          {modalMode === "create" ? (
            <label className="form-row">
              <span>存档文件夹</span>
              <div className="path-picker-row">
                <input
                  value={pathInput}
                  onChange={(event) => setPathInput(event.currentTarget.value)}
                  placeholder="请选择文件夹"
                />
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => void chooseFolderForInput("create")}
                >
                  选择…
                </button>
              </div>
              <small>
                程序会在这个文件夹里创建一个 .masterpiece 项目档案。
              </small>
            </label>
          ) : null}

          {modalMode === "import" || modalMode === "relocate" ? (
            <label className="form-row">
              <span>项目文件夹</span>
              <div className="path-picker-row">
                <input
                  autoFocus
                  value={pathInput}
                  onChange={(event) => setPathInput(event.currentTarget.value)}
                  placeholder="请选择 .masterpiece 项目文件夹"
                />
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => void chooseFolderForInput("project")}
                >
                  选择…
                </button>
              </div>
              <small>请选择或输入以 .masterpiece 结尾的项目文件夹。</small>
            </label>
          ) : null}

          <div className="modal-actions">
            <button
              className="secondary-button"
              onClick={closeModal}
              disabled={isBusy}
            >
              取消
            </button>
            <button
              className="enter-button inline"
              onClick={() => void submit()}
              disabled={isBusy}
            >
              {isBusy ? "处理中…" : confirmLabel}
            </button>
          </div>
        </section>
      </div>
    );
  }

  if (view === "splash") {
    return (
      <main className="app-shell centered">
        <section className="splash-card">
          <h1>MasterPieces</h1>
        </section>
      </main>
    );
  }

  if (view === "hub" && currentProject) {
    return (
      <main className="app-shell page-shell">
        {renderStatus()}
        <header className="topbar">
          <button className="ghost-button" onClick={() => setView("projects")}>
            ← 项目
          </button>
          <div>
            <p className="eyebrow">写作中心</p>
            <h1>{currentProject.name}</h1>
          </div>
        </header>
        <section className="hub-grid">
          <button
            className="feature-card"
            onClick={enterWriter}
            disabled={isBusy}
          >
            <span className="feature-icon">✍</span>
            <strong>写作</strong>
            <small>进入项目文档目录与正文编辑区</small>
          </button>
        </section>
      </main>
    );
  }

  if (view === "writer" && currentProject) {
    return (
      <main className="writer-shell">
        {renderStatus()}
        {renderModal()}
        <aside className="doc-sidebar">
          <div className="sidebar-header">
            <button className="ghost-button" onClick={() => setView("hub")}>
              ←
            </button>
            <strong>{currentProject.name}</strong>
          </div>
          <div className="sidebar-section-title">
            <span>项目文档</span>
            <button
              className="mini-add-button"
              onClick={openCreateDocumentModal}
            >
              +
            </button>
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
                <span>📄 {doc.title}</span>
                {doc.id !== "main" ? (
                  <button
                    onClick={(event) => {
                      event.stopPropagation();
                      void deleteDocument(doc);
                    }}
                  >
                    ×
                  </button>
                ) : null}
              </div>
            ))}
          </div>
          <div className="tree-item muted">🗑 废纸篓</div>
          <p className="sidebar-tip">右键文档可重命名，点击 × 删除。</p>
        </aside>
        <section className="editor-pane">
          {renderEditorToolbar()}
          <div className="editor-workspace">
            {renderBubbleMenu()}
            {renderSlashMenu()}
          <EditorContent editor={editor} className="tiptap-editor-frame" />
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="app-shell page-shell">
      {renderStatus()}
      {renderModal()}
      <header className="project-header">
        <div>
          <p className="eyebrow">MasterPieces</p>
          <h1>选择项目</h1>
        </div>
        <div className="header-actions">
          <button className="secondary-button" onClick={openImportModal}>
            打开已有项目
          </button>
          <button
            className="add-button"
            onClick={openCreateModal}
            title="创建项目"
          >
            +
          </button>
        </div>
      </header>

      <section className="project-card">
        <div className="project-table-head">
          <span>序号</span>
          <span>项目名称</span>
          <span>最后修改时间</span>
          <span>创建时间</span>
        </div>
        <div className="project-table-body">
          {projects.length === 0 && (
            <div className="empty-row">暂无项目，请点击右上角 + 创建。</div>
          )}
          {projects.map((project, index) => (
            <div
              key={project.id}
              className={`project-row ${selectedId === project.id ? "selected" : ""} ${project.exists === false ? "missing" : ""}`}
              onClick={() => setSelectedId(project.id)}
              onDoubleClick={() => void openProject()}
              onContextMenu={(event) => {
                event.preventDefault();
                openActionsModal(project);
              }}
            >
              <span>{index + 1}</span>
              <span>
                {project.name}
                {project.exists === false ? "（项目文件未找到）" : ""}
              </span>
              <span>{formatTime(project.updatedAt)}</span>
              <span>{formatTime(project.createdAt)}</span>
            </div>
          ))}
        </div>
      </section>

      <button
        className="enter-button"
        disabled={!selectedProject || isBusy}
        onClick={() => void openProject()}
      >
        进入
      </button>
    </main>
  );
}

export default App;

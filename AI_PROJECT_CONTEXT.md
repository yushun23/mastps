# AI 项目说明：Mastps / MasterPieces

> 用途：给后续接手本仓库的 AI / 开发者快速了解项目状态、运行环境、关键文件、数据格式和修改注意事项。  
> 更新日期：2026-05-29  
> 依据：对当前最新项目包 `mastps-main-status-menu-editor-paper-fixed.zip` 做静态检查，并结合最近几轮 UI / 功能修改记录整理。  
> 重要说明：本文件为静态分析结果；当前环境没有完整运行 Tauri 构建与前端安装测试，未执行 `npm install`、`npm run type-check`、`npm run tauri:dev` 或 `cargo check`。

---

## 1. 项目定位

Mastps / MasterPieces 是一个本地优先的中文长篇写作桌面应用，面向小说、长篇叙事、设定整理、人物资料、时间线和灵感管理。

当前形态：

- 前端：React + TypeScript + Tiptap / ProseMirror。
- 桌面壳与本地文件系统：Tauri 2 + Rust。
- 项目数据主要保存在本地项目文件夹里，实际项目格式是 `.masterpiece` 目录。
- 人物 / 设定 / 时间线 / 灵感等资料卡目前仍保存在浏览器 `localStorage`，导出时由前端传给 Rust 后端。
- README 中提到的 SQLite / FTS / AI Provider / Ollama / `.storyproj` 等内容大多仍是规划描述，不代表当前代码已完整落地。

---

## 2. 当前最新功能状态

### 已实现 / 已基本成型

- 启动页、项目列表页、写作工作区。
- 最近项目列表，存储于 `localStorage`。
- 创建项目、导入项目、重命名项目、重新定位项目。
- `.masterpiece` 项目目录。
- Binder 树：`草稿 draft` 与 `大纲 outline` 两棵树。
- 撰写模块中目前只显示草稿 / 正文相关内容，不显示大纲作业区域。
- Binder 节点新增、重命名、删除、子文稿创建、正文读写。
- 标题 / 图标编辑弹窗，支持从内置图标列表中选择图标。
- Tiptap 富文本编辑器：段落、标题、粗体、斜体、下划线、删除线、引用、代码、对齐、列表、任务列表、链接、图片、表格、分隔线、颜色、高亮、撤销 / 重做。
- 字体选择：后端读取系统字体列表，前端下拉选择。
- 字号控制：工具栏保留预设值，也支持手动输入。
- 字体 / 字号：基于 Tiptap `textStyle` mark，支持对选中文字单独设置；没有选中文字时影响后续输入。
- 行高：应用到段落 / 标题。
- “文”按钮：当前文档一键开启 / 取消首行缩进两个字，不同文档互不影响，写入当前文档 HTML。
- 自动保存：编辑器内容更新后约 900ms 自动保存，失焦时也保存。
- 顶部工具栏已调整为：字体、首行缩进、字号、行高等优先出现在最前面。
- 首选项：通用、编辑、导出三张主卡片。
- 首选项 → 通用：界面文字大小支持手动输入，不是预制选项。
- 首选项 → 编辑：先显示入口卡片；进入“主工具栏”后才编辑工具栏显示项。
- 首选项 → 编辑 → 状态：可编辑状态列表，默认：草稿 / 初稿 / 最终，并支持颜色选择。
- 文档 `...` 菜单里有“状态”项，悬停展开状态子菜单；选择后文档名旁显示同色状态标记。
- 左侧目录宽度支持鼠标拖拽，并按当前项目记忆。
- 正文纸张高度已改成按内容扩展，避免长文被固定纸张高度截断。
- Markdown 导出：首选项 → 导出，可以将项目文件、大纲、人物、设定、时间线、灵感等导出为 Markdown 文件夹并压缩为 zip 放到桌面。
- 压缩包生成已改为 Rust 内置 `zip` crate，不再依赖系统 `PowerShell Compress-Archive` 或 `zip` 命令。
- 自绘标题栏与窗口按钮：最小化、最大化、关闭。

### 仍未真正落地 / 仍属于规划

- SQLite + FTS 全文搜索。
- AI Provider 抽象层。
- 云端 AI、Ollama、llama.cpp 集成。
- `.storyproj` 格式。当前实际是 `.masterpiece`。
- Tantivy / 关系图可视化。
- 完整备份系统。
- 多文件模块化架构。目前 `src/App.tsx` 仍是超大单文件。
- 资料卡本地文件系统化。目前资料卡仍存 `localStorage`。

---

## 3. 技术栈与版本线索

### 前端

`package.json` 中主要依赖：

- React：`^18.2.0`
- TypeScript：`^5.0.0`
- Vite：`^8.0.11`
- Tiptap：`^2.27.2`
- Tailwind CSS：`^3.3.0`
- Tauri JS API：`@tauri-apps/api ^2.0.0`

当前存在但业务里基本未真正使用或未完整接入的依赖：

- `@tanstack/react-query`
- `axios`
- `sqlite3`
- `zustand`

### Rust / Tauri

`src-tauri/Cargo.toml`：

- Rust edition：2021
- `tauri = "2"`
- `tauri-plugin-dialog = "2"`
- `serde`
- `serde_json`
- `uuid`
- `chrono`
- `zip = "0.6"`

---

## 4. 推荐运行命令

在项目根目录：

```bash
npm install
npm run tauri:dev
```

其他命令：

```bash
npm run dev          # 仅启动 Vite 前端，端口 1420
npm run build        # 构建前端 dist
npm run tauri:build  # Tauri 打包
npm run type-check   # TypeScript 类型检查
```

Rust 侧单独检查：

```bash
cd src-tauri
cargo check
cargo build
```

注意：仓库根目录没有正式 Rust 项目，只有 `Cargo.toml.bak`。真正的 Rust / Tauri 项目在 `src-tauri/`。

---

## 5. 当前主要目录结构

```text
mastps-main/
├── AI_PROJECT_CONTEXT.md
├── README.md
├── package.json
├── package-lock.json
├── index.html
├── vite.config.ts
├── tailwind.config.js
├── postcss.config.js
├── tsconfig.json
├── tsconfig.node.json
├── scripts/
│   └── fix-tauri-main-window.mjs
├── src/
│   ├── App.tsx
│   ├── index.css
│   ├── main.tsx
│   └── icons/
│       └── binderIcons.ts
└── src-tauri/
    ├── Cargo.toml
    ├── Cargo.lock
    ├── build.rs
    ├── tauri.conf.json
    ├── capabilities/default.json
    ├── icons/
    └── src/main.rs
```

---

## 6. 关键文件说明

### `src/App.tsx`

当前前端主文件，承担了大部分业务逻辑与 UI 渲染。后续 AI 修改时应优先阅读此文件。

包含内容：

- 图标组件与前端类型定义：`ProjectRecord`、`BinderNode`、`BinderState`、`ResourceRecord`、`TextStatus`、`ToolbarItemId` 等。
- 全局常量：最近项目 key、工具栏偏好 key、UI 字号 key、状态 key、侧栏宽度 key、资料卡 key。
- Tiptap 扩展：
  - `FontSize`
  - `FontFamily`
  - `TextIndent`
  - `LineHeight`
- 项目列表、当前项目、Binder、当前文档、资料卡状态。
- 自动保存、文档切换、导出、系统字体加载。
- 编辑器工具栏、更多菜单、首选项弹窗、状态菜单、资料卡 UI。

`App.tsx` 仍然过大。后续长期维护建议拆分为：

```text
src/types/
src/services/tauriCommands.ts
src/hooks/useAutosave.ts
src/hooks/useProjectPrefs.ts
src/components/Editor/
src/components/Binder/
src/components/Preferences/
src/components/Resources/
src/components/ProjectList/
```

### `src/index.css`

全量样式文件，包含：

- 启动页、项目页、工作区、左侧导航。
- 编辑器工具栏、正文纸张、滚动区域。
- Binder 树、文档菜单、状态子菜单。
- 首选项通用 / 编辑 / 状态 / 导出卡片。
- 资料卡模块。
- 侧栏拖拽宽度相关样式。
- UI 字号 CSS 变量：`--ui-font-size`。

注意：该文件中有多轮追加样式，存在重复选择器。继续改 UI 时，优先查看文件尾部的新规则，因为很多修复是通过后置 CSS 覆盖实现的。

### `src/icons/binderIcons.ts`

内置图标列表文件，用于标题 / 图标弹窗中的图标选择。

### `src-tauri/src/main.rs`

Rust 后端主文件，负责项目文件系统、Tauri 命令与 Markdown 导出。

当前注册命令包括：

```text
choose_folder
create_project
import_project
read_project_manifest
rename_project
list_documents
create_document
rename_document
delete_document
read_document
save_document
list_outline_documents
create_outline_document
rename_outline_document
delete_outline_document
read_outline_document
save_outline_document
read_main_document
save_main_document
read_binder
update_binder_root
create_binder_document
rename_binder_document
delete_binder_document
read_binder_document
save_binder_document
list_system_fonts
export_project_markdown_zip
```

其中：

- `list_documents` / `create_document` 等旧式 documents API 仍存在，用于兼容旧结构。
- 当前前端主要使用 Binder API：`read_binder`、`create_binder_document`、`rename_binder_document`、`delete_binder_document`、`read_binder_document`、`save_binder_document`。
- `list_system_fonts` 会扫描常见字体目录，并附带固定中文 / 英文字体兜底列表。
- `export_project_markdown_zip` 会保存当前项目为 Markdown 导出目录，再用 Rust `zip` crate 压缩到桌面。

### `src-tauri/tauri.conf.json`

关键点：

- `productName`: `Mastps`
- `identifier`: `com.mastps.app`
- devUrl：`http://localhost:1420`
- frontendDist：`../dist`
- `app.windows` 当前为空，主窗口在 Rust `main.rs` 里通过 `WebviewWindowBuilder` 手动创建。

### `src-tauri/capabilities/default.json`

自绘标题栏依赖窗口权限。当前包括：

```text
core:window:allow-close
core:window:allow-minimize
core:window:allow-toggle-maximize
core:window:allow-internal-toggle-maximize
core:window:allow-start-dragging
```

如果标题栏按钮报权限错误，应先检查此文件是否被旧版本覆盖。

---

## 7. 本地项目文件格式

当前新建项目实际创建的是一个目录，目录名形如：

```text
项目名.masterpiece/
```

典型结构：

```text
我的小说.masterpiece/
├── manifest.json
├── binder.json
├── binder_documents/
│   ├── <node-id>.html
│   └── ...
├── documents/
│   ├── index.json
│   └── <document-id>.html
└── outlines/
    ├── index.json
    └── <document-id>.html
```

说明：

- `manifest.json`：项目 ID、项目名、创建时间、更新时间。
- `binder.json`：草稿 / 大纲树。
- `binder_documents/*.html`：当前主要文档正文，保存 Tiptap HTML。
- `documents/`、`outlines/`：旧式文档结构，仍保留兼容 API。

### `manifest.json` 示例

```json
{
  "id": "uuid",
  "name": "测试",
  "createdAt": "2026-05-29T...Z",
  "updatedAt": "2026-05-29T...Z"
}
```

### `binder.json` 概念结构

```json
{
  "draft": {
    "id": "draft-root",
    "title": "草稿",
    "icon": "✍",
    "children": []
  },
  "outline": {
    "id": "outline-root",
    "title": "大纲",
    "icon": "◇",
    "children": []
  }
}
```

`BinderNode` 字段：

```ts
type BinderNode = {
  id: string;
  title: string;
  icon: string;
  createdAt: string;
  updatedAt: string;
  children: BinderNode[];
};
```

---

## 8. 当前 localStorage 数据

以下数据目前不在 `.masterpiece` 项目目录中，而是在浏览器 localStorage 中：

```text
masterpieces.recentProjects.v1                 最近项目
masterpieces.toolbar.visible.v6                工具栏显示项
masterpieces.ui.fontSize.v1                    全局界面字号
masterpieces.resources.v2.<projectId>          人物 / 设定 / 时间线 / 灵感资料卡
masterpieces.textStatus.presets.v1.<projectId> 状态列表与颜色
masterpieces.textStatus.documents.v1.<projectId> 文档 id -> 状态 id
masterpieces.contextSidebarWidth.v1.<projectId> 左侧目录宽度
```

注意：

- 状态列表、文档状态、资料卡、侧栏宽度按项目 ID 分开保存。
- 如果用户换浏览器环境、清理缓存或迁移项目目录，这些 localStorage 数据不会自动跟着项目走。
- Markdown 导出时，资料卡是前端从 localStorage 读取后作为 `resources` 参数传给 Rust。

后续建议：把资料卡、状态配置、文档状态、侧栏宽度等逐步迁入项目目录，例如：

```text
resources.json
statuses.json
workspace.json
```

---

## 9. 编辑器实现要点

### Tiptap 扩展

当前自定义扩展：

- `FontFamily`：给 `textStyle` 增加 `fontFamily` 样式。
- `FontSize`：给 `textStyle` 增加 `fontSize` 样式。
- `TextIndent`：给 `paragraph` 增加 `textIndent` 样式。
- `LineHeight`：给 `paragraph` / `heading` 增加 `lineHeight` 样式。

字体 / 字号通过：

```ts
editor.chain().focus().setMark("textStyle", { fontFamily }).run()
editor.chain().focus().setMark("textStyle", { fontSize }).run()
```

这意味着：

- 有选区：仅作用于选中文字。
- 无选区：影响后续输入。

### 首行缩进

“文”按钮对应 `firstLineIndent`，当前逻辑是对当前文档段落设置 / 取消：

```css
text-indent: 2em;
```

它会写入 HTML，所以每个文档独立。

### 工具栏偏好

工具栏显示项由 `visibleToolbarIds` 控制，保存在：

```text
masterpieces.toolbar.visible.v6
```

当前强制排在工具栏前面的项：

```ts
["fontFamily", "firstLineIndent", "fontSize", "lineHeight"]
```

---

## 10. 导出逻辑

入口：首选项 → 导出 → 导出到桌面。

前端调用：

```ts
invoke<string>("export_project_markdown_zip", {
  path: currentProject.path,
  resources,
})
```

Rust 后端流程：

1. 读取项目 `manifest.json`。
2. 读取 `binder.json`。
3. 在桌面创建临时导出目录：`项目名-Markdown导出-时间戳/`。
4. 导出目录包括：
   - `项目文件/`
   - `大纲/`
   - `人物/`
   - `设定/`
   - `时间线/`
   - `灵感/`
   - `README.md`
5. 将 Tiptap HTML 做简易 Markdown 转换。
6. 使用 Rust `zip` crate 创建压缩包。
7. 删除临时导出目录，只保留桌面 zip。

注意：HTML 转 Markdown 当前是简易转换，不是完整语义转换；复杂表格、样式、图片、链接等可能无法完整保留。

---

## 11. UI 当前注意事项

### 编辑器纸张与工具栏

最近修复过：

- 工具栏遮挡正文。
- 正文纸张离左侧目录过远。
- 正文纸张高度固定导致长文溢出。

当前 CSS 通过后置规则修复：

- `.editor-shell` 使用 `overflow: auto`、`align-items: flex-start`。
- `.editor-paper` 使用 `height: auto`、`overflow: visible`、`flex: 0 0 auto`。

修改编辑器布局前应优先检查 `src/index.css` 文件尾部规则，避免被后置规则覆盖。

### 文档状态菜单

最近修复过：

- 菜单文案从“文本状态”改为“状态”。
- 状态子菜单被编辑区挡住的问题。
- 当前子菜单改为向左展开，并提高 z-index。

相关 CSS：

```css
.node-menu
.node-menu-item.has-submenu
.node-submenu
.status-dot
.node-status-badge
```

### 左侧目录宽度

目录宽度由 `contextSidebarWidth` state 控制，范围大致为 240px 到 560px。用户拖拽后存储到：

```text
masterpieces.contextSidebarWidth.v1.<projectId>
```

---

## 12. 重要风险与开发建议

### 1. `App.tsx` 过大

现在大部分逻辑都在一个文件里。继续追加功能会让修改风险越来越高。建议先做低风险拆分，保持行为不变。

### 2. `localStorage` 与项目文件夹混用

当前项目核心正文在文件系统，资料卡 / 状态 / UI 偏好在 localStorage。用户会以为“项目文件夹”包含全部内容，但现在不是。

建议优先统一数据归属：

- 资料卡写入项目目录。
- 状态配置写入项目目录。
- 文档状态写入项目目录。
- UI 布局偏好可选择写入项目目录或全局配置。

### 3. README 与代码不一致

README 描述了 SQLite、FTS、AI Provider、`.storyproj`，但当前代码没有完整实现。后续 AI 不要直接按 README 判断当前能力。

### 4. CSS 后置覆盖较多

`index.css` 里多轮修改导致同名选择器很多。遇到 UI BUG 时，应先定位最终生效规则，而不是只改前面的旧规则。

### 5. 未经过构建验证

本说明和最近几轮代码修改都基于静态修改。拿到代码后建议立即执行：

```bash
npm install
npm run type-check
npm run tauri:dev
```

如果 Rust 报错，再执行：

```bash
cd src-tauri
cargo check
```

---

## 13. 给后续 AI 的优先处理清单

1. 先运行 `npm run type-check` 和 `cargo check`，修复类型 / 编译问题。
2. 测试首选项：通用、编辑、主工具栏、状态、导出。
3. 测试文档状态：文档菜单 → 状态 → 选择后是否显示标记，子菜单是否被遮挡。
4. 测试工具栏：字体、字号、行高、首行缩进、颜色、高亮、更多菜单。
5. 测试正文长文：纸张是否随内容增长，滚动是否正常。
6. 测试侧栏拖拽：切项目后是否恢复项目自己的宽度。
7. 测试导出：桌面 zip 是否生成，目录结构是否正确，Markdown 内容是否合理。
8. 尽快把 localStorage 中的项目级资料迁到项目目录，减少数据丢失风险。
9. 开始重构前，先拆 `App.tsx`，不要继续把大功能堆进单文件。

---

## 14. 最近修改记录摘要

### UI 修正

- 顶部路径与保存按钮左右分布。
- 文件树高亮变细，避免行项粘连。
- 创建项目弹窗按钮间距调整。
- 正文工具栏顺序调整：字体 / 首行缩进 / 字号 / 行高靠前。
- 编辑器正文纸张减少左侧空隙，并改为随内容高度增长。
- 状态子菜单层级与展开方向修复。

### 功能新增

- 首选项新增导出卡片。
- Markdown zip 导出到桌面。
- 系统字体读取。
- 选中文字字体 / 字号独立设置。
- 首行缩进开关。
- 标题 / 图标内置图标选择。
- 状态配置卡片与文档状态标记。
- 侧栏拖拽宽度并按项目记忆。
- 通用界面字号手动输入。

---

## 15. 交接备注

当前项目已经从最初的静态原型向真实本地写作工具推进，但仍处于“单文件大前端 + Rust 文件系统命令 + localStorage 项目资料”的阶段。

后续修改时最重要的是：

- 不要只看 README，要以 `src/App.tsx` 与 `src-tauri/src/main.rs` 为准。
- 任何会影响项目数据的功能，都要确认数据到底写入项目目录还是 localStorage。
- UI BUG 多半来自 `index.css` 中的后置覆盖和层级 / overflow 问题。
- 导出和系统字体涉及 Rust 后端，新增命令必须同步加入 `generate_handler!`。

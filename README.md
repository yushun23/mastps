# Mastps - 长篇叙事工程系统

一个本地优先的长篇写作软件，专为长期处于构思、准备、整理阶段的中文写作者设计。

## 核心特性

- **本地优先** - 所有数据存储在本地，完全控制
- **写作工程系统** - 帮助整理灵感、人物、设定、时间线、章节和场景
- **AI 赋能** - Provider 抽象层，支持云端和本地 AI（Ollama/llama.cpp）
- **富文本编辑** - 基于 ProseMirror/Tiptap 的强大编辑器
- **全文搜索** - SQLite FTS 支持高效搜索
- **项目管理** - 文件夹式 .storyproj 格式

## 技术栈

### 前端
- **框架**: React 18+ with TypeScript
- **样式**: Tailwind CSS
- **编辑器**: Tiptap / ProseMirror
- **数据格式**: ProseMirror JSON

### 后端
- **框架**: Tauri 2
- **系统层**: Rust
- **数据库**: SQLite + FTS
- **备份**: Markdown 导出

### 计划功能
- AI 提供商集成（云端 → Ollama → llama.cpp）
- 关系图可视化（SQLite → Tantivy）
- 更多导出格式

## 快速开始

```bash
# 安装依赖
npm install
cargo build

# 开发模式
npm run dev

# 构建
npm run build
```

## 项目结构

```
mastps/
├── src/                 # React 前端代码
├── src-tauri/          # Tauri/Rust 后端代码
├── docs/               # 文档
├── config/             # 配置文件
└── public/             # 静态资源
```

## 开发进度

### v1.0
- [x] 项目初始化
- [ ] 基础编辑器
- [ ] 本地数据库
- [ ] 项目格式
- [ ] 搜索功能
- [ ] 基础 AI 集成

## 许可证

MIT

## 作者

长篇写作者

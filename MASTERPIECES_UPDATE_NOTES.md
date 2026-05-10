# MasterPieces 本次开发说明

本次完成了第一阶段主界面与写作入口：

1. 启动页：程序打开后居中显示磨砂玻璃 Banner，文字为 MasterPieces，0.6 秒后进入项目选择页。
2. 项目选择页：显示序号、项目名称、最后修改时间、创建时间；支持选中高亮、进入、右上角 + 创建项目。
3. 项目管理：项目拥有独立 UUID，改名不影响项目身份；右键支持重命名、从最近列表移除；项目找不到时显示灰色并提示“项目文件未找到”。
4. 项目档案：创建项目时在用户输入的存档目录下生成 .masterpiece 项目文件夹，包含 project.json 与 documents/main.txt。
5. 写作中心：进入项目后显示“写作”功能卡片。
6. 写作工作界面：左侧为文档目录占位结构，右侧为安静的正文编辑区；支持读取、保存 main.txt，失焦自动保存。

运行方式：

- 前端开发预览：`npm run dev`
- Tauri 开发运行：`npm run tauri:dev`
- 前端构建：`npm run build`
- Tauri 打包：`npm run tauri:build`

注意：当前环境没有 Node/Rust 依赖，无法在容器内完成实际编译。已修正原项目里 Tauri/Vite 脚本递归的问题，并按 Tauri 2 的 invoke 入口更新了前端调用。

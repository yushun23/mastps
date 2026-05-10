MasterPieces 窗口强制创建补丁

替换方式：
1. 解压本补丁。
2. 把 src-tauri/src/main.rs 覆盖到你的项目同名位置。
3. 把 src-tauri/tauri.conf.json 覆盖到你的项目同名位置。
4. 在项目根目录运行：npm run tauri:dev

作用：
- 不再依赖 tauri.conf.json 自动创建窗口。
- Rust 启动时在 setup() 里主动创建 main 窗口。
- 避免浏览器可打开但桌面窗口不弹出的情况。

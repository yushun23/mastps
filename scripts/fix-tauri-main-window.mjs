import fs from "node:fs";
import path from "node:path";

const target = path.resolve("src-tauri/src/main.rs");
if (!fs.existsSync(target)) {
  console.error(`找不到 ${target}，请在项目根目录运行：node scripts/fix-tauri-main-window.mjs`);
  process.exit(1);
}

let source = fs.readFileSync(target, "utf8");
const before = source;

if (!source.includes("WebviewWindowBuilder::new")) {
  console.error("没有找到 WebviewWindowBuilder::new，未修改 main.rs。请手动给主窗口 builder 加 .decorations(false)。");
  process.exit(1);
}

// 1) 关闭系统原生标题栏，避免和 React 自绘标题栏叠在一起。
// 优先匹配当前仓库的一行写法：.title("MasterPieces") .inner_size(...)
if (!source.includes(".decorations(false)")) {
  source = source.replace(
    /(\.title\("MasterPieces"\)\s*)\.inner_size\(/,
    "$1.decorations(false) .min_inner_size(1024.0, 680.0) .inner_size("
  );
}

// 2) 如果仓库代码格式化成多行，上面的规则没有命中，则退一步插入到 title 后面。
if (!source.includes(".decorations(false)")) {
  source = source.replace(
    /(\.title\("MasterPieces"\))/,
    "$1\n                .decorations(false)\n                .min_inner_size(1024.0, 680.0)"
  );
}

if (source === before) {
  if (source.includes(".decorations(false)")) {
    console.log("main.rs 已经包含 .decorations(false)，无需重复修改。");
    process.exit(0);
  }
  console.error("没有自动修改成功。请手动在 WebviewWindowBuilder 链式调用里加入：.decorations(false)");
  process.exit(1);
}

fs.writeFileSync(target, source);
console.log("已修改 src-tauri/src/main.rs：加入 .decorations(false) 和最小窗口尺寸。");

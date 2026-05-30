export type BinderIconOption = {
  label: string;
  icons: string[];
};

export const BINDER_ICON_GROUPS: BinderIconOption[] = [
  { label: "常用", icons: ["▦", "✍", "📄", "📁", "◇", "◆", "★", "☆", "✦", "☰"] },
  { label: "章节", icons: ["序", "章", "卷", "幕", "节", "文", "书", "页", "稿", "篇"] },
  { label: "人物", icons: ["人", "主", "配", "敌", "友", "♙", "♟", "👤", "👥", "心"] },
  { label: "世界", icons: ["地", "城", "国", "门", "山", "海", "□", "⌂", "⌁", "⚑"] },
  { label: "状态", icons: ["✓", "！", "？", "⚠", "待", "改", "完", "锁", "眼", "灯"] },
];

export const BINDER_ICON_OPTIONS = BINDER_ICON_GROUPS.flatMap((group) => group.icons);

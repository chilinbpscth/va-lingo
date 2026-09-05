# VA-Lingo visual restyle（宣紙／青瓷／朱砂）

`index.html` 改為視藝前端配色「宣紙主調＋青瓷＋朱砂」。功能不變（KS 鷹架、Firebase 畫廊、Drive 提交、手機版修正皆保留）。

## Tokens

| Token | Value | Role |
|-------|-------|------|
| `--bg` | `#f7efe2` | 宣紙紙底 |
| `--paper` / `--soft` | `#fffaf3` | 暖白表面／軟填色 |
| `--text` | `#2c2420` | 墨色正文 |
| `--muted` | `#6b5e55` | 次要文字 |
| `--line` | `#e8d9c8` | 卡片／邊線 |
| `--accent` / `--accent-dark` / `--ok` | `#0f766e` | 青瓷主色（按鈕、分頁、完成態） |
| `--cinnabar` | `#b91c1c` | 朱砂強調（稀疏：清除鈕、針腳 hover） |
| `--purple` | `#134e4a` | 次級青瓷深色 |
| `--shadow` | `0 12px 28px rgba(15,118,110,.12)` | 青瓷柔陰影 |
| Font | **Noto Sans TC** | 標題與正文皆保留 |

Tailwind `va.*`：`va-blue` / `va-gold` → 青瓷 `#0f766e`；`va-light` → `#ecf5f4`；`va-bg` → `#f7efe2`；`va-line` → `#e8d9c8`；`va-cinnabar` → `#b91c1c`。

## Components

- **Buttons:** 圓角 pill；主鈕純青瓷（不再用粉橘漸層／黃底陰影）
- **Cards / chips / sticky bars:** 宣紙底、暖白卡面、紙色邊線
- **Step pills:** 進行中＝青瓷；完成＝青瓷淡底
- **Header / mode tabs:** 白／紙玻璃感，標題青瓷，無糖果粉紅大底
- **朱砂:** 僅用於強調互動（如 blank clear、pin active），不作大面積填色

## Dropped

Gift-exchange / mhchow 糖果粉紅大底（`#fff7fb`、`#ff6b9d`、`#ffe3ef` 等）已移除。

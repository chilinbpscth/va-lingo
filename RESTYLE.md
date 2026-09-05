# VA-Lingo visual restyle（Codex shared tokens／宣紙／青瓷／朱砂）

`index.html` 對齊 Codex 共用 token（`data-app="va-lingo"`），並維持視藝前端配色「宣紙主調＋青瓷＋朱砂」。功能不變（KS 鷹架、Firebase 畫廊、Drive 提交、手機版修正皆保留）。

## Tokens

| Token | Value | Role |
|-------|-------|------|
| `--bg` | `#f7efe2` | 宣紙紙底 |
| `--bg-warm` / `--panel` / `--paper` / `--soft` | `#fffaf3` | 暖白表面／軟填色 |
| `--panel-soft` | `#efe4d4` | 軟面板 |
| `--ink` / `--text` | `#2c2420` | 墨色正文 |
| `--muted` | `#6b5e55` | 次要文字 |
| `--line` | `#e8d9c8` | 卡片／邊線 |
| `--accent` / `--ok` | `#0f766e` | 青瓷主色（按鈕、分頁、完成態） |
| `--accent-2` / `--cinnabar` | `#b91c1c` | 朱砂強調（稀疏：清除鈕、針腳 hover） |
| `--on-accent` | `#ffffff` | 主色上的文字 |
| `--danger` | `#dc2626` | 危險態 |
| `--focus` | `#193826` | focus-visible 外框 |
| `--radius` | `14px` | 共用圓角 |
| `--radius-pill` | `999px` | pill 圓角 |
| `--shadow` | `0 8px 24px rgba(44, 36, 32, 0.06)` | 墨色柔陰影 |
| `--font` | **Noto Sans TC** + PingFang HK / Helvetica Neue | 標題與正文 |

`[data-app="va-lingo"]` 覆寫：`--accent: #0f766e`、`--accent-2: #b91c1c`。

Tailwind `va.*`：`va-blue` / `va-gold` / `va-ok` → 青瓷 `#0f766e`；`va-light` → `#ecf5f4`；`va-bg` → `#f7efe2`；`va-panel` / `va-soft` → `#fffaf3`；`va-line` → `#e8d9c8`；`va-ink` / `va-text` → `#2c2420`；`va-cinnabar` → `#b91c1c`；`va-danger` → `#dc2626`；`va-focus` → `#193826`。

## Focus

```css
button:focus-visible, a:focus-visible, input:focus-visible,
select:focus-visible, textarea:focus-visible {
  outline: 3px solid var(--focus); /* #193826 */
  outline-offset: 2px;
}
```

## Components

- **Buttons:** 圓角 pill（`--radius-pill`）；主鈕用 `var(--accent)` / `var(--on-accent)`
- **Cards / chips / sticky bars:** 宣紙底、暖白卡面、紙色邊線；卡面圓角仍 22px（保留版面）
- **Step pills:** 進行中＝青瓷；完成＝青瓷淡底
- **Header / mode tabs:** 白／紙玻璃感，標題青瓷
- **朱砂:** 僅用於強調互動（如 blank clear、pin active），不作大面積填色

## Dropped

Gift-exchange / mhchow 糖果粉紅大底（`#fff7fb`、`#ff6b9d`、`#ffe3ef` 等）已移除。

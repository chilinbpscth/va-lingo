# VA-Lingo 藝言堂 — Phase-1 原型

香港小學視覺藝術 (Visual Arts)

介面為繁體中文 (zh-HK)

## 視覺風格

介面已對齊學校禮物兌換系統（mhchow）的小學親切視覺語言：粉紅／淡紫色票、圓角卡片、膠囊按鈕與 Google Fonts（Yusei Magic + ZCOOL KuaiLe）。詳見 `RESTYLE.md`。

## 如何開啟

用瀏覽器開啟 index.html，或執行：

```bash
python3 -m http.server 8080
```

（名單以 `fetch('roster.json')` 載入，請用本機伺服器或 GitHub Pages，勿直接用 `file://`。）

## 產品

- 學習階段 KS1／KS2；KS2 第一層句式鷹架／第二層開放書寫+自評檢核
- 大師名作館 | 我的創作歷程 | 同儕藝廊
- 整體感受 -> 表象描述 -> 形式分析 -> 意義詮釋 -> 價值判斷
- 左：畫布與編號大頭針；右：步驟面板與詞彙芯片

## 已可演示功能

- 頁首班別／學生名單選擇（roster.json）、點子庫、localStorage、匯出評賞歷程卡
- 樊楓《俯城之五》示範 SVG；同儕3件；創作上傳
- 大頭針<=6、詞彙芯片、KS1 emoji；mhchow 對齊色票（粉紅／橙漸層）

## 模擬／佔位

- 示意圖像／無後端；Tailwind CDN 與 Google Fonts 需網絡

> Student roster on public Pages is for school demo; for production load roster privately / restrict Pages.


## Google Workspace 雲端提交（初步）

學校可先用 **Drive + Apps Script** 接收學生評賞（Firebase 可選、稍後再接）。

1. 依 **[DEPLOY-GOOGLE.md](./DEPLOY-GOOGLE.md)** 建立根資料夾、貼上 `apps-script/Code.gs`、部署網頁應用程式
2. 在網頁按「雲端設定」貼上 `/exec` 網址（存於瀏覽器 localStorage）
3. 學生選班別／姓名後按「提交到學校雲端」→ Drive 路徑 `班別/學號_姓名/`

本機 localStorage 自動儲存與「匯出評賞歷程卡」仍可離線使用。

## 檔案

- `index.html` — 前端（含雲端提交）
- `roster.json` — 示範名單
- `apps-script/Code.gs` — Apps Script 提交 API
- `apps-script/appsscript.json` — 專案資訊清單
- `DEPLOY-GOOGLE.md` — IT／老師部署步驟（zh-HK）
- `README.md` / `RESTYLE.md`

## 建議演示

1. 頁首選班別（如 5A）再選學生，確認學號自動填入
2. KS2 L1 大師名作館五步填空
3. KS2 L2 開放書寫與檢核
4. KS1 心情 emoji
5. 同儕藝廊回饋
6. 上傳作品加大頭針
7. 匯出評賞歷程卡

*Phase-1 課堂演示原型 · 非正式教材定稿*

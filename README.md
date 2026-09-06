# VA-Lingo 藝言堂 — Phase-1 原型

香港小學視覺藝術 (Visual Arts) · 佛教志蓮小學 2026–27

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
- 整體感受 -> 表象描述 -> 形式分析 -> 意義詮釋 -> 價值判斷（評賞五步驟）
- 視覺語言與評賞對齊教育局《視覺藝術科課程指引（小一至中六）（2024）》：視覺元素（線條、形狀、形體、空間、色彩、明暗、質感）＋組織原理（均衡、重複、統一與變化、節奏、比例、重點、動感）
- 左：畫布與編號大頭針；右：步驟面板與詞彙芯片

## 課程選取（年級／學段／課題）

資料來源：**佛教志蓮小學 2026–27** 視覺藝術進度表（`curriculum.json`）：

- **年級**：小一至小六（ids `p1`–`p6`）
- **學段**：第一／第二／第三學段（ids `stage1`–`stage3`）— **不是**上／下學期；對應單元見課題 `unit`
- 每學段 **2 課題**：優先一個**平面**（`form: "2d"`）＋一個**立體**（`form: "3d"`）；若該學段兩項計分皆為平面，則兩槽均標 `2d` → 每級共 **6** 課題
- 課題物件：`{ id, title, unit, grade, stage, form, artists: [{ name, workTitle, image?, note? }], note? }`（每位 1–2 個大師名作館空位）
- 大師名作館：考試溫習紙／進度表已知藝術家已填名；圖像未備時 `image: null`、`note: 待補圖`（或「溫習／名作館待補圖」），畫布退回 `assets/demo-master-urban.png`
- 頁首模式列有級聯下拉（課題標題來自進度表；改年級會重設學段／課題）；p1–p3 建議 KS1、p4–p6 建議 KS2（可覆寫）；選取寫入 localStorage

## 已可演示功能

- 頁首班別／學生名單選擇（roster.json）、點子庫、localStorage、匯出評賞歷程卡
- 年級／學段／課題選取（curriculum.json）驅動大師名作館
- 樊楓《俯城之五》示範 SVG（無課題圖像時後備）；同儕3件；創作上傳
- 大頭針<=6、詞彙芯片、KS1 emoji；mhchow 對齊色票（粉紅／橙漸層）

## 模擬／佔位

- 示意圖像；Tailwind CDN、Google Fonts、Firebase CDN 需網絡（畫廊離線時仍可用示範同儕）

> Student roster on public Pages is for school demo; for production load roster privately / restrict Pages.


## Google Workspace 雲端提交（歸檔）

學校可用 **Drive + Apps Script** 接收學生評賞作長期歸檔。

1. 依 **[DEPLOY-GOOGLE.md](./DEPLOY-GOOGLE.md)** 建立根資料夾、貼上 `apps-script/Code.gs`、部署網頁應用程式
2. 在網頁按「雲端設定」貼上 `/exec` 網址（存於瀏覽器 localStorage）
3. 學生選班別／姓名後按「提交到學校雲端」→ Drive 路徑 `班別/學號_姓名/`

本機 localStorage 自動儲存與「匯出評賞歷程卡」仍可離線使用。

## Firebase 課堂同儕畫廊（即時）

課堂用 **匿名 Auth + Firestore**（**不使用 Storage**，無需 billing）做近即時同儕作品牆：

1. 老師給 4–6 碼課堂碼（例如 `A3B7`）
2. 學生輸入課堂碼 →「加入課堂畫廊」（失敗會清除「加入中…」並顯示「重試」；離線時本機自評／示範同儕仍可用）
3. 在「我的創作歷程」上傳作品後按「發佈到畫廊」（先確認；JPEG 壓至約 **≤200KB**；過大會 toast 拒絕）
4. 「同儕藝廊」分頁即時列出同學作品，點圖可放大、「用此作品互評」；可刪除**自己**發佈的作品

**畫廊私隱**：Firestore 只寫 `displayLabel`（例如 `5A・12號`／`5A・同學`），**不寫**真實全名或完整學號欄。Drive「提交到學校雲端」仍用頁首班別／姓名／學號（本機表單），與畫廊分開。

詳見 `DEPLOY-GOOGLE.md` 末節。示範同儕 SVG 仍可離線使用。

## 檔案

- `index.html` — 前端（Drive 提交 + Firebase 課堂畫廊）
- `curriculum.json` — 佛教志蓮小學 2026–27 年級／學段／單元／課題與大師名作館（唯一資料檔）
- `roster.json` — 示範名單（`roster.school.json` 已 gitignore，勿提交）
- `apps-script/Code.gs` — Apps Script 提交 API
- `apps-script/appsscript.json` — 專案資訊清單
- `firestore.rules` / `firebase.json` — Firestore 規則與專案設定
- `DEPLOY-GOOGLE.md` — IT／老師部署步驟（zh-HK）
- `README.md` / `RESTYLE.md`

## 建議演示

1. 頁首選班別（如 5A）再選學生，確認學號自動填入
2. 模式列選年級 → 學段 → 課題（平面／立體），再進大師名作館
3. KS2 L1 大師名作館五步填空
4. KS2 L2 開放書寫與檢核
5. KS1 心情 emoji
6. 同儕藝廊回饋（示範圖或課堂碼即時畫廊）
7. 上傳作品加大頭針；可「發佈到畫廊」
8. 匯出評賞歷程卡／提交到學校雲端

*Phase-1 課堂演示原型 · 非正式教材定稿*

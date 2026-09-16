# VA-Lingo 藝言堂・時間膠囊

香港小學視覺藝術評賞 · 佛教志蓮小學 2026–27  
介面：繁體中文（zh-HK）／粵語說明

本分支主路徑為 **引導式時間膠囊**（一屏一題）。登入後直接進入課堂；**不再**強制拼貼小貓入門。

## 本機預覽（主路徑）

```bash
npm run preview
```

瀏覽器開啟：

- 主入口：http://127.0.0.1:8768/
- 舊 Firebase 單頁（legacy）：http://127.0.0.1:8768/legacy-firebase.html

預覽使用合成班別／學號與模擬後端，**不會**寫入學校資料。建議試用 `2A`／`5A`、學號 `01`／`02`。

> 請用本機伺服器開啟；勿直接用 `file://`（否則 API 與部分資源無法運作）。

## 產品規則（本分支）

1. **登入即課堂**：學生登入後直接見可用 round／課題，無拼貼小貓強制閘。
2. **引導流**：正式評賞為一題一屏（指一指・說一說）。
3. **Legacy 保留**：`legacy-firebase.html`（原 Firebase 巨石頁）；舊 Drive 腳本在 `apps-script/legacy-drive/`。
4. **課程資料**：`curriculum.json` 六級進度表保留；另有備份 `curriculum.legacy.json`。引導課題模板在 `assets/js/guided-model.js`。

詳見：

- [docs/TIME-CAPSULE-REBUILD.md](./docs/TIME-CAPSULE-REBUILD.md)
- [docs/SUBSYSTEM-SPLIT.md](./docs/SUBSYSTEM-SPLIT.md)

## 視覺與課程（沿用）

- 親切小學視覺語言（粉紅／淡紫票、圓角卡片）；詳見 `RESTYLE.md`
- 評賞對齊教育局《視覺藝術科課程指引（小一至中六）（2024）》視覺元素與組織原理

## 檔案速覽

| 檔案／目錄 | 說明 |
|------------|------|
| `index.html` | 引導式主入口 |
| `assets/guided/`、`assets/js/guided-*.js` | 引導 UI 與邏輯 |
| `legacy-firebase.html` | 舊 Firebase UI |
| `curriculum.json` | 六級課題進度表 |
| `roster.json` | Legacy／示範名冊 |
| `apps-script/` | 時間膠囊後端（預覽合成；部署 ID 留空） |

## 注意

- **不要**在本分支提交學校 Sheet／Drive／Exec 私密 ID。
- **不要**改動獨立的 `art-time-capsule` 倉庫。
- Google Workspace／Firebase 舊部署說明仍見 `DEPLOY-GOOGLE.md`（legacy）；本分支預設不部署。

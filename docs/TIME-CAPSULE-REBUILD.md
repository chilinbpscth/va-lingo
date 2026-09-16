# 時間膠囊重建說明（feature/time-capsule-rebuild）

本分支把 **VA Lingo 藝言堂** 主學生路徑改為「時間膠囊」引導式體驗（一屏一題）。**已取消**拼貼小貓強制入門；登入後直接進課堂。舊 Firebase 單頁保留為 legacy。

## 目標對齊

1. **無入門閘**：不再強制 `assets/demo/` 拼貼小貓；該資料夾可留作廢案／日後選用，主路徑不引用。
2. **統一引導流**：正式評賞全部使用時間膠囊 guided UI（`assets/js/guided-app.js`）。
3. **Legacy 保留**：原根目錄 Firebase 巨石頁改名為 `legacy-firebase.html`。
4. **主入口**：根目錄 `index.html` = 引導式時間膠囊。
5. **本機預覽**：`npm run preview` → http://127.0.0.1:8768/
6. **不做**：不部署 Google／Pages；不把學校私密 ID 寫入新檔。

## 入門閘（已取消）

學生登入後直接 `listMyRounds`／進入課題。不再檢查 `va-lingo-onboarding-kitten`，首頁與課題頁亦無「必做小貓」連結。


## 主要路徑

| 路徑 | 用途 |
|------|------|
| `index.html` | 學生／教師主入口（引導式） |
| `assets/demo/` | （廢案）舊拼貼小貓示範，主路徑不強制 |
| `assets/guided/*` | 外觀、校徽、名作圖 |
| `assets/js/guided-app.js` | UI 流程 |
| `assets/js/guided-model.js` | 課題模板與答題規則 |
| `assets/js/assessment-*.js` | 評賞上下文／復原／快照輔助 |
| `apps-script/Code.gs` + `Guided.gs` | 合成預覽／日後部署用後端（ID 留空） |
| `legacy-firebase.html` | 舊 Firebase 課堂畫廊單頁 |
| `apps-script/legacy-drive/` | 舊 Drive 提交 Apps Script |
| `curriculum.json` | 六級進度表（保留） |
| `curriculum.legacy.json` | 重建時備份 |

## 本機預覽

```bash
npm run preview
# 開啟 http://127.0.0.1:8768/
# 示範：http://127.0.0.1:8768/assets/demo/index.html
# Legacy：http://127.0.0.1:8768/legacy-firebase.html
```

預覽使用合成名冊與記憶體模擬 API（`tests/helpers/apps-script.cjs`），資料可寫入 `work/`（已 gitignore）。勿輸入真實學生資料。

## 正式評賞互動（與小貓一致）

名作／自評／互評使用引導互動：**看 → 指一指（標記）→ 說一說 → 下一題**，一屏一題、作品可持續標記。

- **不要**再走「warmup 看一看」死路：`openSubject` 直接進入 `question`（step 0），標記與「整件作品／取消標記／文字位置」在答題時一律可見。
- 感受詞可選，僅作第一題上方精簡條；不可替代標記與逐步答題流。
- 伴讀提示用語：指一指／說一說。

## 品牌

介面主稱：**藝言堂・時間膠囊**；校徽旁保留「佛教志蓮小學」。

## 與獨立 art-time-capsule 倉庫

本分支只在 `va-lingo` 內整合引導體驗。**不要**改動獨立的 `art-time-capsule` 倉庫。`time-capsule/README.md` 僅作指向說明。

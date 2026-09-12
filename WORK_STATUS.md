# 藝言堂 Google MVP — 工作狀態

更新：2026-09-13。目標進行中，**MVP 未完成，唔可部署呢個中間版本**。

## 完整目標及批准邊界

用家已要求在獨立 Git 分支持續開發／測試／修正，直至藝言堂 Google MVP 通過驗收。沿用現有共用 Google 身份及資料；完整流程：班別＋學號登入 → 上傳 Drive／Sheet → 自評 → 交齊後 refresh → 互評 → 重新登入續做。學生 UI 無真名；全流程唔依賴 Firebase。

本地分支開發已授權；未授權 push、合併、部署或關 Firebase 專案。MVP 完成後問先 P2 定 Firebase 清理。P3/P4 未開工；CEATE values/nse 保持暫停。

## 工作位置與基線

- 工作目錄：本檔所屬 `work/va-lingo-mvp`；分支 `codex/va-lingo-google-mvp`。
- 主 repo：`https://github.com/chilinbpscth/va-lingo`。
- 核實 main 基線：`46ec4fc78cc0a3e722a70400912a977d5120d4bb`；遠端同版。
- 獨立 git worktree，原 `work/va-lingo-audit` 無改動；本地 commit `e256f68`，未 push。
- 上階段工單：本任務 `outputs/VA-LINGO-可執行工單-待批開工-2026-09-13.md`。該稿登入／schema 屬建議，未核實為其他 app 現有契約，唔可照抄冒充已有整合。

## 已實作及驗證

1. 草稿按學年／班別／學號保存；答案、大頭針按課題／作品／大師 slot／鷹架層分隔。同班換學生、同學號不同班不共用答案。
2. 本機上傳保留每件作品及對應評賞；可選回已保存作品；取消選取唔刪歷史。舊 `va-lingo-phase1-v1` 完整保留，未自動歸到現登入者，未自動轉換。
3. 前端不再載入或保留公開名冊；學生只輸入班別及學號，再由 Google `login` API 對私有 Sheet 核對。新草稿不保存姓名。
4. 圖片壓縮用最長邊（1600px）、透明底轉白底、解碼失敗拒絕。檔案讀取期間身份或課題切換會拒絕落錯資料。
5. 儲存失敗有提示，阻止切換學生丟棄未存草稿。
6. 五步填寫進度依現有句式空格或開放文字計算；KS1 感受步加情緒；唔把開過頁當完成。snapshot 只包含當前作品 pins/steps；詞彙以最後文字比對，標 text-match，唔冒充實際 chip 點擊事件。
7. 新增 dependency-free context/snapshot 模組、Node 測試及可重跑瀏覽器回歸（合成學生及圖片）。Apps Script 已有 login / getRoundStatus / uploadArtwork / saveAssessment / listPeerWorks；前端手動 refresh，沒有 Firebase SDK URL 或即時 listener。舊無 token `submit` action 已拒絕，實際資源 ID 已從分支移除。

已跑：`npm test` 13 項通過；其中 Apps Script 模擬服務實際驗證 login、學年／課題範圍、上傳、自評五步拒絕／接受、開放前後互評。`npm run check` inline JS 語法及名冊 Git 檢查通過；`npm run test:browser` Chrome 無頁面 JS 錯誤、學生隔離／作品歷史／重載／空間不足保留，以及模擬 login → uploadArtwork → 自評 saveAssessment → getRoundStatus → listPeerWorks → 互評 saveAssessment 端到端契約通過；`git diff --check` 通過。前端已無 Firebase 代碼；Apps Script 五步完成度由伺服器根據內容重算，不信任客戶端 `complete`。390px／1280px 本地畫面截圖已生成並目視檢查。這是本機模擬 Web App，未代替 Google 正式驗收。

## 共用接口定位：現時阻礙

用家曾回答其他 app 已共用 Google 登入＋資料，但現時找到嘅應用程式碼未支持呢個結論：

- bianlian-ar main `0ccbd2aaf65fc81f980cf4c05cf50664cfc4d436`。
- papercut-ar main `0aaa03f2ba0d667527afc9899425782bd52cb267`。
- shadow-puppet main `2a081f7208c121e241a1f0c8222e5941ebfb6afb`。
- 三者應用 src／剪紙 public 主程式未見 Google Web App、學生登入 token 或 sourceApp 上傳；已保存功能主要 localStorage／IndexedDB／檔案匯出。狀態檔明示部分 Google Drive 未驗證。已列遠端分支，未見命名為共用登入／Google 整合嘅分支；未據此推論所有未讀分支都冇整合。
- 已連接 Google Drive，唯可見範圍搜尋冇 Apps Script 專案；舊 Code.gs 指定 Drive 及 Sheet metadata 404（無權限或不存在，唔可斷言已刪除）。
- `ceate-arts` repo 404；原三份 `/workspace/ceate-arts/...` 計劃／對照未取得。唔可聲稱已讀晒。

已向用家詢問真正整合入口／Apps Script 原碼／分支；或確認之前所指其實係前端整合及本機保存。**唔另造一套登入冒充沿用既有系統**。

## 接續次序

1. 取得整合來源，讀實際驗證及 token／上傳／作品讀取契約；補齊原三份計劃核對。
2. 以伺服器 identity/grade 控制，而非當前輸入或 localStorage；在獲批 Google 測試資源驗證登入失敗、token 到期及跨班拒絕。
3. 在獲批 Google 測試資源驗證 artwork ID／revision、Drive+Sheet 寫入、去重／重试／歷史保留。
4. 完成互評提交 UI，驗證自評完成→課堂開放→手動 refresh 畫廊→互評，以及角色／班級／作品範圍。
5. Firebase 已從前端運行路徑移除；後續獨立 F 期才處理舊服務關寫入及設定檔刪除。
6. 本地合成資料全流程、Google 獲批測試資源端到端、網絡零 Firebase、越權／重試／跨裝置測試。正式部署先提供具體 review 及取得確認。

## 未完成驗收

已用已連接 Google Drive 搜尋 VA-Lingo；只見工作檔與分支備份，未見可核實的 Apps Script 專案、`/exec` 網址、正式 Drive 根資料夾或 Sheet。因此共用登入／token、Google 真實寫入與讀回、全班開放互評、越權測試、iPad Safari 實機、正式 rollout 均未完成。當前本地測試不可代替上述驗收。

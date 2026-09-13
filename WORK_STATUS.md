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

已用已連接 Google Drive 搜尋 VA-Lingo，並以 Apps Script MIME type 直接搜尋；只見工作檔與分支備份，結果沒有可見 Apps Script 專案，亦未見可核實的 `/exec` 網址、正式 Drive 根資料夾或 Sheet。因此共用登入／token、Google 真實寫入與讀回、全班開放互評、越權測試、iPad Safari 實機、正式 rollout 均未完成。當前本地測試不可代替上述驗收。

## Grok 協作工單 VA-GOOGLE-REVIEW-01（2026-09-13）

只讀工單已完成交付、追問、補件與結案；不是 MVP 完成。收件為 Grok Bot「藝言堂」，不是其內部 Codex CLI bot。

- Grok 回報已連帳戶可讀舊 Drive／Sheet metadata，owner 為 IT 專用帳戶；根下只見 Sheet。此為 Grok 提供的核對結果，Codex 未直接重驗該帳戶。Sheet 內容回空，分頁／表頭仍未核實。先前 Codex 404 不代表資源不存在。
- 已收到三份原計劃的相关摘錄及 §3.4 API 段落；未取得三份完整原檔，不能聲稱已讀晒。
- 已糾正：教師私有 Sheet 可留真名；限制為學生 UI／公開 repo 不公開姓名。name 欄本身不是衝突。
- Grok 沒有讀到本機 MVP 分支，不把其同意當 code review。推送並非交付原碼唯一方法；未 push／deploy。
- 待對照差異：計劃 REST 路徑 vs MVP action dispatch；計劃分開 self_reviews/peer_reviews vs assessments_v1；Drive 按 topic 分夾 vs 現有學生分夾；互評配額、學生自己的進度與跨裝置續做仍需檢查。原文 TTL 2–4 小時只是例子，MVP 45 分鐘亦屬短命。
- Apps Script project／live endpoint 仍未取得；Google live 驗收未完成，部署批准邊界沿用。

已建立 grok-bot-collaboration skill，規定 active task 內等交付、核對、追修；發單／確認收到不等於完成。技能格式驗證通過。實際演練遇到剪貼簿逾時、中文 typeText 丟字、長段截短，均讀回後補正；已寫入技能。

## 持續目標修正（2026-09-13）

查實重試識別只按學號比對，可能跨班／課堂撞 requestId。已將 upload 重試限制為同班、同學號、同 round；assessment 加同作品、revision、type 範圍；兩種寫入拒絕空 requestId。新增真實 Apps Script VM 回歸，驗證兩班同學號、同班不同課堂共用 requestId 各自建立獨立資料，原請求重試不增列。14 項 Node tests、inline check、diff whitespace 通過。仍需補跨裝置續做、互評配額等驗收，未部署。

互評伺服器驗收補強：直接呼叫 saveAssessment 亦須作者及對方已交自評；同作品版本不可用新 requestId 重複交互評；同一 requestId 重試仍回原結果。peerTargetCount 現按每名學生的互評提交配額執行，必須為正整數。新增 API 測試驗證略過畫廊直接提交、未完成自評、重複／重試及超配額；15 項測試與 check 通過。後續須在 UI 顯示自己的已交數及配額，並驗證跨裝置恢復。

getRoundStatus 已新增只屬當前學生的 myProgress（自評已交、互評已交／配額／剩餘），全班 readyCount 只計應交成員。前端課堂查詢顯示自己的進度。新增 fresh session API 測試證明不同學生不讀到對方自評狀態；16 項測試、check 及 Chrome browser 通過，瀏覽器亦驗證互評 0/1 顯示。此項只完成跨登入的提交進度讀回，尚未完成作品／答案跨裝置恢復，不當完整跨裝置驗收。

新增 listOwnWorks 私有恢復 API：session＋課堂成員限制，只回自己的作品、該作品最近自評，逐頁一張圖及 nextOffset；不回姓名、Drive ID 或其他學生評語。VM 測試已改善為真正保存／讀回圖片 bytes，驗證 fresh login 取回原圖及五步答案、分頁、不同學生隔離及無 token 拒絕；17 項通過。前端恢復入口仍待接線，尚未完成跨裝置使用流程。

前端已接「取回我的作品」，按課堂逐頁讀回，身份／課堂變更即停止；合併回相應課題及答案 context，重複取回不覆寫本機修改或重複 pins。新增 recovery module 測試；18 項 Node tests、check 及既有 Chrome 回歸通過。Chrome 尚須新增真正按恢復按鈕的全流程驗證；level/revision/學年恢復邊界需再核對，不能當完成。

Chrome 新增完整恢復操作：刪除合成學生本機草稿、重新登入、按「取回我的作品」、確認答案顯示、修改後再次取回不覆寫，通過。另修正 KS2 level=1 句式答案被後端誤拒：前端傳 level，後端按句式／開放模式計完成度，KS1 情緒要求保留；新增測試並更新過時 contract assertion。19 項 Node tests、check、Chrome 通過。仍是模擬 Google endpoint，未驗證 live CORS／帳戶部署。

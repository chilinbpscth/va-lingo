# VA-Lingo Google MVP 驗收清單

只可在獲批的測試 Drive、Sheet 及 Apps Script Web App 執行。不可使用正式學生名冊或公開分享資料夾。

## 準備

1. 在私有 Sheet 填入兩位合成學生：同一 `schoolYear`、`classId`、`grade`，不同 `studentId`；`displayLabel` 只用「4A・01號」形式。
2. 建立一個 `phase=collecting` 的 round，`round_members_v1` 只列兩位學生；round 的 `schoolYear`、`classId`、`grade`、`topicId` 必須和名冊一致。
3. 填入 `ROOT_FOLDER_ID` 和 `SHEET_ID`，從 Apps Script 執行選單執行 `setupMvpTest()`（呼叫內部 `setup_`）；確認 Sheet 出現所有 `*_v1` 分頁。
4. 跑 `npm run build:google`，將 App.html 上傳私有 Drive 並填 APP_HTML_FILE_ID；部署測試 `/exec`，以 `?ping=1` 檢查回傳 `ok:true`。
5. 從 `/exec` 直接開學生頁（HtmlService），確認 curriculum 課題齊、無需填雲端網址；觀察呼叫經 google.script.run，沒有由靜態頁跨來源 fetch /exec。

## 學生流程及證據

| 測試 | 預期結果 | 必須核對的 Google 證據 |
|---|---|---|
| 正確班別＋學號登入 | 取得短期 token 和年級；頁面不顯示姓名 | `sessions_v1` 有 token hash，沒有 raw token 或姓名 |
| 錯班別／學號 | 拒絕登入 | `sessions_v1` 沒有新增記錄 |
| 未入 round 名單學生 | 查看課堂、上傳、評賞均拒絕 | `artworks_v1`、`assessments_v1` 沒有新增記錄 |
| 自評未完成五步 | 提交被拒絕 | `artworks_v1` 可有圖檔；`assessments_v1` 不可有 self 記錄 |
| 完成自評和上傳 | 成功；仍只顯示「正收集作品」 | Drive 有一張圖；`artworks_v1`、`assessments_v1` 各有一記錄 |
| 未開放互評按更新 | 拒絕或顯示尚未開放 | 沒有 peer assessment |
| 老師改為 `peer_open` | 學生按「更新清單」才見同學作品 | 不應有自動輪詢；兩位學生各自手動更新才見清單 |
| 評自己作品／空白互評 | 後端拒絕 | `assessments_v1` 無新增 peer 記錄 |
| 完整互評 | 成功 | `assessments_v1` 新增 `type=peer` 記錄；無姓名欄 |
| token 到期 | 頁面要求重新登入 | 舊 token 所有受保護 API 均拒絕 |

## 發佈前門檻

- 本清單全部通過，並保留測試 round 的 Sheet／Drive 證據。
- 以 iPad Safari 完成一次兩名合成學生的全流程。
- Pages build 不包含 `roster.school.json`、Firebase SDK 或舊 Web App URL。
- 由用家確認後才可 push、部署、合併，或進入 P2／Firebase 退役。

## 新增恢復及隔離驗收

- 清除第二裝置的合成學生草稿，登入後按「取回我的作品」：原圖、五步答案及大頭針可讀回；再次取回保留本機修改。
- 各學生查自己的自評／互評數及剩餘配額；另一學生只見自己的進度及全班合計。
- 同 requestId 網絡重試不新增列；不同班相同學號／相同 requestId 不混用結果。
- 高小句式與開放模式均可完成；低小情緒未填不算完成。
- 舊學年名冊保留時，登入只用 ACTIVE_SCHOOL_YEAR；新學年草稿不覆寫上一年。
- Google 執行帳戶及存取設定需實測：登入重導、跨來源 fetch、第三方 cookie 限制不能由 localhost mock 證明。不能以公開名冊／公開 Drive 或降低權限解決。

目前雲端恢復涵蓋已上傳作品及已提交自評；尚未交到 Google 的草稿只在原裝置。互評答案可在更新清單、選回該作品時恢復；closed 課堂只供讀回。上述已通過本機 API／瀏覽器模擬，仍須在真 Google 及 iPad 驗收。

- 前導零：4A／01 fresh login 後檢查 sessions_v1.studentId 的 userEnteredValue/effectiveValue 均為 string "01"；作品與評賞作者 ID 同樣保持文字。舊數字型 session 必須被拒並要求重登入，不改寫舊列。

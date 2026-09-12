# VA-Lingo Google MVP 驗收清單

只可在獲批的測試 Drive、Sheet 及 Apps Script Web App 執行。不可使用正式學生名冊或公開分享資料夾。

## 準備

1. 在私有 Sheet 填入兩位合成學生：同一 `schoolYear`、`classId`、`grade`，不同 `studentId`；`displayLabel` 只用「4A・01號」形式。
2. 建立一個 `phase=collecting` 的 round，`round_members_v1` 只列兩位學生；round 的 `schoolYear`、`classId`、`grade`、`topicId` 必須和名冊一致。
3. 填入 `ROOT_FOLDER_ID` 和 `SHEET_ID`，執行 `setup_()`；確認 Sheet 出現所有 `*_v1` 分頁。
4. 部署測試 `/exec`，以 `?ping=1` 檢查回傳 `ok:true`。

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

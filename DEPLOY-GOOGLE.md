# VA-Lingo Google MVP 部署指引

本指引只適用於獲批的測試或正式部署。現時分支仍未獲部署批准。

## 1. 建立私有資源

以 IT／科組專用帳號建立一個 Drive 根資料夾和一份 Google Sheet。兩者不可公開共用。把 ID 填入 `apps-script/Code.gs` 的 `ROOT_FOLDER_ID`、`SHEET_ID`；不要把真實 ID、名冊或學生資料提交到 Git。

在 Sheet 建立或讓 `Code.gs` 首次請求建立以下分頁：

| 分頁 | 必要欄位 |
|---|---|
| `roster_v1` | schoolYear, classId, studentId, grade, displayLabel, active, updatedAt |
| `rounds_v1` | roundId, schoolYear, classId, grade, stageId, topicId, phase, peerTargetCount, openedAt, peerOpenedAt, closedAt |
| `round_members_v1` | roundId, studentId, required, exemptionReason, updatedAt |

Apps Script 會按需要建立 `sessions_v1`、`artworks_v1`、`assessments_v1`。名冊的 `displayLabel` 可以是「4A・01號」；不需要放學生姓名。

## 2. 部署 Apps Script

建立獨立 Apps Script 專案，貼上 `apps-script/Code.gs`，時區設為 `Asia/Hong_Kong`，再部署成 Web App。以部署帳戶執行，存取範圍只限可實際使用的學校帳戶／受管裝置。先以 `/dev` 測試，驗證後才建 `/exec` 版本。

把 `/exec` URL 由 IT 放入受管裝置設定，或在學生頁的「雲端設定」輸入。網址不是秘密，但不可當作授權；伺服器會核對名冊、短期 token、班別、年級及課堂。

## 3. 課堂開放流程

老師先在 `rounds_v1` 建立 `phase=collecting` 的課堂，並在 `round_members_v1` 凍結應交學生。學生交作品及自評後，老師核對交齊或填好缺席豁免，才把 phase 改為 `peer_open`。學生須手動按「更新清單」才會看到可互評作品。為確保整班更新可用，每件上傳圖像會壓縮至 250KB 以下。

## 4. 驗收與回退

在合成測試名冊先驗證：有效／無效登入、短期 token 過期、作品重試、五步未完成拒絕、未開放互評拒絕、跨班與評自己拒絕、兩部裝置手動 refresh。再以已批准測試帳戶驗證 Drive 圖檔及 Sheet 索引。

正式發佈前要再次檢查 Pages 沒有 `roster.school.json`、Firebase SDK 或舊設定 URL。若 Google API 故障，學生保留本機草稿及匯出評賞卡；不可重新啟用 Firebase 作後備。

`peerTargetCount` 必須為正整數，表示每名學生本課堂可提交的互評數。伺服器拒絕超配額及同作品版本的重複互評；網絡重試需沿用原 requestId。提交者及被評作品的作者均須已完成自評。

學年由後端 `ACTIVE_SCHOOL_YEAR` 指定（目前 2026-27），登入只匹配該學年名冊，回傳 schoolYear 供前端分隔草稿。教師私有 Sheet 可另存姓名，但登入 displayLabel 由班別＋學號生成，避免誤將姓名標籤傳給學生。轉學年須先設定當年名冊及課堂，再更新後端學年。

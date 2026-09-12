# VA-Lingo 藝言堂

香港小學視覺藝術自評及互評中心（2026–27）。本分支仍在開發，未部署。

## 學生流程

1. 班別＋學號登入 Google Apps Script；後端按受限 Sheet 名冊核對，回傳短期 token 與年級，不回傳真名。
2. 揀課題，上傳本站作品或從日後接入的剪紙／變臉／皮影 app 帶入作品。
3. 完成評賞五步驟，提交作品及自評。
4. 老師在 Sheet 開放互評後，學生手動按「更新清單」讀取同學作品，再提交互評。

前端只有一個 repo；`curriculum.json` 有 p1–p6、三學段及 36 課題。學生畫面不顯示真名。作品、評賞、詞彙和進度只寫入 Google Drive + Google Sheet，沒有 Firebase 前端 SDK、即時 listener 或後備路徑。

## 本地驗證

```bash
npm ci
npm test
npm run check
npm run test:browser
```

瀏覽器測試使用合成名冊、圖片及本機模擬 `/exec`，不會讀寫學校 Google 資料。完整狀態、已驗證範圍及未完成項目見 [WORK_STATUS.md](WORK_STATUS.md)。

## 檔案

- `index.html`：學生介面與 Google Web App client。
- `curriculum.json`：年級／學段／課題資料。
- `apps-script/Code.gs`：登入、作品、自評、非即時互評 API。
- `roster.school.json` 已忽略，絕不可 commit。學生登入時只輸入班別及學號，正式名冊只存在私有 Sheet。
- `tests/`：課程、草稿隔離、Google API 契約及瀏覽器回歸。

## 邊界

此分支未核實正式 Drive／Sheet／Apps Script 部署，未完成 iPad Safari 實機測試，未可對外發佈。Firebase 設定檔的實際服務退役與關專案需另行按 IT 批准處理。

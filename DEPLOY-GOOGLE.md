
## 已預開（itsupport 帳）

- Drive 資料夾：https://drive.google.com/drive/folders/17649WLgqeOIf_7x5ejwkE1ezfyLPUe4U
- 提交紀錄試算表：https://docs.google.com/spreadsheets/d/1O8ZTcYJdypGFRnMAe6Lk5TINwJDQCRn7gnfNv5UVwLA/edit
- `Code.gs` 已填 `ROOT_FOLDER_ID` / `SHEET_ID`；你仍要喺 Apps Script **部署網頁應用程式**，再把 `/exec` URL 貼入網站「雲端設定」。


# VA-Lingo — Google Workspace 提交部署指南（zh-HK）

給老師／IT：用 Google Drive + Apps Script 接收學生評賞提交。前端（GitHub Pages）維持靜態，無需 Firebase。

## 總覽

1. 在學校 Google Drive 建一個根資料夾（存放所有班別／學生提交）
2.（選填）建一份試算表作提交索引
3. 把 `apps-script/Code.gs` 貼上 Apps Script 並部署成「網頁應用程式」
4. 把 `/exec` 網址貼入前端「雲端設定」
5. 學生按「提交到學校雲端」→ 檔案出現在 Drive：`班別 / 學號_姓名 /`

---

## 一、建立 Drive 根資料夾

1. 用**老師或 IT 專用帳號**登入 Google Drive（建議專用「藝言堂提交」帳號，方便權限管理）
2. 新增資料夾，例如命名：`VA-Lingo 提交`
3. 開啟資料夾，從網址列複製資料夾 ID：
   - 網址形如：`https://drive.google.com/drive/folders/XXXXXXXXXXXXXXXX`
   - `XXXXXXXXXXXXXXXX` 即為 `ROOT_FOLDER_ID`
4. 權限建議：
   - 擁有者：部署用帳號
   - 美術科／班主任：可設為「檢視者」或「留言者」，方便瀏覽學生作品
   - **不要**把根資料夾開成「任何人可編輯」

---

## 二、（選填）建立提交紀錄試算表

1. 新增 Google 試算表，例如命名：`VA-Lingo 提交紀錄`
2. 從網址複製試算表 ID（`/d/` 與 `/edit` 之間那段）→ 之後填入 `SHEET_ID`
3. 稍後執行 `setup_()` 會自動建立 `submissions` 分頁與標題列：
   `time | class | id | name | source | ks | folderUrl`

---

## 三、貼上 Apps Script 並設定

1. 開啟 [script.google.com](https://script.google.com) →「新增專案」
2. 將專案重新命名為 `VA-Lingo Submit`
3. 刪除預設內容，把本倉 `apps-script/Code.gs` **全部**貼上並儲存
4. （可選）專案設定 → 顯示 `appsscript.json` 資訊清單，對齊本倉 `apps-script/appsscript.json`（時區 `Asia/Hong_Kong`）
5. 在檔案頂部填寫：
   ```javascript
   var ROOT_FOLDER_ID = '你的資料夾ID';  // 必填
   var SHEET_ID = '你的試算表ID';         // 選填；不用就留空字串 ''
   ```
6. 若有填 `SHEET_ID`：上方執行選單揀 `setup_` → 執行 → 首次會要求授權（允許存取 Drive／試算表）

---

## 四、部署網頁應用程式

1. 右上角 **部署** → **新增部署作業**
2. 類型選擇：**網頁應用程式**
3. 設定：
   - **說明**：例如 `va-lingo-submit-1`
   - **執行身分**：**我**（Execute as: Me）← 學生提交會寫入此帳號的 Drive
   - **具有存取權的使用者**：
     - 有 Google Workspace：**學校網域內的任何人**（建議）
     - 學生 iPad 用個人 Google／或跨網域測試：**任何擁有連結的人**
4. 部署 → 完成授權
5. 複製 **網頁應用程式網址**（結尾為 `/exec`）

### 健康檢查

瀏覽器開啟：

```
https://script.google.com/macros/s/XXXX/exec?ping=1
```

應見到：

```json
{"ok":true,"version":"va-lingo-submit-1"}
```

---

## 五、接到前端（GitHub Pages）

1. 用電腦開啟 VA-Lingo 網頁（Pages 網址）
2. 點頁首右側較淡的 **雲端設定**（或長按標題「VA-Lingo 藝言堂」約 1 秒）
3. 貼上剛才的 `/exec` 網址 → 儲存  
   - 網址會存於該瀏覽器的 `localStorage`（鍵：`vaSubmitUrl`）
   - 每部學生 iPad／電腦若要用提交功能，需由 IT 設定一次（或用 MDM 預先注入）
4. 選好班別與學生後，按 **提交到學校雲端**
5. 成功會顯示提示；Drive 路徑為：
   ```
   VA-Lingo 提交 /
     └─ 5A /
          └─ 12_陳大文 /
               ├─ submission.json
               └─ artwork.jpg   （若有上傳作品）
   ```

> 未設定網址時，「提交到學校雲端」會停用，並提示先做雲端設定。本機自動儲存與「匯出評賞歷程卡」仍可離線使用。

---

## 六、老師如何瀏覽學生提交

1. 開啟 Drive 根資料夾「VA-Lingo 提交」
2. 按班別資料夾 → 學號_姓名 → 開啟 `submission.json` 或 `artwork.jpg`
3. 若有試算表：開啟 `submissions` 分頁，點 `folderUrl` 直達該生資料夾
4. 同一學生再次提交會**覆寫**同名檔案（同一資料夾），方便改交

---

## 七、私隱與安全注意

- 提交內容含學生姓名、學號、課業文字與作品圖，屬個人資料；請依學校政策限制 Drive／試算表共用範圍
- **執行身分為「我」**：所有檔案寫入部署帳號 Drive；請用科組共用帳號並啟用 2FA
- 存取設為「任何擁有連結的人」時，知道 `/exec` 網址者即可提交；請勿把網址公開貼到校外社群
- 前端 Pages 上的 `roster.json` 為課堂名單；正式環境宜改為校內限制存取
- Code.gs **不要**寫入密碼、API key；`ROOT_FOLDER_ID`／`SHEET_ID` 僅為資源 ID，仍勿公開倉庫若學校政策禁止
- Apps Script 每日配額有限（寫入 Drive／試算表）；全級同時提交若失敗，可分批再試

---

## 八、更新程式後重新部署

1. 在 Apps Script 編輯器改好 `Code.gs` → 儲存
2. **部署** → **管理部署作業** → 鉛筆圖示 → **新版本** → 部署
3. `/exec` 網址通常不變；前端不必改（除非新建部署）

---

## 九、疑難排解

| 情況 | 建議 |
|------|------|
| `?ping=1` 無回應 | 確認已部署且網址為 `/exec`；等 1–2 分鐘再試 |
| 提示未設定 ROOT_FOLDER_ID | 填 ID 後需「新版本」重新部署 |
| 找不到根資料夾 | ID 錯誤，或部署帳號對該資料夾無存取權 |
| CORS／網路錯誤 | 前端勿加 `Authorization` 等自訂標頭；用簡單 `Content-Type: text/plain` 或預設 JSON POST |
| 圖片很大失敗 | 前端會先壓成約 1600px JPEG；仍失敗可先不交圖、只交文字 |
| 學生 iPad 無法提交 | 檢查存取權是否涵蓋該 Google 帳號；或改「任何擁有連結的人」 |

---

## 相關檔案

- `apps-script/Code.gs` — 後端
- `apps-script/appsscript.json` — clasp／專案資訊清單
- `index.html` — 前端提交按鈕與雲端設定

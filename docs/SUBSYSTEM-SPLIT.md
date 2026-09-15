# 子系統劃分（短）

對齊時間膠囊重建後的學生產品邊界。

## 1. Onboarding-Kitten（入門・拼貼小貓）

- 路徑：`assets/demo/`
- 職責：必做示範；寫入 `va-lingo-onboarding-kitten:v1:{class}:{student}`
- 閘：`guided-app.js` 攔截正式評賞入口

## 2. Appreciation-Engine（評賞引擎）

- 路徑：`assets/js/guided-app.js` + `guided-model.js`
- 職責：一屏一題；名作／自評／互評同一引導流；提示、標記、口頭／協助記號
- 不自動打能力分、不代寫

## 3. Artwork sources（作品來源）

| 來源 | 說明 |
|------|------|
| master（名作） | 課題模板內建參考圖（如蒙羅麗莎、麥田） |
| selfie（自評） | 學生上傳本課作品照片 |
| external stub | 日後外連作品位；本分支以模板／上傳為主 |

輔助：`assessment-context.js` / `assessment-snapshot.js` / `assessment-recovery.js`

## 4. Peer（互評）

- 教師核對自評後開放；固定循環配對
- 學生按「更新清單」取得同學作品；匿名／學號呈現依後端規則

## 5. Identity（身份）

- 班別 + 學號選擇（預覽為合成名冊）
- 只作課堂身份選擇，不宣稱已完成個人實名驗證
- 教師角色經預覽 cookie／日後 Google 使用者核對

## 6. Storage（儲存）

- **本機**：`localStorage` 草稿（`art-time-capsule-v2:…`）與入門鍵
- **學校**：Apps Script / Sheet／Drive（預覽為合成；正式 ID 不進 repo）
- **Legacy**：`legacy-firebase.html` 仍用 Firebase 課堂畫廊路徑（僅保留，非主入口）

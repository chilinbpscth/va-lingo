# 本地驗證

`npm ci` 後執行：

- `npm test`：以真實五步模板驗證 context、作品歷史、填寫完整度及詞彙快照。
- `npm run check`：檢查 inline script 可解析及 roster.school.json 未被 Git 追蹤。
- `npm run test:browser`：需本機 Google Chrome；啟動獨立 headless profile 及臨時 localhost port，使用合成名冊／圖片，結束會關 browser/server。測學生切換、作品切換、重載及 Storage 配額失敗；截圖在忽略的 test-results/。

Browser test 攔截 Firebase SDK，唔讀写正式後端，唔使用用家瀏覽器 profile。這不是 Google MVP 的端到端驗收。真實接口及測試部署未取得，相關測試仍待完成。

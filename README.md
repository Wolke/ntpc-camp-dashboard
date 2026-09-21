# 新北市寒暑假育樂營查詢系統

幫助家長用手機快速查詢新北與臺北的寒暑假育樂營課程。

## 🌐 線上版

**https://wolke.github.io/ntpc-camp-dashboard/**

## 功能特色

- **課程查詢**：預設顯示尚未結束的課程，優先排列即將截止、可報名與尚未開放的課程
- **條件篩選**：支援關鍵字、資格、年級、狀態、費用、學制與日期重疊篩選
- **分享查詢**：篩選、學校與排序會同步至網址，重新整理或分享後可還原
- **找學校**：依行政區、校名或延遲載入的地圖縮小課程範圍
- **手機操作**：條件在篩選抽屜中暫存，確認結果數量後才套用；每次載入 24 筆
- **報名日期**：顯示報名期間，不錯過報名時機
- **官方詳情**：課程卡及分析頁可直接開啟官方課程頁或活動簡章
- **智慧顧問**：依年級、興趣、時段及預算從既有資料整理建議
- **加入行事曆**：一鍵加入 Google 日曆
- **客製化 email 通知**：訂閱目前的查詢條件，每週一更新後收到符合條件的課程摘要，也可選擇每日開放報名提醒；單一課程可加入 Google 日曆

## 資料來源

爬蟲自動從 [新北市寒暑假育樂營網站](https://camp.ntpc.edu.tw/)、新北市各校免登入公開活動頁與 [臺北市國民小學暑期體驗營](https://holiday.tp.edu.tw/camps_all) 擷取最新課程資料。逐校來源會補入所有未被 Camp 全站索引的公開課程，並以學校、活動、課程三級 ID 去重；「開放外校」或「限本校」則保留為資格標示與篩選條件。

同一次爬取會將完整索引差異寫入 `data/unindexed-activities.json`，逐校補入的課程則直接合併至 `data/courses.json`，並標示 `ntpc_school_activity` 來源。由於部分報名期不到一週，GitHub Actions 會在台灣時間每天 08:00 更新資料。

臺北補充來源暫時無法連線時，新北資料仍會更新；臺北保留最後成功取得的資料與原始日期，網站會顯示來源警示。`data/courses.json` 的 `sourceStatus` 記錄各來源的更新狀態。爬蟲主要流程失敗會讓排程失敗；提交前會檢查課程資料確實在本次執行中更新，除錯截圖只存為 Actions 附件。成功通知會在 GitHub Pages 部署完成、線上資料日期與筆數通過核對後發出，並列出未完整更新的來源。

## 本地開發

```bash
# 安裝依賴
npm install

# 啟動開發伺服器
npm run dev

# 執行爬蟲更新資料
npm run crawl

# 只更新台北市暑期體驗營資料
npm run crawl:taipei

# 比對各校公開活動頁與 Camp 全站索引
npm run audit:index -- --output data/unindexed-activities.json --summary

# 建置專案
npm run build

# 單元與元件測試
npm run test:unit

# Chromium 端對端與 axe 無障礙測試
npm run test:e2e
```

### Google 日曆報名提醒

「新增報名通知」會開啟 Google 日曆新增事件頁，並自動帶入課程名稱、報名時間、費用、報名入口與簡章連結。這個做法不需要 Google OAuth 審核；使用者在 Google 日曆確認後即可儲存提醒。

### 客製化 email 訂閱

在查詢頁設定條件後，點「訂閱這組條件」，輸入 email 並選擇通知頻率。預設為每週一課程摘要，也可選擇每日報名提醒或兩者皆收。信件會逐人篩選、單獨寄送，沒有符合課程時不寄。每週摘要列出當週更新後所有符合條件的課程，並非只寄新增課程。

訂閱會保存送出當下的關鍵字、行政區、學校、學制、年級、上課星期、費用、外校資格、日期、主題與狀態。比對規則與查詢頁共用（多個年級須全部符合，多個星期任一符合）；之後變更查詢不會改動已儲存的訂閱。相同 email 再次送出會更新設定。

前端訂閱表單需要可保存 `email` 與 `preferences` 的 endpoint，例如下方的 Google Apps Script 或自建 API：

```bash
VITE_SUBSCRIBE_ENDPOINT=https://example.com/subscribe
```

若使用 Google Apps Script，可建立 Google Sheet 後開啟 Apps Script，貼上 `scripts/google-apps-script/subscribe-endpoint.gs`，部署為 Web app：

```text
Execute as: Me
Who has access: Anyone
```

已有 GAS 訂閱服務時，請先用新版腳本更新部署。腳本會保留原有 `email`、`source`、`createdAt` 三欄，新增 `preferences`（JSON）、`updatedAt` 與 `active`。舊列未設定 preferences 時繼續收到每日提醒。停用訂閱可將該列 `active` 設為 FALSE；信件提供回覆管理者的說明。

接著把 Web app URL 設為 GitHub repository variable，重新建置網站：

```bash
VITE_SUBSCRIBE_ENDPOINT=https://script.google.com/macros/s/.../exec
```

自建 API 請回傳 `{ "ok": true, "preferencesSaved": true }`，才會顯示條件儲存成功。GAS 的跨來源請求無法讀取回應，畫面會如實顯示「已送出，無法確認儲存」。僅支援 email 的舊 endpoint 需先升級，不能當作已儲存條件。

如果沒有 endpoint，也可以設定管理者信箱，前端會開啟包含頻率與完整條件的 email 草稿：

```bash
VITE_SUBSCRIBE_CONTACT_EMAIL=admin@example.com
```

`.github/workflows/registration-notifications.yml` 會在 `Daily Crawl` 成功完成後才執行，取消原本獨立的 08:05 排程。台灣時間週一會寄每週摘要；每天會為選擇每日提醒的訂閱者寄出當天開放報名的課程。資料必須在本次爬取後更新且日期符合寄送日；未成功更新的來源不納入通知。排程延遲時不保證精確寄送時間。

請在 GitHub repository secrets 設定：

```bash
SUBSCRIBERS_JSON=[{"email":"parent@example.com"}]
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-smtp-user
SMTP_PASS=your-smtp-password
MAIL_FROM="新北育樂營 <notice@example.com>"
MAIL_REPLY_TO=admin@example.com
```

若訂閱名單放在 GAS 的 Google Sheet，請在 Apps Script Project Settings 的 Script properties 設定 `SUBSCRIBERS_API_TOKEN`，再將帶 token 的讀取 URL 設為 GitHub repository secret：

```bash
SUBSCRIBERS_JSON_URL=https://script.google.com/macros/s/.../exec?token=你的_token
```

`MAIL_REPLY_TO` 可省略，預設回覆寄件者，請使用可收信的地址。`MAIL_TO` 已不再使用，每封信只有該訂閱者一位收件人。

Action 讀取訂閱名單的優先順序是 `SUBSCRIBERS_JSON`、`SUBSCRIBERS_JSON_URL`、私有 `data/subscribers.json`。使用 GAS 時請移除舊的 `SUBSCRIBERS_JSON` secret，避免它遮蔽 Sheet 的最新設定。格式可參考 `data/subscribers.example.json`，`frequency` 支援 `weekly`、`daily`、`both`，`active: false` 可停用。無效的設定會略過該訂閱者，不會改寄所有課程。

實際名單受 `.gitignore` 排除；網站建置只複製指定公開課程 JSON，不會將訂閱者資料發布至 Pages。每日每類通知的寄送紀錄保存在 `.cache/notifications/sent.json`，逐封成功後寫入，以 GitHub Actions cache 保留；紀錄只含 HMAC 識別值與日期。可設定固定的 `NOTIFICATION_STATE_SECRET`，否則使用 `SMTP_PASS` 作為 HMAC 金鑰。同日重跑會略過已寄出的通知；清除／淘汰 cache、變更金鑰，或寄出後尚未寫入紀錄就中斷時，仍可能重寄。

#### 測試與手動補寄

先用預覽模式測試，不會連線 SMTP 或寫入寄送紀錄：

```bash
TZ=Asia/Taipei DRY_RUN=true NOTIFICATION_MODE=weekly \
  SUBSCRIBERS_FILE=data/subscribers.example.json npm run notify
```

也可手動執行 `Registration Notifications`，預設 `dry_run=true`。確認後關閉 dry run，選擇 `auto`、`weekly` 或 `daily` 補寄；實際寄送仍會檢查名單更新日期與既有寄送紀錄。`TARGET_DATE=YYYY-MM-DD` 可指定台灣日期進行歷史資料預覽，正式寄送要求資料更新日期一致。首次啟用時，建議先將訂閱名單設為自己的信箱。

寄信腳本透過 [tsx](https://github.com/privatenumber/tsx) 共用前端的 TypeScript 篩選規則；重跑紀錄使用 [GitHub Actions cache](https://docs.github.com/en/actions/reference/workflows-and-actions/dependency-caching)。

## 專案結構

```
├── src/
│   ├── components/     # React 元件
│   ├── pages/          # 頁面
│   ├── store/          # 狀態管理 (Zustand)
│   ├── types/          # TypeScript 類型
│   ├── utils/          # 工具函數
│   ├── index.js        # 爬蟲主程式
│   ├── ntpc-school-activity-crawler.js # 逐校公開活動、報名資格、正規化與去重
│   └── taipei-crawler.js # 台北市營隊爬蟲
├── data/
│   ├── courses.json           # 所有課程資料
│   ├── external-courses.json  # 開放外校生課程
│   ├── unindexed-activities.json # 各校已公開但未進入 Camp 全站索引的活動
│   └── taipei-courses.json    # 台北市營隊資料
└── .github/workflows/
    └── deploy.yml      # GitHub Pages 自動部署
```

## 技術架構

- **Frontend**: React 18 + TypeScript + Vite
- **Styling**: Tailwind CSS
- **Data**: React Query（唯一課程資料來源）
- **State**: Zustand（已套用的篩選條件與學校選擇）
- **Crawler**: Playwright + Cheerio
- **Deployment**: GitHub Pages

## 授權

MIT License

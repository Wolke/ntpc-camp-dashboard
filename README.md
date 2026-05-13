# 新北市寒暑假育樂營查詢系統

幫助家長快速找到**適合孩子**且**開放外校學生**報名的寒暑假育樂營課程。

## 🌐 線上版

**https://wolke.github.io/ntpc-camp-dashboard/**

## 功能特色

- **課程查詢**：瀏覽所有育樂營課程，支援關鍵字搜尋
- **學校篩選**：依國小、國中、高中篩選
- **報名日期**：顯示報名期間，不錯過報名時機
- **活動簡章**：直接查看課程簡章 PDF
- **加入行事曆**：一鍵加入 Google 日曆
- **報名通知**：訂閱當天開放報名的活動通知，也可將單一課程加入 Google Tasks

## 資料來源

爬蟲自動從 [新北市寒暑假育樂營網站](https://camp.ntpc.edu.tw/) 與 [臺北市國民小學暑期體驗營](https://holiday.tp.edu.tw/camps_all) 擷取最新課程資料。

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

# 建置專案
npm run build
```

### Google Tasks 報名通知

若要讓「新增報名通知」直接寫入 Google Tasks，請在 Google Cloud 建立 OAuth Client ID、啟用 Google Tasks API，並在本機或部署環境設定：

```bash
VITE_GOOGLE_CLIENT_ID=你的_OAuth_Client_ID
```

未設定時，按鈕會複製待辦內容並開啟 Google Tasks，方便手動貼上。

### Email 訂閱與每日通知

前端訂閱表單需要一個可接收 email 的 endpoint，例如 Google Apps Script、Formspree、Cloudflare Worker 或自建 API：

```bash
VITE_SUBSCRIBE_ENDPOINT=https://example.com/subscribe
```

如果沒有 endpoint，也可以設定管理者信箱，前端會改開 email 草稿：

```bash
VITE_SUBSCRIBE_CONTACT_EMAIL=admin@example.com
```

GitHub Actions 每天台灣時間 08:05 執行 `.github/workflows/registration-notifications.yml`，寄出「今天開放報名」的活動。請在 GitHub repository secrets 設定：

```bash
SUBSCRIBERS_JSON=[{"email":"parent@example.com"}]
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-smtp-user
SMTP_PASS=your-smtp-password
MAIL_FROM="新北育樂營 <notice@example.com>"
MAIL_TO=notice@example.com
```

`SUBSCRIBERS_JSON` 也可改用私有的 `data/subscribers.json`，格式可參考 `data/subscribers.example.json`；實際訂閱名單已被 `.gitignore` 排除，避免誤提交個資。

## 專案結構

```
├── src/
│   ├── components/     # React 元件
│   ├── pages/          # 頁面
│   ├── store/          # 狀態管理 (Zustand)
│   ├── types/          # TypeScript 類型
│   ├── utils/          # 工具函數
│   ├── index.js        # 爬蟲主程式
│   └── taipei-crawler.js # 台北市營隊爬蟲
├── data/
│   ├── courses.json           # 所有課程資料
│   ├── external-courses.json  # 開放外校生課程
│   └── taipei-courses.json    # 台北市營隊資料
└── .github/workflows/
    └── deploy.yml      # GitHub Pages 自動部署
```

## 技術架構

- **Frontend**: React 18 + TypeScript + Vite
- **Styling**: Tailwind CSS
- **State**: Zustand + React Query
- **Crawler**: Playwright + Cheerio
- **Deployment**: GitHub Pages

## 授權

MIT License

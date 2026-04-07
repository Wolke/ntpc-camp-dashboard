# 新北市寒暑假育樂營查詢系統

幫助家長快速找到**適合孩子**且**開放外校學生**報名的寒暑假育樂營課程。

## 🌐 線上版

**https://wolke.github.io/ntpc-camp-dashboard/**

## ✨ 功能特色

- � **課程查詢**：瀏覽所有育樂營課程，支援關鍵字搜尋
- � **學校篩選**：依國小、國中、高中篩選
- � **報名日期**：顯示報名期間，不錯過報名時機
- � **活動簡章**：直接查看課程簡章 PDF
- 🗓️ **加入行事曆**：一鍵加入 Google 日曆
- ✅ **報名提醒**：設定報名期間提醒

## 📊 資料來源

爬蟲每日自動從 [新北市寒暑假育樂營網站](https://camp.ntpc.edu.tw/) 擷取最新課程資料。

## 🛠️ 本地開發

```bash
# 安裝依賴
npm install

# 啟動開發伺服器
npm run dev

# 執行爬蟲更新資料
npm run crawl

# 建置專案
npm run build
```

## 📁 專案結構

```
├── src/
│   ├── components/     # React 元件
│   ├── pages/          # 頁面
│   ├── store/          # 狀態管理 (Zustand)
│   ├── types/          # TypeScript 類型
│   ├── utils/          # 工具函數
│   └── index.js        # 爬蟲主程式
├── data/
│   ├── courses.json           # 所有課程資料
│   └── external-courses.json  # 開放外校生課程
└── .github/workflows/
    └── deploy.yml      # GitHub Pages 自動部署
```

## 📦 技術架構

- **Frontend**: React 18 + TypeScript + Vite
- **Styling**: Tailwind CSS
- **State**: Zustand + React Query
- **Crawler**: Playwright
- **Deployment**: GitHub Pages

## 📝 授權

MIT License

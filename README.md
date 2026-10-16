# 教會通訊錄

教會會友資料庫，可用電腦瀏覽器或手機（加到主畫面即可當 App 使用）存取。

- 會員基本資料、教會資料、敏感資料分級顯示
- 大頭照、證件照、活動照片（自動縮圖，節省空間）
- 會員動態／近況更新，隨時間累積
- 總覽儀表板、搜尋與篩選
- 使用者帳號與三種角色（管理員／同工／一般使用者）
- 密碼登入，以及 Passkey（Face ID、指紋、Windows Hello）免密碼登入
- 所有資料異動都有操作紀錄
- 同一套程式可部署給多間教會，資料完全隔離

## 技術架構

| 層面 | 選擇 | 說明 |
|---|---|---|
| 網頁框架 | Next.js 16（App Router）+ React 19 + TypeScript | 一套程式同時提供網頁與手機介面 |
| 樣式 | Tailwind CSS 4 | 響應式、支援深色模式 |
| 資料庫 | PostgreSQL（Supabase 託管） | 透過 Drizzle ORM 存取，遷移檔在 `drizzle/` |
| 登入 | Better Auth | 密碼 + Passkey（WebAuthn）+ 帳號管理 |
| 照片 | Supabase Storage 私有 bucket | 本機開發可改用資料夾（`STORAGE_DRIVER=local`） |
| 圖片處理 | sharp | 上傳時轉正、縮圖、轉 JPEG |

照片一律透過本系統的 `/api/files/...` 路由提供，每次都檢查登入狀態與權限，證件照只有同工與管理員能看到。

## 角色與權限

| 功能 | 管理員 | 同工 | 一般使用者 |
|---|:-:|:-:|:-:|
| 瀏覽會員基本資料、活動照片 | ✔ | ✔ | ✔ |
| 查看敏感資料（身分證、地址、緊急聯絡人、內部備註、證件照） | ✔ | ✔ | |
| 新增／編輯會員、動態、照片 | ✔ | ✔ | |
| 刪除會員 | ✔ | | |
| 建立帳號、指派角色、停用、重設密碼 | ✔ | | |
| 查看操作紀錄 | ✔ | | |

權限定義集中在 `src/lib/permissions.ts`。

## 本機開發

需求：Node.js 22、PostgreSQL（本機或 Supabase）。

```bash
cp .env.example .env     # 填入 DATABASE_URL 等值；本機測試 STORAGE_DRIVER 用 local
npm install
npm run db:migrate       # 建立資料表
npm run db:seed          # 建立教會與第一位管理員（讀取 .env 的 SEED_* 變數）
npm run dev              # http://localhost:3000
```

常用指令：

| 指令 | 用途 |
|---|---|
| `npm run dev` | 開發伺服器 |
| `npm run build` / `npm start` | 正式建置與啟動 |
| `npm run typecheck` / `npm run lint` | 型別檢查、程式風格檢查 |
| `npm run db:generate` | 修改 `src/db/schema.ts` 後產生遷移檔 |
| `npm run db:migrate` | 套用遷移檔到資料庫 |
| `npm run db:seed` | 初始化教會與管理員 |
| `npm run import:excel -- <檔案.xlsx> [--dry-run]` | 從舊 Excel 名冊匯入會員 |
| `npm run auth:generate` | 更新 Better Auth 設定後重新產生 `src/db/auth-schema.ts` |

## 從舊 Excel 名冊匯入

`scripts/import-excel.ts` 可把舊版 Excel 名冊匯入會員資料表。先用 `--dry-run` 試跑看報告，確認後再正式匯入：

```bash
npm run import:excel -- "docs/San Jose Church Member Directory 2017-10-02.xlsx" --dry-run
npm run import:excel -- "docs/San Jose Church Member Directory 2017-10-02.xlsx"
```

- 以第一列標題辨識欄位（Role、Last Name、First Name、中文姓名、Gender、Married?、Baptized?、Baptized Date、Birth Year、Status、Phone、Email、Address、Notes）。
- 中文姓名作為「姓名」，英文姓名作為「英文名」；電話欄的 Home／Mobile／Office 會拆成電話、手機，其餘放入內部備註。
- 家庭角色、已婚、已受洗、原備註等沒有對應欄位的資訊，都寫入「內部備註」，不會遺失。
- 同一人出現多列（合併儲存格的續行或重複登錄）會自動合併；姓名不完整、電子郵件格式可疑的列會列在報告中請人工確認。
- 重複執行是安全的：以姓名產生的舊名冊編號比對，已存在者更新、不重複建檔。
- 可用 `--sheet "工作表名稱"` 指定工作表，`--label "2017 名冊"` 自訂備註中的來源標籤，`--note "說明"` 在每位匯入者的內部備註加一行說明。
- **匯入較舊的名冊時務必加 `--only-new`**：只新增資料庫裡還沒有的人，已存在者完全不更動，避免新資料被舊資料覆蓋。報告會列出新增的人名。

本專案兩份舊名冊的建議順序（先新後舊）：

```bash
npm run import:excel -- "docs/San Jose Church Member Directory 2017-10-02.xlsx"
npm run import:excel -- "docs/San Jose Church Directory 2016.xlsx" --only-new --label "2016 名冊" \
  --note "此人僅出現在 2016 年名冊，2017 年名冊已無此人，請確認目前狀態"
```
- 正式環境請在本機把 `.env` 的 `DATABASE_URL` 指向 Supabase 後執行，匯入完成後到「操作紀錄」可看到一筆匯入摘要。

## 部署與新教會上線

完整步驟請見 [docs/新教會上線步驟.md](docs/新教會上線步驟.md)。重點：

1. 建立 Supabase 專案，開一個**私有** bucket `member-files`。
2. 依 `.env.example` 準備環境變數，`BETTER_AUTH_SECRET` 每間教會不同。
3. 本機執行 `npm run db:migrate` 與 `npm run db:seed`。
4. 部署到 Vercel 等平台並設定環境變數。
5. 免費方案請設定 GitHub Actions 變數 `APP_URL`，`.github/workflows/keep-alive.yml` 會每 3 天喚醒一次。

## 專案結構

```
src/
  app/                 頁面與 API
    (app)/             需登入的頁面：總覽、會員、我的帳號、管理
    login/             登入頁
    api/auth/          Better Auth 端點
    api/files/         受權限保護的照片下載
    api/members/[id]/photos/  照片上傳
    api/health/        健康檢查（保持喚醒用）
  components/          共用元件與表單
  config/church.ts     教會名稱、主色（讀自環境變數）
  db/                  Drizzle 資料表定義（auth-schema.ts 由 CLI 產生）
  lib/
    auth.ts            Better Auth 設定（密碼、Passkey、admin）
    session.ts         取得目前登入者、權限檢查
    permissions.ts     角色與權限矩陣
    data/              資料存取層（會員、照片、使用者、操作紀錄）
    storage/           照片儲存（local / supabase）與圖片處理
  proxy.ts             未登入直接導向登入頁
drizzle/               資料庫遷移檔
scripts/seed.ts        初始化腳本
scripts/import-excel.ts 舊 Excel 名冊匯入
docs/                  操作文件
```

## 個資保護注意事項

- 本系統儲存會友個人資料與證件照，請只建立必要的帳號，並定期檢查「使用者管理」中的名單。
- 證件照與身分證字號等敏感欄位只開放給同工以上角色；一般使用者的瀏覽器永遠不會收到這些資料。
- 請定期備份資料庫與照片，備份檔請加密保存。
- 會友要求刪除資料時，管理員可在會員頁面刪除；資料會被隱藏並保留在資料庫中，若需徹底清除請直接在資料庫刪除該筆紀錄與對應照片。

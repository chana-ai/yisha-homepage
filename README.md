# 一刹信息官网主页

一刹信息公司官网主页（单页静态站），结构参考 ADVANCE.AI 的 ToB 企业站组织方式，文案原创。

## 内容

- **一刹·成片** — 一站式视频生成：将企业内容转化为广告营销等视频（广告营销 / 教育培训 / 创意短片 / 个人 IP）
- **一刹·智枢** — 企业智能：组织制造业数据，构建知识图谱，供 AI Agent 使用，帮助企业把信息用起来

## 技术

- 页面纯静态：整个站点就是一个 `index.html`（图片等资源已内联），无构建步骤、无依赖
- 本地预览：直接用浏览器打开 `index.html`，或 `python3 -m http.server` 后访问 `http://localhost:8000`
- 留资表单有后端：`functions/api/lead.js`（Pages Function）把提交写入 Cloudflare D1 并发通知，配置见下节；后端未配置时表单会自动兜底为「生成可复制摘要」

## 部署（Cloudflare Pages）

1. Cloudflare 控制台 → Workers & Pages → Create → Pages → Connect to Git，选择本仓库
2. 构建设置：Framework preset 选 None，Build command 留空，Build output directory 填 `/`
3. 部署完成后每次 push 到 main 分支会自动重新部署
4. 自定义域名：Pages 项目 → Custom domains → 绑定已注册域名，并按提示配置 DNS 与 HTTPS

## 微调

- 改文案：在 `index.html` 里搜索对应文字直接修改，保存后 push 即自动上线
- 页眉英文名「YISHA INFO TECH」为暂用草案，品牌名定案后全局替换这一处即可

## 留资表单后端（Cloudflare D1 + 通知）

表单提交流程：浏览器 POST `/api/lead` → Pages Function 校验（含蜜罐防机器人）→ 写入 D1 的 `leads` 表 → 按配置发飞书 / 邮件通知（通知失败不影响存库）。首次启用需在 Cloudflare 侧做四步：

1. **建数据库**：控制台 → Storage & databases → D1 → Create database，命名 `yisha-leads`（或命令行 `npx wrangler d1 create yisha-leads`）
2. **建表**：打开该数据库的 Console 标签，粘贴执行仓库里 `schema.sql` 的内容（或 `npx wrangler d1 execute yisha-leads --remote --file schema.sql`）
3. **绑定到 Pages 项目**：Pages 项目 → Settings → Functions → D1 database bindings → Add：Variable name 填 `DB`，数据库选 `yisha-leads`，保存后重新部署一次生效
4. **配通知（可选，配哪个发哪个）**：Pages 项目 → Settings → Environment variables → Production，添加以下变量（建议类型选 Secret）：
   - 飞书：`FEISHU_WEBHOOK_URL` = 飞书群里添加「自定义机器人」后得到的 webhook 地址；机器人若开了签名校验，再加 `FEISHU_SECRET`
   - 邮件：`RESEND_API_KEY`（Resend 的 API Key）+ `NOTIFY_EMAIL`（接收留资的邮箱）；发件人默认 `onboarding@resend.dev`，绑自有域名后可用 `NOTIFY_FROM` 改为自有地址

**查看留资**：D1 控制台打开 `yisha-leads` → Console 执行 `SELECT * FROM leads ORDER BY id DESC;`，或在控制台的 Tables 里直接浏览 `leads` 表。

**本地联调**：`npx wrangler d1 execute yisha-leads --local --file schema.sql` 后 `npx wrangler pages dev .`，在本机提交表单即可走通完整链路（通知变量可放 `.dev.vars` 文件，仅本地生效，勿提交）。

后续如遇表单垃圾提交增多，可再接入 Cloudflare Turnstile 人机校验。

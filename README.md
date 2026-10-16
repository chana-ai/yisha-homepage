# 一刹信息官网主页

一刹信息公司官网主页（单页静态站），结构参考 ADVANCE.AI 的 ToB 企业站组织方式，文案原创。

## 内容

- **一刹·成片** — 一站式视频生成：将企业内容转化为广告营销等视频（广告营销 / 教育培训 / 创意短片 / 个人 IP）
- **一刹·智枢** — 企业智能：组织制造业数据，构建知识图谱，供 AI Agent 使用，帮助企业把信息用起来

## 技术

- 纯静态：整个站点就是一个 `index.html`（图片等资源已内联），无构建步骤、无依赖
- 本地预览：直接用浏览器打开 `index.html`，或 `python3 -m http.server` 后访问 `http://localhost:8000`

## 部署（Cloudflare Pages）

1. Cloudflare 控制台 → Workers & Pages → Create → Pages → Connect to Git，选择本仓库
2. 构建设置：Framework preset 选 None，Build command 留空，Build output directory 填 `/`
3. 部署完成后每次 push 到 main 分支会自动重新部署
4. 自定义域名：Pages 项目 → Custom domains → 绑定已注册域名，并按提示配置 DNS 与 HTTPS

## 微调

- 改文案：在 `index.html` 里搜索对应文字直接修改，保存后 push 即自动上线
- 页眉英文名「YISHA INFO TECH」为暂用草案，品牌名定案后全局替换这一处即可

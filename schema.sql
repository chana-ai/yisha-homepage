-- 一刹信息官网留资表（Cloudflare D1 / SQLite）
-- 执行方式见 README「留资表单后端」一节。
CREATE TABLE IF NOT EXISTS leads (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  company    TEXT NOT NULL,
  name       TEXT,
  product    TEXT NOT NULL,
  contact    TEXT,
  message    TEXT,
  referer    TEXT,
  user_agent TEXT,
  country    TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_leads_created_at ON leads (created_at);

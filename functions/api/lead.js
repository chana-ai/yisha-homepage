// POST /api/lead — 官网留资接口（Cloudflare Pages Function）
// 1) 把留资写入 D1 数据库（绑定名 DB，见 wrangler.toml / schema.sql）
// 2) 通知（可选，配了哪个发哪个，没配就跳过，不影响存库）：
// - 飞书群机器人：环境变量 FEISHU_WEBHOOK_URL（如机器人开了签名校验，再配 FEISHU_SECRET）
// - 邮件（Resend）：环境变量 RESEND_API_KEY + NOTIFY_EMAIL（可选 NOTIFY_FROM）

const LIMITS = { company: 200, name: 100, product: 200, contact: 200, message: 5000};

function json(data, status = 200) {
return new Response(JSON.stringify(data), {
status,
headers: { 'Content-Type': 'application/json; charset=utf-8'},
});
}

function clean(value, max) {
if (typeof value!== 'string') return '';
return value.trim().slice(0, max);
}

async function feishuSign(secret, timestamp) {
// 飞书签名：HMAC-SHA256，key = `${timestamp}\n${secret}`，data 为空字符串
const key = await crypto.subtle.importKey(
'raw',
new TextEncoder().encode(`${timestamp}\n${secret}`),
{ name: 'HMAC', hash: 'SHA-256'},
false,
['sign'],
);
const sig = await crypto.subtle.sign('HMAC', key, new Uint8Array(0));
let bin = '';
new Uint8Array(sig).forEach((b) => { bin += String.fromCharCode(b);});
return btoa(bin);
}

async function notifyFeishu(env, text) {
const payload = { msg_type: 'text', content: { text}};
if (env.FEISHU_SECRET) {
const timestamp = Math.floor(Date.now() / 1000).toString();
payload.timestamp = timestamp;
payload.sign = await feishuSign(env.FEISHU_SECRET, timestamp);
}
const res = await fetch(env.FEISHU_WEBHOOK_URL, {
method: 'POST',
headers: { 'Content-Type': 'application/json'},
body: JSON.stringify(payload),
});
if (!res.ok) throw new Error(`feishu webhook HTTP ${res.status}`);
}

async function notifyEmail(env, lead, text) {
const res = await fetch('https://api.resend.com/emails', {
method: 'POST',
headers: {
'Content-Type': 'application/json',
Authorization: `Bearer ${env.RESEND_API_KEY}`,
},
body: JSON.stringify({
from: env.NOTIFY_FROM || '一刹信息官网 <onboarding@resend.dev>',
to: [env.NOTIFY_EMAIL],
subject: `官网新留资：${lead.company}`,
text,
}),
});
if (!res.ok) throw new Error(`resend HTTP ${res.status}`);
}

export async function onRequestPost(context) {
const { request, env} = context;

let body;
try {
body = await request.json();
} catch {
return json({ ok: false, error: '请求格式不正确'}, 400);
}

// 蜜罐字段：真人不会填，填了的大概率是机器人 — 假装成功，不存库不通知
if (typeof body.website === 'string' && body.website.trim()!== '') {
return json({ ok: true});
}

const lead = {
company: clean(body.company, LIMITS.company),
name: clean(body.name, LIMITS.name),
product: clean(body.product, LIMITS.product),
contact: clean(body.contact, LIMITS.contact),
message: clean(body.message, LIMITS.message),
};
if (!lead.company ||!lead.product) {
return json({ ok: false, error: '公司名称和感兴趣的产品为必填项'}, 400);
}

if (!env.DB) {
console.error('D1 binding "DB" is not configured');
return json({ ok: false, error: '服务器未完成配置，请稍后再试'}, 500);
}

try {
await env.DB.prepare(
'INSERT INTO leads (company, name, product, contact, message, referer, user_agent, country) VALUES (?1,?2,?3,?4,?5,?6,?7,?8)',
)
.bind(
lead.company,
lead.name || null,
lead.product,
lead.contact || null,
lead.message || null,
request.headers.get('Referer') || null,
request.headers.get('User-Agent') || null,
(request.cf && request.cf.country) || null,
)
.run();
} catch (err) {
console.error('D1 insert failed:', err);
return json({ ok: false, error: '提交失败，请稍后再试'}, 500);
}

// 通知是附加动作：失败只记日志，不影响访客提交成功
const text = [
'【一刹信息官网 · 新留资】',
`公司 / 团队：${lead.company}`,
lead.name && `联系人：${lead.name}`,
`感兴趣的产品：${lead.product}`,
lead.contact && `联系方式：${lead.contact}`,
lead.message && `需求描述：${lead.message}`,
`提交时间（UTC）：${new Date().toISOString()}`,
]
.filter(Boolean)
.join('\n');

const jobs = [];
if (env.FEISHU_WEBHOOK_URL) jobs.push(notifyFeishu(env, text).catch((e) => console.error('feishu notify failed:', e)));
if (env.RESEND_API_KEY && env.NOTIFY_EMAIL) jobs.push(notifyEmail(env, lead, text).catch((e) => console.error('email notify failed:', e)));
if (jobs.length) context.waitUntil(Promise.all(jobs));

return json({ ok: true});
}

export async function onRequest(context) {
if (context.request.method!== 'POST') {
return json({ ok: false, error: 'Method Not Allowed'}, 405);
}
return onRequestPost(context);
}

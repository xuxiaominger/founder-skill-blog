import { createServer } from "node:http";
import { readFile, writeFile, readdir, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = process.cwd();
const port = Number(process.env.ADMIN_PORT || 4326);
const password = process.env.ADMIN_PASSWORD || "chuangye2026";
const postsDir = path.join(root, "content", "posts");
const publicDir = path.join(root, "admin");
const mime = { ".html": "text/html; charset=utf-8", ".css": "text/css; charset=utf-8", ".js": "text/javascript; charset=utf-8" };

const send = (res, status, data, type = "application/json; charset=utf-8") => {
  res.writeHead(status, { "content-type": type });
  res.end(typeof data === "string" ? data : JSON.stringify(data));
};

const body = async (req) => {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  return chunks.length ? JSON.parse(Buffer.concat(chunks).toString("utf8")) : {};
};

const run = (cmd, args) =>
  new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { cwd: root, shell: false });
    let out = "";
    child.stdout.on("data", (data) => (out += data));
    child.stderr.on("data", (data) => (out += data));
    child.on("close", (code) => (code === 0 ? resolve(out) : reject(new Error(out))));
  });

const authed = (req) => req.headers["x-admin-password"] === password;
const postPath = (slug) => path.join(postsDir, `${slug}.json`);
const slugify = (value) =>
  String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fa5]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);

async function listPosts() {
  if (!existsSync(postsDir)) await mkdir(postsDir, { recursive: true });
  const files = (await readdir(postsDir)).filter((file) => file.endsWith(".json"));
  const posts = [];
  for (const file of files) posts.push(JSON.parse(await readFile(path.join(postsDir, file), "utf8")));
  return posts.sort((a, b) => String(b.date).localeCompare(String(a.date)));
}

async function handleApi(req, res) {
  if (req.url === "/api/login" && req.method === "POST") {
    const data = await body(req);
    return send(res, data.password === password ? 200 : 401, { ok: data.password === password });
  }
  if (!authed(req)) return send(res, 401, { error: "Unauthorized" });

  if (req.url === "/api/posts" && req.method === "GET") return send(res, 200, await listPosts());

  if (req.url === "/api/posts" && req.method === "POST") {
    const data = await body(req);
    const slug = slugify(data.slug || data.title);
    if (!slug || !data.title) return send(res, 400, { error: "title and slug required" });
    const post = {
      title: data.title,
      slug,
      category: data.category || "创业笔记",
      description: data.description || "",
      date: data.date || new Date().toISOString().slice(0, 10),
      body: data.body || ""
    };
    await writeFile(postPath(slug), `${JSON.stringify(post, null, 2)}\n`);
    await run("node", ["scripts/generate-site.mjs"]);
    return send(res, 200, post);
  }

  if (req.url === "/api/generate" && req.method === "POST") {
    return send(res, 200, { output: await run("node", ["scripts/generate-site.mjs"]) });
  }

  if (req.url === "/api/publish" && req.method === "POST") {
    await run("node", ["scripts/generate-site.mjs"]);
    await run("git", ["add", "."]);
    const status = await run("git", ["status", "--short"]);
    if (!status.trim()) return send(res, 200, { output: "No changes to publish." });
    await run("git", ["commit", "-m", "Update chuangye2026 content"]);
    return send(res, 200, { output: await run("git", ["push"]) });
  }

  send(res, 404, { error: "Not found" });
}

createServer(async (req, res) => {
  try {
    if (req.url.startsWith("/api/")) return await handleApi(req, res);
    const route = req.url === "/" ? "/index.html" : req.url.split("?")[0];
    const file = path.join(publicDir, route);
    if (!file.startsWith(publicDir)) return send(res, 403, "Forbidden", "text/plain; charset=utf-8");
    if (!existsSync(file)) return send(res, 404, "Not found", "text/plain; charset=utf-8");
    const ext = path.extname(file);
    send(res, 200, await readFile(file, "utf8"), mime[ext] || "text/plain; charset=utf-8");
  } catch (error) {
    send(res, 500, { error: error.message });
  }
}).listen(port, "127.0.0.1", () => {
  console.log(`chuangye2026 admin: http://127.0.0.1:${port}`);
  console.log(`password: ${password}`);
});

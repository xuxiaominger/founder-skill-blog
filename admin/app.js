let username = localStorage.getItem("adminUsername") || "";
let password = localStorage.getItem("adminPassword") || "";
let posts = [];
let autoSaveTimer;
let loadingPost = false;

const $ = (id) => document.getElementById(id);
const log = (message) => ($("log").textContent = message);
const setSaveState = (message) => ($("saveState").textContent = message);

const escapeHtml = (value = "") =>
  String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");

const inlineMarkdown = (text = "") =>
  escapeHtml(text)
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2">$1</a>');

function markdownToHtml(markdown = "") {
  return markdown
    .trim()
    .split(/\n{2,}/)
    .filter(Boolean)
    .map((block) => {
      const lines = block.split("\n");
      if (block.startsWith("## ")) return `<h2>${inlineMarkdown(block.slice(3))}</h2>`;
      if (block.startsWith("### ")) return `<h3>${inlineMarkdown(block.slice(4))}</h3>`;
      if (lines.every((line) => /^\d+\.\s+/.test(line))) {
        return `<ol>${lines.map((line) => `<li>${inlineMarkdown(line.replace(/^\d+\.\s+/, ""))}</li>`).join("")}</ol>`;
      }
      if (lines.every((line) => /^-\s+/.test(line))) {
        return `<ul>${lines.map((line) => `<li>${inlineMarkdown(line.replace(/^-\s+/, ""))}</li>`).join("")}</ul>`;
      }
      return `<p>${inlineMarkdown(block).replaceAll("\n", "<br>")}</p>`;
    })
    .join("");
}

function slugify(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fa5]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

async function api(path, options = {}) {
  const response = await fetch(path, {
    ...options,
    headers: {
      "content-type": "application/json",
      "x-admin-username": username,
      "x-admin-password": password,
      ...(options.headers || {})
    }
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "Request failed");
  return data;
}

function currentPost() {
  return {
    title: $("title").value.trim(),
    slug: slugify($("slug").value || $("title").value),
    category: $("category").value.trim() || "创业笔记",
    date: $("date").value || new Date().toISOString().slice(0, 10),
    description: $("description").value.trim(),
    body: $("body").value
  };
}

function updatePreviewLink(slug = currentPost().slug) {
  $("preview").href = slug ? `/site/blog/${slug}.html` : "/site/blog/";
}

function renderDraftPreview() {
  const post = currentPost();
  updatePreviewLink(post.slug);
  $("previewFrame").srcdoc = `<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <style>
      body { margin: 0; background: #fbfaf6; color: #17211d; font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif; line-height: 1.7; }
      main { width: min(760px, calc(100% - 36px)); margin: 0 auto; padding: 42px 0 72px; }
      .eyebrow { color: #0f6b50; font-size: 13px; font-weight: 800; }
      h1 { margin: 0 0 18px; font-size: clamp(32px, 6vw, 52px); line-height: 1.1; overflow-wrap: anywhere; }
      h2 { margin-top: 36px; font-size: 30px; line-height: 1.2; }
      p, li { color: #3f4c45; }
      .lead { font-size: 18px; }
      strong { color: #17211d; }
    </style>
  </head>
  <body>
    <main>
      <p class="eyebrow">${escapeHtml(post.category)} · ${escapeHtml(post.date)}</p>
      <h1>${escapeHtml(post.title || "未命名文章")}</h1>
      <p class="lead">${escapeHtml(post.description || "这里会显示文章 SEO 描述。")}</p>
      ${markdownToHtml(post.body || "开始输入正文后，这里会实时显示预览。")}
    </main>
  </body>
</html>`;
}

function setPost(post = {}) {
  loadingPost = true;
  $("title").value = post.title || "";
  $("slug").value = post.slug || "";
  $("category").value = post.category || "创业笔记";
  $("date").value = post.date || new Date().toISOString().slice(0, 10);
  $("description").value = post.description || "";
  $("body").value = post.body || "";
  updatePreviewLink(post.slug);
  renderDraftPreview();
  setSaveState("等待编辑");
  loadingPost = false;
}

function renderList() {
  $("postList").innerHTML = posts
    .map((post) => `<button type="button" data-slug="${post.slug}">${escapeHtml(post.title)}<br><small>${escapeHtml(post.category)} · ${escapeHtml(post.date)}</small></button>`)
    .join("");
  $("postList").querySelectorAll("button").forEach((button) => {
    button.addEventListener("click", () => setPost(posts.find((post) => post.slug === button.dataset.slug)));
  });
}

async function loadPosts({ keepCurrent = false } = {}) {
  const slug = currentPost().slug;
  posts = await api("/api/posts");
  renderList();
  if (!keepCurrent && posts[0]) setPost(posts[0]);
  if (keepCurrent && slug) updatePreviewLink(slug);
}

async function savePost({ quiet = false } = {}) {
  const post = currentPost();
  if (!post.title || !post.slug) {
    setSaveState("需要标题和 slug");
    return;
  }
  setSaveState("正在保存...");
  const saved = await api("/api/posts", { method: "POST", body: JSON.stringify(post) });
  await loadPosts({ keepCurrent: true });
  $("preview").href = saved.previewUrl;
  $("previewFrame").src = `${saved.previewUrl}?t=${Date.now()}`;
  setSaveState("已保存并更新预览");
  if (!quiet) log("已保存、重新生成页面，并刷新真实预览。");
}

function scheduleAutoSave() {
  if (loadingPost || $("workspace").classList.contains("hidden")) return;
  renderDraftPreview();
  setSaveState("编辑中...");
  clearTimeout(autoSaveTimer);
  autoSaveTimer = setTimeout(async () => {
    try {
      await savePost({ quiet: true });
    } catch (error) {
      setSaveState("自动保存失败");
      log(error.message);
    }
  }, 900);
}

$("loginButton").addEventListener("click", async () => {
  username = $("username").value;
  password = $("password").value;
  await api("/api/login", { method: "POST", body: JSON.stringify({ username, password }) });
  localStorage.setItem("adminUsername", username);
  localStorage.setItem("adminPassword", password);
  $("login").classList.add("hidden");
  $("workspace").classList.remove("hidden");
  await loadPosts();
  log("已登录。编辑会实时预览，并在停顿后自动保存生成页面。");
});

$("username").value = username;
$("password").value = password;

$("newPost").addEventListener("click", () => {
  $("workspace").classList.remove("hidden");
  setPost();
});

$("title").addEventListener("input", () => {
  if (!$("slug").value.trim()) $("slug").value = slugify($("title").value);
  scheduleAutoSave();
});

["slug", "category", "date", "description", "body"].forEach((id) => {
  $(id).addEventListener("input", scheduleAutoSave);
});

$("form").addEventListener("submit", async (event) => {
  event.preventDefault();
  clearTimeout(autoSaveTimer);
  await savePost();
});

$("generate").addEventListener("click", async () => {
  const result = await api("/api/generate", { method: "POST", body: "{}" });
  const slug = currentPost().slug;
  if (slug) $("previewFrame").src = `/site/blog/${slug}.html?t=${Date.now()}`;
  log(result.output || "已重新生成。");
});

$("publish").addEventListener("click", async () => {
  log("正在发布，请稍等...");
  const result = await api("/api/publish", { method: "POST", body: "{}" });
  log(result.output || "已发布。");
});

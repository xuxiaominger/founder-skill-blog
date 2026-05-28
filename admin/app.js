let username = localStorage.getItem("adminUsername") || "";
let password = localStorage.getItem("adminPassword") || "";
let posts = [];

const $ = (id) => document.getElementById(id);
const log = (message) => ($("log").textContent = message);

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

function setPost(post = {}) {
  $("title").value = post.title || "";
  $("slug").value = post.slug || "";
  $("category").value = post.category || "创业笔记";
  $("date").value = post.date || new Date().toISOString().slice(0, 10);
  $("description").value = post.description || "";
  $("body").value = post.body || "";
  $("preview").href = post.slug ? `../blog/${post.slug}.html` : "../blog/";
}

function renderList() {
  $("postList").innerHTML = posts
    .map((post) => `<button type="button" data-slug="${post.slug}">${post.title}<br><small>${post.category} · ${post.date}</small></button>`)
    .join("");
  $("postList").querySelectorAll("button").forEach((button) => {
    button.addEventListener("click", () => setPost(posts.find((post) => post.slug === button.dataset.slug)));
  });
}

async function loadPosts() {
  posts = await api("/api/posts");
  renderList();
  if (posts[0]) setPost(posts[0]);
}

$("loginButton").addEventListener("click", async () => {
  username = $("username").value;
  password = $("password").value;
  await api("/api/login", { method: "POST", body: JSON.stringify({ username, password }) });
  localStorage.setItem("adminUsername", username);
  localStorage.setItem("adminPassword", password);
  $("login").classList.add("hidden");
  $("form").classList.remove("hidden");
  await loadPosts();
  log("已登录。");
});

$("username").value = username;
$("password").value = password;

$("newPost").addEventListener("click", () => {
  $("form").classList.remove("hidden");
  setPost();
});

$("form").addEventListener("submit", async (event) => {
  event.preventDefault();
  const post = {
    title: $("title").value,
    slug: $("slug").value,
    category: $("category").value,
    date: $("date").value,
    description: $("description").value,
    body: $("body").value
  };
  await api("/api/posts", { method: "POST", body: JSON.stringify(post) });
  await loadPosts();
  log("已保存并重新生成静态页面。");
});

$("generate").addEventListener("click", async () => {
  const result = await api("/api/generate", { method: "POST", body: "{}" });
  log(result.output || "已重新生成。");
});

$("publish").addEventListener("click", async () => {
  log("正在发布，请稍等...");
  const result = await api("/api/publish", { method: "POST", body: "{}" });
  log(result.output || "已发布。");
});

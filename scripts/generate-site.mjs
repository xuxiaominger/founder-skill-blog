import { readdir, readFile, writeFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";

const root = process.cwd();
const config = JSON.parse(await readFile(path.join(root, "site.config.json"), "utf8"));
const postsDir = path.join(root, "content", "posts");
const blogDir = path.join(root, "blog");

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
  const blocks = markdown.trim().split(/\n{2,}/);
  return blocks
    .map((block) => {
      const lines = block.split("\n");
      if (block.startsWith("## ")) return `<h2>${inlineMarkdown(block.slice(3))}</h2>`;
      if (block.startsWith("### ")) return `<h3>${inlineMarkdown(block.slice(4))}</h3>`;
      if (lines.every((line) => /^\d+\.\s+/.test(line))) {
        return `<ol class="rich-list">${lines.map((line) => `<li>${inlineMarkdown(line.replace(/^\d+\.\s+/, ""))}</li>`).join("")}</ol>`;
      }
      if (lines.every((line) => /^-\s+/.test(line))) {
        return `<ul class="rich-list">${lines.map((line) => `<li>${inlineMarkdown(line.replace(/^-\s+/, ""))}</li>`).join("")}</ul>`;
      }
      if (lines.length >= 2 && lines[0].includes("|") && /^\|\s*-/.test(lines[1])) {
        const rows = lines.map((line) => line.split("|").slice(1, -1).map((cell) => inlineMarkdown(cell.trim())));
        const [head, , ...body] = rows;
        return `<div class="table-wrap"><table><thead><tr>${head.map((cell) => `<th>${cell}</th>`).join("")}</tr></thead><tbody>${body.map((row) => `<tr>${row.map((cell) => `<td>${cell}</td>`).join("")}</tr>`).join("")}</tbody></table></div>`;
      }
      return `<p>${inlineMarkdown(block).replaceAll("\n", "<br>")}</p>`;
    })
    .join("\n");
}

async function loadPosts() {
  const files = (await readdir(postsDir)).filter((file) => file.endsWith(".json")).sort();
  const posts = [];
  for (const file of files) {
    const post = JSON.parse(await readFile(path.join(postsDir, file), "utf8"));
    posts.push(post);
  }
  return posts.sort((a, b) => String(b.date).localeCompare(String(a.date)));
}

const head = (title, description, canonical) => `<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>${escapeHtml(title)}</title>
    <meta name="description" content="${escapeHtml(description)}">
    <meta name="robots" content="index, follow, max-image-preview:large">
    <meta property="og:title" content="${escapeHtml(title)}">
    <meta property="og:description" content="${escapeHtml(description)}">
    <meta property="og:image" content="${config.baseUrl}/assets/founder-workspace.png">
    <meta name="twitter:card" content="summary_large_image">
    <link rel="canonical" href="${canonical}">
    <link rel="stylesheet" href="${canonical.endsWith("/blog/") || canonical.includes("/blog/") ? "../" : ""}assets/styles.css">
  </head>`;

const header = (prefix = "") => `<header class="site-header compact">
      <a class="brand" href="${prefix || "./"}">${escapeHtml(config.siteName)}</a>
      <nav class="nav" aria-label="主导航">
        <a href="${prefix}#positioning">定位</a>
        <a href="${prefix}#traffic">流量</a>
        <a href="${prefix}#skills">Skill</a>
        <a href="${prefix}blog/">博客</a>
      </nav>
    </header>`;

function renderHome(posts) {
  const latest = posts.slice(0, 3).map((post) => `<article class="post-card">
            <a href="blog/${post.slug}.html">
              <span>${escapeHtml(post.category)}</span>
              <h3>${escapeHtml(post.title)}</h3>
              <p>${escapeHtml(post.description)}</p>
            </a>
          </article>`).join("\n");

  return `${head(`${config.siteName} | ${config.tagline}`, config.description, `${config.baseUrl}/`)}
  <body>
    <header class="site-header">
      <a class="brand" href="./" aria-label="返回首页">${escapeHtml(config.siteName)}</a>
      <nav class="nav" aria-label="主导航">
        <a href="#positioning">定位</a>
        <a href="#traffic">流量</a>
        <a href="#skills">Skill</a>
        <a href="blog/">博客</a>
      </nav>
    </header>
    <main>
      <section class="hero">
        <picture><img src="assets/founder-workspace.png" alt="个人创业者的工作台，包含数据面板、内容规划和产品样品" class="hero-image"></picture>
        <div class="hero-overlay"></div>
        <div class="hero-content">
          <p class="eyebrow">${escapeHtml(config.siteName)}</p>
          <h1>把创业案例炼成可执行 skill，再用自然流量持续获客。</h1>
          <p class="hero-copy">这个站点不是简历页，而是一个内容型获客资产：展示你的思考、服务能力、案例方法论和可购买的创业解决方案。</p>
          <div class="hero-actions">
            <a class="button primary" href="blog/">阅读增长内容</a>
            <a class="button secondary" href="#offer">查看服务设计</a>
          </div>
        </div>
      </section>
      <section id="positioning" class="section">
        <div class="section-kicker">Positioning</div>
        <h2>最容易拿到流量的角度</h2>
        <div class="grid three">
          <article class="card"><span class="tag">搜索意图</span><h3>从“想创业但不知道做什么”切入</h3><p>用户正在搜索创业项目、副业方向、细分人群痛点、低成本验证方法。内容要给场景、判断标准和第一步动作。</p></article>
          <article class="card"><span class="tag">高客单</span><h3>围绕有钱女性的服务需求</h3><p>高净值女性在健康、美学、家庭、资产、旅行和个人影响力上有强付费意愿，适合个人创业者做顾问型服务。</p></article>
          <article class="card"><span class="tag">信任</span><h3>用案例证明能力，而不是自夸</h3><p>每篇内容都输出框架、清单、模板和真实可执行步骤，让搜索引擎和读者都能判断你的专业度。</p></article>
        </div>
      </section>
      <section id="traffic" class="section muted">
        <div class="section-kicker">Traffic Manager View</div>
        <h2>平台的 SEO 内容架构</h2>
        <div class="traffic-map">
          <div><h3>核心关键词页</h3><p>个人创业、创业案例、低成本创业项目、个人品牌、SEO、创业 skill。</p></div>
          <div><h3>问题型长尾页</h3><p>“一个人创业怎么找客户”、“适合个人创业者的高客单服务”、“高消费女性有哪些痛点”。</p></div>
          <div><h3>案例型转化页</h3><p>把 Airbnb、Canva、Stripe、Glossier 等案例拆成个人能复制的动作。</p></div>
          <div><h3>服务型落地页</h3><p>创业方向诊断、SEO 内容地图、个人品牌博客搭建、细分客户痛点研究。</p></div>
        </div>
      </section>
      <section id="skills" class="section">
        <div class="section-kicker">Reusable Skills</div>
        <h2>展示博客里的核心创业 Skill</h2>
        <div class="skill-list">
          <article><strong>非规模化验证</strong><span>先手动服务 10 个真实客户，找到付费理由。</span></article>
          <article><strong>细分人群洞察</strong><span>围绕高价值人群做痛点、预算、触发场景和信任障碍拆解。</span></article>
          <article><strong>内容资产生产</strong><span>把每次研究沉淀为博客、清单、模板、案例和服务页。</span></article>
          <article><strong>高客单服务包装</strong><span>把模糊能力做成清晰交付：诊断、方案、陪跑、复盘。</span></article>
        </div>
      </section>
      <section id="offer" class="section split">
        <div><div class="section-kicker">Offer</div><h2>这个平台可以卖什么</h2><p>最适合的商业化路径是“免费内容获客 + 轻咨询转化 + 模板产品复购”。个人创业者不需要一开始做大平台，先做可验证的服务闭环。</p></div>
        <div class="offer-panel"><ul><li>创业方向诊断：499-1999 元</li><li>SEO 内容地图：1999-6999 元</li><li>高消费人群痛点研究：2999-9999 元</li><li>个人品牌博客搭建：3999-19999 元</li><li>创业 skill 陪跑：按月订阅</li></ul></div>
      </section>
      <section class="section">
        <div class="section-kicker">Latest</div>
        <h2>最新文章</h2>
        <div class="grid three">${latest}</div>
      </section>
    </main>
    <footer class="footer"><p>${escapeHtml(config.siteName)} - 个人创业展示博客平台</p><a href="rss.xml">RSS</a></footer>
    <script src="assets/main.js"></script>
  </body>
</html>`;
}

function renderBlogIndex(posts) {
  const items = posts.map((post) => `<article class="list-item">
          <a href="${post.slug}.html">
            <span>${escapeHtml(post.category)} · ${escapeHtml(post.date)}</span>
            <h2>${escapeHtml(post.title)}</h2>
            <p>${escapeHtml(post.description)}</p>
          </a>
        </article>`).join("\n");
  return `${head(`博客文章 | ${config.siteName}`, `${config.siteName} 的博客索引，覆盖个人创业、SEO、创业案例、细分人群痛点和可落地 skill。`, `${config.baseUrl}/blog/`)}
  <body>
    ${header("../")}
    <main class="page-shell">
      <section class="page-hero"><p class="eyebrow">Blog</p><h1>用内容证明创业能力</h1><p>每篇文章都服务一个明确搜索意图：帮读者判断机会、学习方法，并产生咨询或合作需求。</p></section>
      <section class="post-list">${items}</section>
    </main>
    <footer class="footer"><p>${escapeHtml(config.siteName)} - Blog</p><a href="../">首页</a></footer>
  </body>
</html>`;
}

function renderPost(post) {
  return `${head(`${post.title} | ${config.siteName}`, post.description, `${config.baseUrl}/blog/${post.slug}.html`)}
  <body>
    ${header("../")}
    <main class="article">
      <p class="eyebrow">${escapeHtml(post.category)} · ${escapeHtml(post.date)}</p>
      <h1>${escapeHtml(post.title)}</h1>
      <p class="lead">${escapeHtml(post.description)}</p>
      ${markdownToHtml(post.body)}
    </main>
    <footer class="footer"><a href="./">返回博客</a><a href="../">首页</a></footer>
  </body>
</html>`;
}

function renderSitemap(posts) {
  const urls = [`${config.baseUrl}/`, `${config.baseUrl}/blog/`, ...posts.map((post) => `${config.baseUrl}/blog/${post.slug}.html`)];
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map((url) => `  <url><loc>${url}</loc></url>`).join("\n")}\n</urlset>\n`;
}

function renderRss(posts) {
  return `<?xml version="1.0" encoding="UTF-8" ?>\n<rss version="2.0">\n  <channel>\n    <title>${escapeHtml(config.siteName)}</title>\n    <link>${config.baseUrl}/</link>\n    <description>${escapeHtml(config.description)}</description>\n    <language>zh-CN</language>\n${posts.map((post) => `    <item>\n      <title>${escapeHtml(post.title)}</title>\n      <link>${config.baseUrl}/blog/${post.slug}.html</link>\n      <description>${escapeHtml(post.description)}</description>\n    </item>`).join("\n")}\n  </channel>\n</rss>\n`;
}

const posts = await loadPosts();
if (!existsSync(blogDir)) await mkdir(blogDir, { recursive: true });
await writeFile(path.join(root, "index.html"), renderHome(posts));
await writeFile(path.join(blogDir, "index.html"), renderBlogIndex(posts));
for (const post of posts) {
  await writeFile(path.join(blogDir, `${post.slug}.html`), renderPost(post));
}
await writeFile(path.join(root, "sitemap.xml"), renderSitemap(posts));
await writeFile(path.join(root, "rss.xml"), renderRss(posts));
await writeFile(path.join(root, "robots.txt"), `User-agent: *\nAllow: /\n\nSitemap: ${config.baseUrl}/sitemap.xml\n`);
console.log(`Generated ${posts.length} posts for ${config.siteName}.`);

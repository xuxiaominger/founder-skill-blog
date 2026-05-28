# chuangye2026

一个面向个人创业者的静态展示博客平台，前台可部署到 GitHub Pages，后台在本机运行，用来新增、编辑、生成和发布博客。

## 本地预览前台

```bash
python3 -m http.server 4173
```

打开 `http://localhost:4173`。

## 打开内部后台

```bash
npm run admin
```

打开 `http://127.0.0.1:4326`。

默认后台密码是 `chuangye2026`。建议使用环境变量改成自己的密码：

```bash
ADMIN_PASSWORD="your-strong-password" npm run admin
```

后台能力：

- 新建文章
- 编辑标题、slug、分类、日期、SEO 描述和 Markdown 正文
- 自动生成静态 HTML、RSS、sitemap、robots.txt
- 一键提交并推送到 GitHub Pages

## 发布

```bash
npm run generate
git add .
git commit -m "Update content"
git push
```

或者在本地后台点击“发布到 GitHub”。

## 大陆访问说明

GitHub Pages 免费，但在中国大陆访问可能慢或不稳定。为了提升大陆访问可用性，本项目：

- 不依赖 Google Fonts、YouTube、Facebook、Twitter 等外部资源
- 所有图片、CSS、JS 都是本地静态资源
- 生成标准 HTML、RSS、sitemap，方便迁移到国内静态托管

更稳定的大陆访问方案是：购买并备案域名，然后部署到阿里云 OSS + CDN、腾讯云 COS + CDN、又拍云、七牛云等国内服务。

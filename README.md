# DORA 学习平台

欧盟《数字运营韧性法案》（DORA，条例 (EU) 2022/2554）中英对照学习网站。站点由纯静态文件构成，不需要构建步骤。界面风格参考 [MiCA 学习平台](https://mica-self.vercel.app/)。

- 仓库：<https://github.com/zlog-in/dora>
- 官方原文：[EUR-Lex · CELEX 32022R2554](https://eur-lex.europa.eu/legal-content/EN/TXT/HTML/?uri=CELEX:32022R2554)（OJ L 333, 27.12.2022, p. 1）

## 功能

- 全部 9 章、64 条、106 段序言，均为逐段中文翻译，每段都与《欧盟官方公报》英文原文一一对应
- 三种显示模式：中文 / 中英对照 / 英文原文。可在侧边栏设置全局模式，也可单独切换某一条；每段旁的 `EN` 按钮可单独显示该段原文
- 每条、每章、每段序言都有跳转到 EUR-Lex 对应位置的链接（`#art_N`、`#cpt_X`、`#rct_N`）
- 术语词典（第 3 条全部 65 项定义）、互动测验（26 题，每题注明出处条款）、全文搜索（同时检索中英文，可定位到段落）、收藏、深色模式

## 页面路由

网站使用 hash 路由，链接可以直接分享：

| 路由 | 内容 |
| --- | --- |
| `#/` | 首页 |
| `#/chapter/II` | 第二章（罗马数字 I–IX） |
| `#/article/28` | 第 28 条（自动展开并滚动到该条） |
| `#/article/28?b=25` | 第 28 条第 25 个段落（高亮显示） |
| `#/recitals`、`#/recitals/16` | 序言 / 序言第 16 段 |
| `#/glossary`、`#/quiz`、`#/quiz/IV`、`#/search?q=TLPT`、`#/bookmarks` | 术语词典 / 测验（可按章筛选）/ 搜索 / 收藏 |

显示模式、收藏和主题保存在浏览器 `localStorage` 中（键名为 `dora-mode`、`dora-bm`、`dora-theme`）。

## 本地运行

```bash
python3 -m http.server 8765
# 打开 http://127.0.0.1:8765/
```

## 部署到 Vercel

目录中已包含 `vercel.json` 和 `.vercelignore`。`.vercelignore` 会排除 `source/`、`translations/`、`tools/` 和本 README，只上传网站文件。

- **方式一（推荐）**：在 Vercel 控制台选择“Add New → Project”，导入 GitHub 仓库 `zlog-in/dora`。Framework 选 Other，无需构建命令。之后每次推送到 `main` 都会自动重新部署。
- **方式二**：使用命令行：
  ```bash
  npm i -g vercel
  vercel login
  vercel --prod
  ```

## 目录结构

| 路径 | 说明 |
| --- | --- |
| `index.html`, `assets/style.css`, `assets/app.js` | 网站页面、样式、前端逻辑 |
| `assets/data.js` | 由 `tools/build.py` 生成的中英数据，**请勿手工编辑** |
| `assets/quiz.js` | 测验题库（每题的 `ref` 字段为出处条款，`ch` 为章节） |
| `source/eurlex-32022R2554-en.html` | EUR-Lex 官方英文 HTML 原文 |
| `source/dora_en.json` | 解析后的英文结构化数据 |
| `translations/c*.txt` | 正文译文，格式：`@A<条号> <标题>`，然后每行 `<段落序号>\|<译文>` |
| `translations/r*.txt` | 序言译文，格式：`<序言号>.<段落序号>\|<译文>` |
| `tools/parse.py` | 解析原文，生成 `source/dora_en.json`（依赖 `pip install beautifulsoup4`） |
| `tools/build.py` | 合并原文与译文，生成 `assets/data.js` |

## 修改译文

1. 编辑 `translations/` 中对应的行。段落序号必须与英文原文的块一一对应。
2. 运行 `python3 tools/build.py`。缺少译文、条款缺失或序言数量不对时，脚本会报错退出。
3. 本地预览后提交 `translations/` 和 `assets/data.js`。

只有在原文 HTML 更新时，才需要重新运行 `python3 tools/parse.py`。

### 获取原文

直接用 curl 请求 EUR-Lex 会被反爬虫拦截（返回 HTTP 202，内容为空）。可改用 Wayback Machine 的原始存档：

```
https://web.archive.org/web/2024id_/https://eur-lex.europa.eu/legal-content/EN/TXT/HTML/?uri=CELEX:32022R2554
```

存档中的页面结构与 EUR-Lex 线上页面相同，所以生成的锚点链接在 EUR-Lex 上同样有效。

## 翻译体例与术语

结构：Article→条，paragraph→款，subparagraph→段（如 first subparagraph→第一段），point→项（定义及引用其他法律时用“点”）。列表编号 (a)、(i)、— 等沿用原文，不翻译。

| English | 中文 |
| --- | --- |
| financial entity | 金融实体 |
| ICT third-party service provider | ICT第三方服务提供商 |
| critical ICT third-party service provider | 关键ICT第三方服务提供商 |
| digital operational resilience | 数字运营韧性 |
| major ICT-related incident | 重大ICT相关事件 |
| significant cyber threat | 显著网络威胁（有意与“重大”区分） |
| critical or important function | 关键或重要职能 |
| management body | 管理机构 |
| competent authority | 主管当局 |
| ESAs (EBA / ESMA / EIOPA) | 欧洲监管机构 |
| Lead Overseer / Oversight Forum / JON | 牵头监督机构 / 监督论坛 / 联合监督网络 |
| threat-led penetration testing (TLPT) | 威胁导向渗透测试 |
| regulatory / implementing technical standards | 监管技术标准 / 实施技术标准 |
| register of information | 信息登记册 |
| exit strategy | 退出策略 |
| periodic penalty payment | 定期罚款 |
| microenterprise | 微型企业 |

章节简介、首页“什么是DORA”和关键日期为本站导读，不属于法规原文。

## 声明

中文为非官方学习译文，未经法律专业人士审校，只有 EUR-Lex 上公布的官方语言文本具有法律效力。

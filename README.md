# DORA 学习平台

欧盟《数字运营韧性法案》（DORA，条例 (EU) 2022/2554）中英对照学习网站。站点由纯静态文件构成，不需要构建步骤。

## 功能

- 全部 9 章、64 条、106 段序言，均为逐段中文翻译，每段都与《欧盟官方公报》英文原文一一对应
- 三种显示模式：中文 / 中英对照 / 英文原文。可在侧边栏设置全局模式，也可单独切换某一条；每段旁的 `EN` 按钮可单独显示该段原文
- 每条、每章、每段序言都有跳转到 EUR-Lex 对应位置的链接（`#art_N`、`#cpt_X`、`#rct_N`）
- 术语词典（第 3 条全部 65 项定义）、互动测验（每题注明出处条款）、全文搜索（同时检索中英文）、收藏、深色模式

## 本地运行

```bash
python3 -m http.server 8765
# 打开 http://127.0.0.1:8765/
```

部署：将本目录作为静态站点部署即可（Vercel、Netlify、GitHub Pages 均可）。

## 目录结构

| 路径 | 说明 |
| --- | --- |
| `index.html`, `assets/` | 网站文件（`assets/data.js` 由脚本生成） |
| `source/eurlex-32022R2554-en.html` | EUR-Lex 官方英文 HTML 原文 |
| `translations/c*.txt` | 正文译文，格式：`@A<条号> <标题>`，然后每行 `<段落序号>\|<译文>` |
| `translations/r*.txt` | 序言译文，格式：`<序言号>.<段落序号>\|<译文>` |
| `tools/parse.py` | 解析原文，生成 `source/dora_en.json`（依赖 `pip install beautifulsoup4`） |
| `tools/build.py` | 合并原文与译文，生成 `assets/data.js`（缺少译文时会报错） |
| `assets/quiz.js` | 测验题库 |

修改译文后，运行 `python3 tools/build.py` 重新生成数据。

## 声明

中文为非官方学习译文，只有 EUR-Lex 上公布的官方语言文本具有法律效力。体例：Article→条，paragraph→款，subparagraph→段，point→项/点。

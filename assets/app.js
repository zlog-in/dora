(function () {
  'use strict';

  var D = window.DORA, QUIZ = window.DORA_QUIZ || [];
  var EURLEX = 'https://eur-lex.europa.eu/legal-content/EN/TXT/HTML/?uri=CELEX:32022R2554';
  var ELI = 'https://eur-lex.europa.eu/eli/reg/2022/2554/oj';
  var app = document.getElementById('app');
  var sidebar = document.getElementById('sidebar');

  // ---------- storage (best effort) ----------
  function load(k, def) { try { var v = localStorage.getItem(k); return v == null ? def : JSON.parse(v); } catch (e) { return def; } }
  function save(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }

  var state = {
    mode: load('dora-mode', 'zh'),          // zh | both | en
    bm: load('dora-bm', []),                 // bookmarked article numbers
    quiz: null
  };

  // ---------- helpers ----------
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function chap(num) { for (var i = 0; i < D.chapters.length; i++) if (D.chapters[i].num === num) return D.chapters[i]; }
  function chArticles(c) { var r = []; c.sections.forEach(function (s) { r = r.concat(s.articles); }); return r; }
  function toast(msg) {
    var t = document.getElementById('toast'); t.textContent = msg; t.classList.add('show');
    clearTimeout(toast._t); toast._t = setTimeout(function () { t.classList.remove('show'); }, 1600);
  }
  function zhLabel(l) { return l.replace(/‘/g, '“'); }
  function artLabelZh(n) { return '第' + n + '条'; }

  // ---------- sidebar ----------
  function renderSidebar(route) {
    var nav = [
      ['#/', '🏠', '首页'], ['#/recitals', '📖', '序言（鉴于条款）'], ['#/bookmarks', '⭐', '收藏'],
      ['#/glossary', '📚', '术语词典'], ['#/quiz', '🎮', '互动测验'], ['#/search', '🔍', '搜索']
    ];
    var cur = '#/' + (route.name === 'home' ? '' : route.name);
    var h = '<div class="side-head"><h1><a href="#/">🛡️ DORA 学习平台</a></h1><p>欧盟数字运营韧性法案 · 中英对照</p>' +
      '<div class="mode-row"><div class="seg" role="group" aria-label="显示模式">' +
      modeBtn('zh', '中文') + modeBtn('both', '对照') + modeBtn('en', 'EN') + '</div>' +
      '<button class="theme" id="themeBtn" title="切换主题">' + (isDark() ? '☀️' : '🌙') + '</button></div>' +
      '<div class="mode-hint">默认显示模式 · 每条均可单独切换</div></div>';
    h += '<nav class="nav"><ul>';
    nav.forEach(function (n) {
      var on = (n[0] === cur) || (route.name === 'recital' && n[0] === '#/recitals');
      h += '<li><a href="' + n[0] + '"' + (on ? ' class="on"' : '') + '><span>' + n[1] + '</span><span>' + n[2] + '</span></a></li>';
    });
    h += '</ul><h2>章节 CHAPTERS</h2><ul>';
    var activeCh = route.name === 'chapter' ? route.arg : (route.name === 'article' && D.articles[route.arg] ? D.articles[route.arg].ch : null);
    D.chapters.forEach(function (c) {
      h += '<li class="ch-item"><a href="#/chapter/' + c.num + '"' + (activeCh === c.num ? ' class="on"' : '') + ' title="' + esc(c.zh) + '">' +
        '<span>' + c.icon + '</span><span class="num">' + c.num + '.</span><span class="t">' + esc(c.zh) + '</span></a></li>';
    });
    h += '</ul></nav><div class="side-foot">基于欧盟条例 (EU) 2022/2554<br>中文为非官方学习译文</div>';
    sidebar.innerHTML = h;
  }
  function modeBtn(m, t) { return '<button data-mode-set="' + m + '"' + (state.mode === m ? ' class="on"' : '') + '>' + t + '</button>'; }
  function isDark() {
    var t = document.documentElement.getAttribute('data-theme');
    if (t) return t === 'dark';
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  }

  // ---------- text blocks ----------
  function blocksHTML(blocks, idPrefix) {
    return blocks.map(function (b, i) {
      return '<div class="blk d' + Math.min(b.d, 4) + '" id="' + idPrefix + '-b' + i + '">' +
        (b.l ? '<span class="lab">' + esc(b.l) + '</span>' : '') +
        '<div class="body">' +
        '<div class="zh-col"><p class="zh">' + esc(b.zh) + '<button class="ref-btn" data-act="peek" title="查看此段英文原文">EN</button></p>' +
        '<div class="peek hidden"><p class="en">' + esc(b.en) + '</p></div></div>' +
        '<div class="en-col"><p class="en">' + esc(b.en) + '<button class="ref-btn" data-act="peek" title="查看此段中文译文">中</button></p>' +
        '<div class="peek hidden"><p class="zh">' + esc(b.zh) + '</p></div></div>' +
        '</div></div>';
    }).join('');
  }
  function segHTML(mode) {
    return '<span class="seg" role="group" aria-label="本条显示模式">' +
      ['zh', 'both', 'en'].map(function (m) {
        return '<button data-art-mode="' + m + '"' + (mode === m ? ' class="on"' : '') + '>' + { zh: '中文', both: '中英对照', en: '英文原文' }[m] + '</button>';
      }).join('') + '</span>';
  }

  function articleHTML(n, open) {
    var a = D.articles[n], bm = state.bm.indexOf(n) >= 0;
    return '<div class="art card' + (open ? ' open' : '') + '" id="art-' + n + '" data-n="' + n + '">' +
      '<button class="art-h" data-act="toggle"><span class="no">' + n + '</span><span class="tt"><b>' + artLabelZh(n) + '　' + esc(a.zh) + '</b>' +
      '<span class="en-sub">Article ' + n + ' · ' + esc(a.en) + '</span></span><span class="chev">▼</span></button>' +
      '<div class="art-b">' +
      '<div class="toolbar">' + segHTML(state.mode) + '<span class="sp"></span>' +
      '<button class="tb' + (bm ? ' on' : '') + '" data-act="bm">' + (bm ? '★ 已收藏' : '☆ 收藏') + '</button>' +
      '<button class="tb" data-act="copy">🔗 复制链接</button>' +
      '<a class="tb" href="' + EURLEX + '#art_' + n + '" target="_blank" rel="noopener">📄 EUR-Lex原文 ↗</a></div>' +
      '<div class="text" data-mode="' + state.mode + '"><div class="both-head"><span>中文译文</span><span>English (Official Journal)</span></div>' +
      blocksHTML(a.b, 'a' + n) + '</div></div></div>';
  }

  // ---------- pages ----------
  var DATES = [
    ['2022-12-14', '🖊️', '欧洲议会和理事会在斯特拉斯堡签署通过条例(EU) 2022/2554'],
    ['2022-12-27', '📰', '在《欧盟官方公报》OJ L 333 上公布'],
    ['2023-01-16', '✅', '生效（公布之日后第二十日，第64条）'],
    ['2024-01-17', '📐', '第一批监管/实施技术标准草案提交截止（第15、16、18、28条）'],
    ['2024-07-17', '📐', '第二批技术标准草案、指南及授权法案截止（第11、20、26、30、31、32、41、43条）'],
    ['2025-01-17', '🚀', 'DORA全面适用；成员国通知实施规则（第53条）；单一欧盟中心可行性报告（第21条）'],
    ['2026-01-17', '🔍', '委员会就法定审计师和审计事务所的韧性要求进行审查（第58条第3款）'],
    ['2028-01-17', '🔍', '委员会提交全面审查报告（第58条第1款）']
  ];
  var PILLARS = [
    ['II', '🛡️', 'ICT风险管理', '第5–16条'], ['III', '🚨', '事件管理与报告', '第17–23条'],
    ['IV', '🧪', '数字运营韧性测试', '第24–27条'], ['V', '🔗', 'ICT第三方风险', '第28–44条'], ['VI', '🤝', '信息共享', '第45条']
  ];

  function pageHome() {
    var today = new Date().toISOString().slice(0, 10);
    var h = '<section class="hero"><h1>DORA 学习平台 🛡️</h1>' +
      '<p>欧盟《数字运营韧性法案》（条例 (EU) 2022/2554）中英对照学习指南。逐段忠于原文的中文翻译，每一条款、每一段落都可一键对照《欧盟官方公报》英文原文。</p>' +
      '<div class="actions"><a class="btn white" href="' + EURLEX + '" target="_blank" rel="noopener">📄 查看EUR-Lex官方原文 ↗</a>' +
      '<a class="btn white" href="#/chapter/I">📚 从第一章开始</a></div></section>';
    h += '<div class="stats">' +
      stat('📚', D.chapters.length, '章节') + stat('📜', Object.keys(D.articles).length, '条款') +
      stat('📖', D.recitals.length, '序言段落') + stat('📅', '2025', '适用年份') + '</div>';
    h += '<div class="quick">' +
      quick('#/glossary', '📚', '术语词典', '第3条全部' + D.glossary.length + '项定义中英对照') +
      quick('#/quiz', '🎮', '互动测验', QUIZ.length + '道题检验你的DORA知识') +
      quick('#/search', '🔍', '全文搜索', '同时检索中文译文与英文原文') + '</div>';
    h += '<h2 class="sec-title">🏗️ 五大支柱</h2><div class="pillars">' + PILLARS.map(function (p) {
      return '<a class="pillar card" href="#/chapter/' + p[0] + '"><div class="ic">' + p[1] + '</div><b>' + p[2] + '</b><span>第 ' + p[0] + ' 章 · ' + p[3] + '</span></a>';
    }).join('') + '</div>';
    h += '<h2 class="sec-title">📚 按章节浏览</h2><div class="ch-grid">' + D.chapters.map(function (c) {
      return '<a class="ch-card card" href="#/chapter/' + c.num + '"><div class="ic">' + c.icon + '</div><div>' +
        '<div class="lbl">第 ' + c.num + ' 章 · CHAPTER ' + c.num + '</div><h3>' + esc(c.zh) + '</h3><div class="en-sub">' + esc(c.en) + '</div>' +
        '<p>' + esc(c.descZh) + '</p><span class="go">' + chArticles(c).length + ' 条款 →</span></div></a>';
    }).join('') + '</div>';
    h += '<h2 class="sec-title">📅 关键实施日期</h2><div class="card timeline">' + DATES.map(function (d) {
      var p = d[0].split('-');
      return '<div class="tl' + (d[0] < today ? ' past' : '') + '"><div class="ic">' + d[1] + '</div><div><b>' + p[0] + '年' + (+p[1]) + '月' + (+p[2]) + '日</b><span>' + d[2] + '</span></div></div>';
    }).join('') + '</div>';
    h += '<h2 class="sec-title">💡 什么是DORA？</h2><div class="card about">' +
      '<p>《数字运营韧性法案》（Digital Operational Resilience Act，DORA）即欧盟条例 (EU) 2022/2554，为欧盟金融业就支持业务流程的网络和信息系统安全制定统一要求（第1条）。它适用于信贷机构、支付机构、投资公司、保险和再保险企业、加密资产服务提供商等20类金融实体，以及为其提供服务的ICT第三方服务提供商（第2条）。</p>' +
      '<p>DORA围绕ICT风险管理、ICT相关事件报告、数字运营韧性测试、ICT第三方风险管理和信息共享展开，并首次在欧盟层面建立了对关键ICT第三方服务提供商的直接监督框架（第五章第二节）。相对于NIS2指令(EU) 2022/2555，DORA构成特定行业的欧盟法律文件（第1条第2款，序言第16段）。</p>' +
      '<div class="note">📝 翻译说明：本站中文为依据《欧盟官方公报》英文文本逐段翻译的<b>非官方译文</b>，仅供学习参考；具有法律效力的是EUR-Lex上公布的官方语言文本。体例：Article→条，paragraph→款，subparagraph→段，point→项/点。章节简介为本站导读，并非法规原文。</div></div>';
    h += '<div class="src-foot">🇪🇺 Regulation (EU) 2022/2554 · OJ L 333, 27.12.2022, p. 1 · 📜 <a href="' + ELI + '" target="_blank" rel="noopener">官方来源：EUR-Lex</a></div>';
    app.innerHTML = h;
  }
  function stat(ic, n, t) { return '<div class="stat card"><div class="ic">' + ic + '</div><b>' + n + '</b><span>' + t + '</span></div>'; }
  function quick(href, ic, t, s) { return '<a class="card" href="' + href + '"><div>' + ic + '</div><b>' + t + '</b><span>' + s + '</span></a>'; }

  function pageChapter(num, openArt, block) {
    var c = chap(num);
    if (!c) return pageNotFound();
    var arts = chArticles(c);
    var idx = D.chapters.indexOf(c), prev = D.chapters[idx - 1], next = D.chapters[idx + 1];
    var h = '<div class="crumb"><a href="#/">首页</a> / 第 ' + c.num + ' 章' + (openArt ? ' / ' + artLabelZh(openArt) : '') + '</div>';
    h += '<section class="card ch-head"><div class="top"><div class="ic">' + c.icon + '</div><div>' +
      '<span class="pill">第 ' + c.num + ' 章 · CHAPTER ' + c.num + '</span><h1>' + esc(c.zh) + '</h1><div class="en-sub">' + esc(c.en) + '</div></div></div>' +
      '<p class="desc">' + esc(c.descZh) + '</p><div class="actions"><span class="pill">' + arts.length + ' 条款 · 第' + arts[0] + (arts.length > 1 ? '–' + arts[arts.length - 1] : '') + '条</span>' +
      '<a class="btn sm" href="#/quiz/' + c.num + '">🎮 参加测验</a>' +
      '<a class="btn sm" href="' + EURLEX + '#' + c.id + '" target="_blank" rel="noopener">📄 EUR-Lex本章原文 ↗</a>' +
      '<button class="btn sm" data-act="expand-all">↕ 全部展开/收起</button></div></section>';
    c.sections.forEach(function (s) {
      if (s.labelEn) {
        h += '<div class="sec-head"><b>' + esc(s.labelZh) + (s.titleZh ? '　' + esc(s.titleZh) : '') + '</b><span class="en-sub">' +
          esc(s.labelEn) + (s.titleEn ? ' · ' + esc(s.titleEn) : '') + '</span></div>';
      }
      h += '<div class="art-list">' + s.articles.map(function (n) { return articleHTML(n, n === openArt); }).join('') + '</div>';
    });
    h += '<div class="pager">' +
      (prev ? '<a class="card" href="#/chapter/' + prev.num + '"><small>← 上一章</small>' + prev.icon + ' 第 ' + prev.num + ' 章 ' + esc(prev.zh) + '</a>' : '<span></span>') +
      (next ? '<a class="card next" href="#/chapter/' + next.num + '"><small>下一章 →</small>' + next.icon + ' 第 ' + next.num + ' 章 ' + esc(next.zh) + '</a>' : '<span></span>') + '</div>';
    app.innerHTML = h;
    if (openArt) {
      var target = (block != null && document.getElementById('a' + openArt + '-b' + block)) || document.getElementById('art-' + openArt);
      requestAnimationFrame(function () {
        target.scrollIntoView({ block: block != null ? 'center' : 'start' });
        if (block != null) flash(target);
      });
    }
  }
  function flash(el) {
    el.style.transition = 'background .6s'; el.style.background = 'var(--accent-bg)'; el.style.borderRadius = '8px';
    setTimeout(function () { el.style.background = ''; }, 1800);
  }

  function pageRecitals(focus) {
    var h = '<div class="crumb"><a href="#/">首页</a> / 序言</div>' +
      '<section class="card ch-head"><div class="top"><div class="ic">📖</div><div><span class="pill">PREAMBLE · RECITALS</span><h1>序言（鉴于条款）</h1>' +
      '<div class="en-sub">Whereas: (1) – (106)</div></div></div><p class="desc">序言阐明立法背景和各条款的立法意图，是理解正文的重要依据。共106段。</p>' +
      '<div class="actions">' + segHTML(state.mode).replace(/data-art-mode/g, 'data-rec-mode') +
      '<a class="btn sm" href="' + EURLEX + '#rct_1" target="_blank" rel="noopener">📄 EUR-Lex序言原文 ↗</a></div></section>' +
      '<div class="card filter"><span>🔎</span><input id="recFilter" placeholder="输入序言编号（如 16）或关键词筛选…" autocomplete="off"></div><div id="recList" data-mode="' + state.mode + '">';
    D.recitals.forEach(function (r) {
      h += '<div class="card rec" id="rec-' + r.n + '" data-n="' + r.n + '"><div class="rec-h"><b>(' + r.n + ')</b><span class="en-sub">Recital ' + r.n + '</span><span class="sp"></span>' +
        '<a href="' + EURLEX + '#rct_' + r.n + '" target="_blank" rel="noopener">EUR-Lex ↗</a></div><div class="text" style="padding:0">' +
        blocksHTML(r.b, 'r' + r.n) + '</div></div>';
    });
    app.innerHTML = h + '</div>';
    var list = document.getElementById('recList');
    document.getElementById('recFilter').addEventListener('input', function (e) {
      var q = e.target.value.trim().toLowerCase();
      list.querySelectorAll('.rec').forEach(function (el) {
        var r = D.recitals[+el.dataset.n - 1];
        var hit = !q || String(r.n) === q || r.b.some(function (b) { return b.zh.toLowerCase().indexOf(q) >= 0 || b.en.toLowerCase().indexOf(q) >= 0; });
        el.classList.toggle('hidden', !hit);
      });
    });
    if (focus) {
      var el = document.getElementById('rec-' + focus);
      if (el) requestAnimationFrame(function () { el.scrollIntoView({ block: 'center' }); flash(el); });
    }
  }

  function pageGlossary() {
    var h = '<div class="crumb"><a href="#/">首页</a> / 术语词典</div>' +
      '<section class="card ch-head"><div class="top"><div class="ic">📚</div><div><span class="pill">ARTICLE 3 · DEFINITIONS</span><h1>术语词典</h1>' +
      '<div class="en-sub">第3条定义全部' + D.glossary.length + '项，中英对照</div></div></div>' +
      '<div class="actions" style="margin-top:12px">' + segHTML(state.mode).replace(/data-art-mode/g, 'data-rec-mode') +
      '<a class="btn sm" href="#/article/3">📜 查看第3条全文</a><a class="btn sm" href="' + EURLEX + '#art_3" target="_blank" rel="noopener">📄 EUR-Lex原文 ↗</a></div></section>' +
      '<div class="card filter"><span>🔎</span><input id="glFilter" placeholder="搜索术语（中文或英文），如 TLPT、关键或重要职能…" autocomplete="off"></div>' +
      '<div class="gl-grid" id="glList" data-mode="' + state.mode + '">';
    D.glossary.forEach(function (g, i) {
      h += '<div class="card gl" data-i="' + i + '"><div class="t"><b>' + esc(g.termZh) + '</b><span class="en-sub">' + esc(g.termEn) + '</span>' +
        '<a class="no" href="#/article/3?b=' + (i + 1) + '">第3条第(' + g.no + ')点 →</a></div><div class="def">' +
        blocksHTML([{ d: 0, l: '', zh: g.zh, en: g.en }], 'g' + i) + '</div></div>';
    });
    app.innerHTML = h + '</div>';
    var list = document.getElementById('glList');
    document.getElementById('glFilter').addEventListener('input', function (e) {
      var q = e.target.value.trim().toLowerCase();
      list.querySelectorAll('.gl').forEach(function (el) {
        var g = D.glossary[+el.dataset.i];
        var hit = !q || (g.termZh + g.termEn + g.zh + g.en).toLowerCase().indexOf(q) >= 0;
        el.classList.toggle('hidden', !hit);
      });
    });
  }

  // ---------- quiz ----------
  function startQuiz(filter) {
    var qs = QUIZ.filter(function (q) { return !filter || q.ch === filter; });
    state.quiz = { filter: filter || '', qs: qs, i: 0, score: 0, picked: null };
  }
  function pageQuiz(filter) {
    if (!state.quiz || state.quiz.filter !== (filter || '')) startQuiz(filter);
    var Q = state.quiz;
    var chs = [];
    QUIZ.forEach(function (q) { if (chs.indexOf(q.ch) < 0) chs.push(q.ch); });
    chs.sort(function (a, b) { return D.chapters.indexOf(chap(a)) - D.chapters.indexOf(chap(b)); });
    var h = '<div class="crumb"><a href="#/">首页</a> / 互动测验</div><h1 style="margin:0">🎮 互动测验</h1>' +
      '<p class="muted" style="margin:4px 0 0">每题解析均注明出处条款，可直接跳转原文核对。</p><div class="chips">' +
      '<a class="chip' + (!Q.filter ? ' on' : '') + '" href="#/quiz">全部（' + QUIZ.length + '）</a>' +
      chs.map(function (c) {
        var n = QUIZ.filter(function (q) { return q.ch === c; }).length;
        return '<a class="chip' + (Q.filter === c ? ' on' : '') + '" href="#/quiz/' + c + '">第 ' + c + ' 章（' + n + '）</a>';
      }).join('') + '</div>';
    if (!Q.qs.length) {
      h += '<div class="card empty">本章暂无测验题目，<a href="#/quiz">试试全部题目</a>。</div>';
    } else if (Q.i >= Q.qs.length) {
      var pct = Math.round(Q.score / Q.qs.length * 100);
      h += '<div class="card quiz score"><div>测验完成</div><b>' + Q.score + ' / ' + Q.qs.length + '</b><p>' +
        (pct >= 80 ? '🏆 优秀！你对DORA已有扎实的掌握。' : pct >= 50 ? '👍 不错！回顾答错题目的出处条款会更扎实。' : '📚 建议先通读相关章节再来挑战。') +
        '</p><button class="btn solid" data-act="quiz-restart">🔄 再来一次</button></div>';
    } else {
      var q = Q.qs[Q.i], done = Q.picked != null;
      h += '<div class="card quiz"><div class="prog"><i style="width:' + (Q.i / Q.qs.length * 100) + '%"></i></div>' +
        '<div class="muted" style="font-size:13px">第 ' + (Q.i + 1) + ' / ' + Q.qs.length + ' 题 · 第 ' + q.ch + ' 章 · 得分 ' + Q.score + '</div>' +
        '<div class="q">' + esc(q.q) + '</div>' +
        q.o.map(function (o, i) {
          var cls = done ? (i === q.a ? ' right' : (i === Q.picked ? ' wrong' : '')) : '';
          return '<button class="opt' + cls + '" data-act="quiz-pick" data-i="' + i + '"' + (done ? ' disabled' : '') + '>' + 'ABCD'[i] + '. ' + esc(o) + '</button>';
        }).join('');
      if (done) {
        h += '<div class="explain">' + (Q.picked === q.a ? '✅ 回答正确！' : '❌ 正确答案是 ' + 'ABCD'[q.a] + '。') + ' ' + esc(q.e) +
          ' <a href="#/article/' + q.ref + '">→ 查看' + artLabelZh(q.ref) + '原文</a></div>' +
          '<div class="row"><span></span><button class="btn solid" data-act="quiz-next">' + (Q.i + 1 < Q.qs.length ? '下一题 →' : '查看成绩') + '</button></div>';
      }
      h += '</div>';
    }
    app.innerHTML = h;
  }

  // ---------- search ----------
  var INDEX = null;
  function buildIndex() {
    INDEX = [];
    Object.keys(D.articles).forEach(function (k) {
      var a = D.articles[k];
      INDEX.push({ href: '#/article/' + a.n, key: artLabelZh(a.n) + ' ' + a.zh + ' · Article ' + a.n, zh: a.zh, en: a.en, kind: 'title' });
      a.b.forEach(function (b, i) {
        INDEX.push({ href: '#/article/' + a.n + '?b=' + i, key: artLabelZh(a.n) + ' ' + a.zh + (b.l ? ' ' + zhLabel(b.l) : ''), zh: b.zh, en: b.en, kind: 'art' });
      });
    });
    D.recitals.forEach(function (r) {
      r.b.forEach(function (b) { INDEX.push({ href: '#/recitals/' + r.n, key: '序言第(' + r.n + ')段', zh: b.zh, en: b.en, kind: 'rec' }); });
    });
  }
  function snippet(text, q) {
    var low = text.toLowerCase(), p = low.indexOf(q);
    if (p < 0) return esc(text.slice(0, 120)) + (text.length > 120 ? '…' : '');
    var s = Math.max(0, p - 50), e = Math.min(text.length, p + q.length + 80);
    return (s > 0 ? '…' : '') + esc(text.slice(s, p)) + '<mark>' + esc(text.slice(p, p + q.length)) + '</mark>' + esc(text.slice(p + q.length, e)) + (e < text.length ? '…' : '');
  }
  function pageSearch(q) {
    var h = '<div class="crumb"><a href="#/">首页</a> / 搜索</div><h1 style="margin:0">🔍 全文搜索</h1>' +
      '<p class="muted" style="margin:4px 0 0">同时检索中文译文、英文原文与序言。</p>' +
      '<div class="card filter"><span>🔎</span><input id="sq" placeholder="例如：TLPT、退出策略、register of information、第28条…" value="' + esc(q || '') + '" autocomplete="off"></div><div id="sr"></div>';
    app.innerHTML = h;
    var input = document.getElementById('sq');
    input.focus();
    input.setSelectionRange(input.value.length, input.value.length);
    var run = function () {
      var raw = input.value.trim(), ql = raw.toLowerCase(), out = document.getElementById('sr');
      history.replaceState(null, '', '#/search' + (raw ? '?q=' + encodeURIComponent(raw) : ''));
      if (!raw) { out.innerHTML = '<div class="empty">输入关键词开始搜索</div>'; return; }
      var m = raw.match(/^第?\s*(\d{1,2})\s*条$|^art(?:icle)?\.?\s*(\d{1,2})$/i);
      var hits = [];
      if (m) {
        var n = +(m[1] || m[2]);
        if (D.articles[n]) hits.push({ href: '#/article/' + n, key: artLabelZh(n) + ' ' + D.articles[n].zh, zh: D.articles[n].b[0].zh, en: D.articles[n].en });
      }
      if (!INDEX) buildIndex();
      for (var i = 0; i < INDEX.length && hits.length < 120; i++) {
        var e = INDEX[i];
        var inZh = e.zh.toLowerCase().indexOf(ql) >= 0, inEn = e.en.toLowerCase().indexOf(ql) >= 0;
        if (inZh || inEn) hits.push({ href: e.href, key: e.key, zh: e.zh, en: e.en, inZh: inZh, inEn: inEn, ql: ql });
      }
      if (!hits.length) { out.innerHTML = '<div class="empty">没有找到与“' + esc(raw) + '”相关的内容</div>'; return; }
      out.innerHTML = '<p class="muted" style="font-size:13px">共 ' + hits.length + (hits.length >= 120 ? '+' : '') + ' 条结果</p>' + hits.map(function (r) {
        var ql2 = r.ql || '';
        var zh = r.inZh ? snippet(r.zh, ql2) : esc(r.zh.slice(0, 90)) + (r.zh.length > 90 ? '…' : '');
        var en = r.inEn ? '<div class="s en" style="font-family:Georgia,serif">' + snippet(r.en, ql2) + '</div>' : '';
        return '<a class="card res" href="' + r.href + '"><div class="k">' + esc(r.key) + '</div><div class="s">' + zh + '</div>' + en + '</a>';
      }).join('');
    };
    var t;
    input.addEventListener('input', function () { clearTimeout(t); t = setTimeout(run, 150); });
    run();
  }

  function pageBookmarks() {
    var h = '<div class="crumb"><a href="#/">首页</a> / 收藏</div><h1 style="margin:0">⭐ 我的收藏</h1>' +
      '<p class="muted" style="margin:4px 0 16px">收藏保存在当前浏览器中。展开任一条款后点击“☆ 收藏”即可加入。</p>';
    var list = state.bm.filter(function (n) { return D.articles[n]; }).sort(function (a, b) { return a - b; });
    if (!list.length) h += '<div class="card empty">还没有收藏任何条款。<br><br><a class="btn" href="#/chapter/I">去浏览章节 →</a></div>';
    else h += '<div class="art-list">' + list.map(function (n) { return articleHTML(n, false); }).join('') + '</div>';
    app.innerHTML = h;
  }
  function pageNotFound() { app.innerHTML = '<div class="card empty">页面不存在。<br><br><a class="btn" href="#/">返回首页</a></div>'; }

  // ---------- router ----------
  function parse() {
    var h = location.hash.replace(/^#\/?/, ''), qi = h.indexOf('?'), query = {};
    if (qi >= 0) {
      h.slice(qi + 1).split('&').forEach(function (kv) { var p = kv.split('='); query[p[0]] = decodeURIComponent((p[1] || '').replace(/\+/g, ' ')); });
      h = h.slice(0, qi);
    }
    var parts = h.split('/').filter(Boolean);
    return { name: parts[0] || 'home', arg: parts[1], query: query };
  }
  function route() {
    var r = parse();
    if (r.name === 'article') r.arg = +r.arg;
    if (r.name === 'recitals' && r.arg) r = { name: 'recital', arg: +r.arg, query: r.query };
    renderSidebar(r);
    document.body.classList.remove('nav-open');
    var keepScroll = false;
    switch (r.name) {
      case 'home': pageHome(); break;
      case 'chapter': pageChapter(r.arg); break;
      case 'article':
        if (!D.articles[r.arg]) { pageNotFound(); break; }
        pageChapter(D.articles[r.arg].ch, r.arg, r.query.b != null ? +r.query.b : null); keepScroll = true; break;
      case 'recitals': pageRecitals(); break;
      case 'recital': pageRecitals(r.arg); keepScroll = true; break;
      case 'glossary': pageGlossary(); break;
      case 'quiz': pageQuiz(r.arg); break;
      case 'search': pageSearch(r.query.q); break;
      case 'bookmarks': pageBookmarks(); break;
      default: pageNotFound();
    }
    if (!keepScroll) window.scrollTo(0, 0);
    var t = { home: '', chapter: r.arg && chap(r.arg) ? '第' + r.arg + '章 ' + chap(r.arg).zh : '', article: D.articles[r.arg] ? artLabelZh(r.arg) + ' ' + D.articles[r.arg].zh : '',
      recitals: '序言', recital: '序言', glossary: '术语词典', quiz: '互动测验', search: '搜索', bookmarks: '收藏' }[r.name];
    document.title = (t ? t + ' | ' : '') + 'DORA 学习平台';
  }

  // ---------- events ----------
  function setMode(m) {
    state.mode = m; save('dora-mode', m);
    document.querySelectorAll('[data-mode]').forEach(function (el) { if (el.classList.contains('text') || el.id === 'recList' || el.id === 'glList') el.setAttribute('data-mode', m); });
    document.querySelectorAll('[data-mode-set],[data-art-mode],[data-rec-mode]').forEach(function (b) {
      b.classList.toggle('on', (b.dataset.modeSet || b.dataset.artMode || b.dataset.recMode) === m);
    });
  }

  document.addEventListener('click', function (e) {
    var el = e.target.closest('button, a');
    if (!el) return;
    if (el.dataset.modeSet) { setMode(el.dataset.modeSet); toast({ zh: '默认显示：中文译文', both: '默认显示：中英对照', en: '默认显示：英文原文' }[el.dataset.modeSet]); return; }
    if (el.dataset.recMode) { setMode(el.dataset.recMode); return; }
    if (el.id === 'themeBtn') {
      var dark = !isDark(); document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
      try { localStorage.setItem('dora-theme', dark ? 'dark' : 'light'); } catch (err) {}
      el.textContent = dark ? '☀️' : '🌙'; return;
    }
    var art = el.closest('.art');
    if (el.dataset.artMode && art) {
      art.querySelector('.text').setAttribute('data-mode', el.dataset.artMode);
      art.querySelectorAll('[data-art-mode]').forEach(function (b) { b.classList.toggle('on', b === el); });
      return;
    }
    var act = el.dataset.act;
    if (!act) return;
    if (act === 'toggle') { art.classList.toggle('open'); return; }
    if (act === 'peek') {
      var col = el.closest('.zh-col, .en-col'), pk = col.querySelector('.peek');
      pk.classList.toggle('hidden'); el.classList.toggle('on', !pk.classList.contains('hidden')); return;
    }
    if (act === 'bm') {
      var n = +art.dataset.n, i = state.bm.indexOf(n);
      if (i >= 0) state.bm.splice(i, 1); else state.bm.push(n);
      save('dora-bm', state.bm);
      var on = i < 0; el.classList.toggle('on', on); el.textContent = on ? '★ 已收藏' : '☆ 收藏';
      toast(on ? '已加入收藏' : '已取消收藏'); return;
    }
    if (act === 'copy') {
      var url = location.href.split('#')[0] + '#/article/' + art.dataset.n;
      var done = function () { toast('链接已复制'); };
      if (navigator.clipboard) navigator.clipboard.writeText(url).then(done, function () { prompt('复制链接', url); });
      else prompt('复制链接', url);
      return;
    }
    if (act === 'expand-all') {
      var all = document.querySelectorAll('.art'), anyClosed = Array.prototype.some.call(all, function (a) { return !a.classList.contains('open'); });
      all.forEach(function (a) { a.classList.toggle('open', anyClosed); }); return;
    }
    if (act === 'quiz-pick') {
      var Q = state.quiz; if (Q.picked != null) return;
      Q.picked = +el.dataset.i; if (Q.picked === Q.qs[Q.i].a) Q.score++;
      pageQuiz(Q.filter || undefined); return;
    }
    if (act === 'quiz-next') { state.quiz.i++; state.quiz.picked = null; pageQuiz(state.quiz.filter || undefined); window.scrollTo(0, 0); return; }
    if (act === 'quiz-restart') { startQuiz(state.quiz.filter); pageQuiz(state.quiz.filter || undefined); return; }
  });

  document.getElementById('menuBtn').addEventListener('click', function () { document.body.classList.toggle('nav-open'); });
  document.getElementById('scrim').addEventListener('click', function () { document.body.classList.remove('nav-open'); });
  window.addEventListener('hashchange', route);
  route();
})();

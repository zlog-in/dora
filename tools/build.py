"""Merge the parsed English text with the Chinese translations into site data."""
import glob, json, os, re

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'assets', 'data.js')
d = json.load(open(os.path.join(ROOT, 'source', 'dora_en.json'), encoding='utf-8'))

# ---- article translations
tr = {}
for f in sorted(glob.glob(os.path.join(ROOT, 'translations', 'c*.txt'))):
    cur = None
    for line in open(f, encoding='utf-8'):
        line = line.rstrip('\n')
        if not line.strip():
            continue
        m = re.match(r'@A(\d+) (.*)', line)
        if m:
            cur = int(m[1]); tr[cur] = {'title': m[2], 'b': {}}
            continue
        i, t = line.split('|', 1)
        tr[cur]['b'][int(i)] = t.strip()

rtr = {}
for f in sorted(glob.glob(os.path.join(ROOT, 'translations', 'r*.txt'))):
    for line in open(f, encoding='utf-8'):
        line = line.rstrip('\n')
        if not line.strip():
            continue
        k, t = line.split('|', 1)
        n, i = k.split('.')
        rtr[(int(n), int(i))] = t.strip()

CH = {
    'I':    ('总则', '📜', '确立DORA的主题事项、适用范围（21类实体）、65项定义以及比例原则。',
             'Subject matter, scope, definitions and the proportionality principle.'),
    'II':   ('ICT风险管理', '🛡️', '管理机构责任，以及识别、保护与预防、检测、响应与恢复、学习与演进、沟通的完整ICT风险管理框架；含简化框架。',
             'Governance and the full ICT risk management framework, including the simplified framework.'),
    'III':  ('ICT相关事件管理、分类和报告', '🚨', '事件管理流程、分类标准、重大事件的三阶段报告、显著网络威胁的自愿通报及监管反馈。',
             'Incident management process, classification, reporting of major incidents and supervisory feedback.'),
    'IV':   ('数字运营韧性测试', '🧪', '数字运营韧性测试计划、ICT工具和系统测试，以及基于TLPT的高级测试和测试人员要求。',
             'Testing programme, testing of ICT tools and systems, and advanced testing based on TLPT.'),
    'V':    ('ICT第三方风险管理', '🔗', 'ICT第三方风险管理原则、关键合同条款，以及针对关键ICT第三方服务提供商的欧盟监督框架。',
             'Key principles for ICT third-party risk and the Oversight Framework for critical ICT third-party service providers.'),
    'VI':   ('信息共享安排', '🤝', '金融实体之间交换网络威胁信息和情报的条件。',
             'Arrangements for exchanging cyber threat information and intelligence.'),
    'VII':  ('主管当局', '🏛️', '各类金融实体的主管当局、与NIS2机构的合作、行政处罚、刑事处罚、公布、保密与数据保护。',
             'Competent authorities, cooperation, penalties, publication, professional secrecy and data protection.'),
    'VIII': ('授权法案', '📋', '委员会行使授权、通过授权法案的条件与程序。',
             'Exercise of the delegation by the Commission.'),
    'IX':   ('过渡和最终条款', '🔄', '审查条款、对五项欧盟条例的修订，以及生效和适用日期。',
             'Review clause, amendments to other Regulations, entry into force and application.'),
}
SEC = {
    'cpt_II.sct_I': ('第一节', ''),
    'cpt_II.sct_II': ('第二节', ''),
    'cpt_V.sct_I': ('第一节', '稳健管理ICT第三方风险的关键原则'),
    'cpt_V.sct_II': ('第二节', '关键ICT第三方服务提供商的监督框架'),
    'cpt_IX.sct_I': ('第一节', ''),
    'cpt_IX.sct_II': ('第二节', '修订'),
}

chapters, articles = [], {}
for c in d['chapters']:
    zt, icon, dzh, den = CH[c['num']]
    ch = {'num': c['num'], 'id': c['id'], 'en': c['title'], 'zh': zt, 'icon': icon,
          'descZh': dzh, 'descEn': den, 'sections': []}
    for s in c['sections']:
        sec = {'id': s['id'], 'labelEn': s['label'], 'titleEn': s['title'],
               'labelZh': SEC.get(s['id'], ('', ''))[0], 'titleZh': SEC.get(s['id'], ('', ''))[1],
               'articles': []}
        for a in s['articles']:
            t = tr[a['n']]
            blocks = []
            for i, b in enumerate(a['en']):
                blocks.append({'d': b['d'], 'l': b['l'] or '', 'en': b['en'], 'zh': t['b'][i]})
            articles[a['n']] = {'n': a['n'], 'en': a['title'], 'zh': t['title'], 'ch': c['num'], 'b': blocks}
            sec['articles'].append(a['n'])
        ch['sections'].append(sec)
    chapters.append(ch)

recitals = []
for r in d['recitals']:
    blocks = []
    for i, b in enumerate(r['en']):
        lab = b['l'] or ''
        if i == 0 and lab == f"({r['n']})":
            lab = ''
        blocks.append({'d': b['d'], 'l': lab, 'en': b['en'], 'zh': rtr[(r['n'], i)]})
    recitals.append({'n': r['n'], 'b': blocks})

# ---- glossary from Article 3
glossary = []
for b in articles[3]['b'][1:]:
    me = re.match(r'‘([^’]+)’', b['en'])
    mz = re.match(r'“([^”]+)”', b['zh'])
    glossary.append({'no': b['l'].strip('()'), 'termEn': me[1], 'termZh': mz[1], 'en': b['en'], 'zh': b['zh']})

missing = [n for n in range(1, 65) if n not in articles]
assert not missing, missing
assert len(recitals) == 106

data = {'chapters': chapters, 'articles': articles, 'recitals': recitals, 'glossary': glossary}
with open(OUT, 'w', encoding='utf-8') as f:
    f.write('// Generated from the Official Journal text of Regulation (EU) 2022/2554 (EUR-Lex).\n')
    f.write('window.DORA = ')
    json.dump(data, f, ensure_ascii=False, separators=(',', ':'))
    f.write(';\n')
print('ok', len(articles), 'articles', len(recitals), 'recitals', len(glossary), 'terms')

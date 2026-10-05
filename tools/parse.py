"""Parse the EUR-Lex Official Journal HTML of Regulation (EU) 2022/2554 into source/dora_en.json.

Requires: pip install beautifulsoup4
"""
import json, os, re, sys
from bs4 import BeautifulSoup, NavigableString, Tag

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

soup = BeautifulSoup(open(os.path.join(ROOT, 'source', 'eurlex-32022R2554-en.html'), encoding='utf-8').read(), 'html.parser')

for n in soup.select('.oj-note-tag'):
    n.decompose()


def clean(s):
    s = s.replace('\xa0', ' ')
    s = re.sub(r'\s+', ' ', s).strip()
    s = re.sub(r'^(\d+[a-z]?)\. +', r'\1. ', s)
    s = re.sub(r'\s*\(\s*\)', '', s)
    s = re.sub(r'\s+([,;.:])', r'\1', s)
    s = s.replace('’;"', '’;')
    return s


def text_of(p):
    return clean(p.get_text(' '))


unhandled = set()


def walk(node, depth, out, label=None):
    """Emit blocks: {d: depth, l: label, en: text}"""
    for ch in node.children:
        if not isinstance(ch, Tag):
            if isinstance(ch, NavigableString) and ch.strip():
                unhandled.add('text:' + ch.strip()[:40])
            continue
        cls = ch.get('class') or []
        if ch.name == 'p':
            if 'oj-ti-art' in cls or 'oj-sti-art' in cls:
                continue
            t = text_of(ch)
            if not t:
                continue
            out.append({'d': depth, 'l': label, 'en': t})
            label = None
        elif ch.name == 'table':
            for tr in ch.find_all('tr', recursive=False) or ch.select(':scope > tbody > tr'):
                tds = tr.find_all('td', recursive=False)
                if len(tds) == 2:
                    lab = text_of(tds[0])
                    walk(tds[1], depth + 1, out, lab)
                else:
                    unhandled.add('tr-with-%d-td' % len(tds))
        elif ch.name in ('div', 'tbody', 'span'):
            walk(ch, depth, out, label)
            label = None
        elif ch.name == 'col':
            continue
        else:
            unhandled.add(ch.name + str(cls))
    return out


# recitals
recitals = []
for d in soup.select('div.eli-subdivision[id^=rct_]'):
    blocks = walk(d, 0, [])
    num = d['id'].split('_')[1]
    text = ' '.join(b['en'] for b in blocks)
    recitals.append({'n': int(num), 'en': blocks})

chapters = []
for cpt in soup.select('div[id^=cpt_]'):
    cid = cpt['id']
    if '.' in cid:
        continue
    head = cpt.find('p', class_='oj-ti-section-1')
    title = cpt.find('div', class_='eli-title', recursive=False)
    ch = {'id': cid, 'num': cid.split('_')[1], 'label': text_of(head), 'title': text_of(title), 'sections': []}

    def add_articles(container, sec):
        for art in container.find_all('div', id=re.compile(r'^art_\d+$'), recursive=True):
            num = int(art['id'].split('_')[1])
            blocks = walk(art, 0, [])
            sec['articles'].append({'n': num, 'title': text_of(art.find('p', class_='oj-sti-art')), 'en': blocks})

    secs = [s for s in cpt.find_all('div', id=re.compile(r'^cpt_[^.]+\.sct_[IVX]+$'), recursive=True)]
    if secs:
        for s in secs:
            h = s.find('p', class_='oj-ti-section-1')
            t = s.find('div', class_='eli-title', recursive=False) or BeautifulSoup('<p></p>','html.parser')
            sec = {'id': s['id'], 'label': text_of(h), 'title': text_of(t), 'articles': []}
            add_articles(s, sec)
            ch['sections'].append(sec)
    else:
        sec = {'id': None, 'label': '', 'title': '', 'articles': []}
        add_articles(cpt, sec)
        ch['sections'].append(sec)
    chapters.append(ch)

nart = sum(len(s['articles']) for c in chapters for s in c['sections'])
print('chapters', len(chapters), 'articles', nart, 'recitals', len(recitals))
print('unhandled', unhandled)
words = lambda bl: sum(len(b['en'].split()) for b in bl)
print('recital words', sum(words(r['en']) for r in recitals))
for c in chapters:
    print(c['label'], c['title'], [(s['label'], s['title'], [a['n'] for a in s['articles']]) for s in c['sections']],
          sum(words(a['en']) for s in c['sections'] for a in s['articles']))
json.dump({'chapters': chapters, 'recitals': recitals}, open(os.path.join(ROOT, 'source', 'dora_en.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)

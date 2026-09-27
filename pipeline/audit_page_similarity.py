import sys, re, difflib, os
pairs = [('repo', r'C:\Users\CHEN\Desktop\repo\web\dist'),
         ('tcg-shop', r'C:\Users\CHEN\Desktop\tcg-shop\web\dist'),
         ('supermarket-simulator', r'C:\Users\CHEN\Desktop\supermarket-simulator\web\dist')]
def main(path):
    h = open(path, encoding='utf-8').read()
    m = re.search(r'<main>(.*?)</main>', h, re.S)
    body = m.group(1) if m else h
    return re.sub(r'\s+', ' ', body).strip()
for name, d in pairs:
    a = main(os.path.join(d, 'search.html')); b = main(os.path.join(d, 'tool.html'))
    r = difflib.SequenceMatcher(None, a, b).ratio()
    print('%-24s searchBody=%6d toolBody=%6d similarity=%.3f' % (name, len(a), len(b), r))
    print('   search main starts: %s' % a[:110])
    print('   tool   main starts: %s' % b[:110])

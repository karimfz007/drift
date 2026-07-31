#!/usr/bin/env python3
"""
EXPORT THE v2.5 INTEGRATION MODEL TO TEXT THE REPO CAN ACTUALLY READ.

The workbook is the editing surface; these exports are what the repository reads, diffs and
checks. A spreadsheet is opaque to `git diff`, to `check-docs-integrity`, and to anyone
reviewing a pull request — so production truth that lives only in a binary is production
truth nobody can audit.

Deliberately STDLIB ONLY. An .xlsx is a zip of XML, and installing a package to read one
workbook is more dependency than the job needs — this has to keep working on a machine that
has just been cloned to, with no install step in front of it.

Re-run after any workbook edit:

    python3 tools/export-model.py

Writes one CSV per requested sheet (the machine-readable form) plus one markdown table
(the reviewable form), because the two audiences are different and neither is served well
by the other's format.
"""
import csv
import io
import os
import re
import sys
import zipfile

XLSX = 'docs/reference/the_first_night_whole_game_integration_model_v2_5.xlsx'
OUT_DIR = 'docs/reference/model'

#  The three the director named. Others stay in the workbook until something in the repo
#  needs to read them — an export nobody reads is a second source of truth with no reader.
WANTED = ['System Registry', 'Gap Backlog', 'Dependencies']

NS = '{http://schemas.openxmlformats.org/spreadsheetml/2006/main}'


def shared_strings(z):
    """The string table. Cells of type `s` hold an index into this, not a value."""
    if 'xl/sharedStrings.xml' not in z.namelist():
        return []
    raw = z.read('xl/sharedStrings.xml').decode('utf-8-sig')
    out = []
    for si in re.findall(r'<(?:x:)?si>(.*?)</(?:x:)?si>', raw, re.S):
        #  A string may be split across several runs; concatenate every <t> inside the item.
        parts = re.findall(r'<(?:x:)?t[^>]*>(.*?)</(?:x:)?t>', si, re.S)
        out.append(unescape(''.join(parts)))
    return out


def unescape(s):
    return (s.replace('&lt;', '<').replace('&gt;', '>')
             .replace('&quot;', '"').replace('&apos;', "'")
             .replace('&amp;', '&'))


def col_index(ref):
    """'AB12' -> 27. Column letters are base-26 with no zero."""
    letters = re.match(r'([A-Z]+)', ref).group(1)
    n = 0
    for ch in letters:
        n = n * 26 + (ord(ch) - ord('A') + 1)
    return n - 1


def sheet_rows(z, path, strings):
    raw = z.read(path).decode('utf-8-sig')
    rows = []
    for row_xml in re.findall(r'<(?:x:)?row[^>]*>(.*?)</(?:x:)?row>', raw, re.S):
        cells = {}
        for cell in re.findall(r'<(?:x:)?c\b([^>]*)>(.*?)</(?:x:)?c>', row_xml, re.S):
            attrs, body = cell
            ref = re.search(r'r="([A-Z]+\d+)"', attrs)
            if not ref:
                continue
            idx = col_index(ref.group(1))
            typ = re.search(r't="(\w+)"', attrs)
            typ = typ.group(1) if typ else 'n'
            if typ == 's':
                v = re.search(r'<(?:x:)?v>(.*?)</(?:x:)?v>', body, re.S)
                value = strings[int(v.group(1))] if v else ''
            elif typ == 'inlineStr':
                parts = re.findall(r'<(?:x:)?t[^>]*>(.*?)</(?:x:)?t>', body, re.S)
                value = unescape(''.join(parts))
            else:
                v = re.search(r'<(?:x:)?v>(.*?)</(?:x:)?v>', body, re.S)
                value = unescape(v.group(1)) if v else ''
            cells[idx] = value.strip()
        if not cells:
            rows.append([])
            continue
        width = max(cells) + 1
        rows.append([cells.get(i, '') for i in range(width)])
    return rows


def md_table(rows):
    """Markdown, for the human reviewer. Ragged rows are padded rather than dropped —
    losing a cell silently is exactly the failure an export is supposed to prevent."""
    rows = [r for r in rows if any(c for c in r)]
    if not rows:
        return '_(empty sheet)_\n'
    width = max(len(r) for r in rows)
    head = rows[0] + [''] * (width - len(rows[0]))
    out = ['| ' + ' | '.join(c.replace('|', '\\|') or ' ' for c in head) + ' |']
    out.append('|' + '---|' * width)
    for r in rows[1:]:
        r = r + [''] * (width - len(r))
        out.append('| ' + ' | '.join(c.replace('|', '\\|').replace('\n', '<br>') or ' ' for c in r) + ' |')
    return '\n'.join(out) + '\n'


def main():
    if not os.path.exists(XLSX):
        print(f'FAILED: {XLSX} not found', file=sys.stderr)
        return 1
    os.makedirs(OUT_DIR, exist_ok=True)
    z = zipfile.ZipFile(XLSX)
    strings = shared_strings(z)

    wb = z.read('xl/workbook.xml').decode('utf-8-sig')
    sheets = re.findall(r'<(?:x:)?sheet name="([^"]+)"[^>]*r:id="([^"]+)"', wb)

    #  Attributes are parsed per ELEMENT rather than by one ordered regex: this workbook
    #  writes Target before Id, and a pattern that assumed Id-then-Target silently matched
    #  nothing and reported every sheet missing. Targets are also absolute ("/xl/...").
    rels = z.read('xl/_rels/workbook.xml.rels').decode('utf-8-sig')
    relmap = {}
    #  Pattern deliberately free of backslash escapes: a mangled one here became a
    #  literal backspace and silently matched nothing, reporting every sheet missing.
    for el in re.findall('<Relationship([^>]*)>', rels):
        rid = re.search(r'Id="([^"]+)"', el)
        tgt = re.search(r'Target="([^"]+)"', el)
        if rid and tgt:
            relmap[rid.group(1)] = tgt.group(1)

    exported = []
    for name, rid in sheets:
        if name not in WANTED:
            continue
        target = relmap.get(rid, '')
        #  Absolute ("/xl/worksheets/sheet1.xml") or relative ("worksheets/sheet1.xml"):
        #  normalise both to the archive's own key.
        path = target.lstrip('/')
        if not path.startswith('xl/'):
            path = 'xl/' + path
        if path not in z.namelist():
            print(f'  ! {name}: {path} missing from the archive', file=sys.stderr)
            continue
        rows = sheet_rows(z, path, strings)
        slug = name.lower().replace(' ', '-')

        with io.open(f'{OUT_DIR}/{slug}.csv', 'w', encoding='utf-8', newline='') as f:
            csv.writer(f, lineterminator='\n').writerows(rows)
        with io.open(f'{OUT_DIR}/{slug}.md', 'w', encoding='utf-8', newline='\n') as f:
            f.write(f'# {name}\n\n')
            f.write('*Exported from `the_first_night_whole_game_integration_model_v2_5.xlsx` '
                    'by `tools/export-model.py`. The workbook is the editing surface; this is '
                    'what the repository reads. Re-run the exporter after any workbook edit '
                    'rather than editing this file.*\n\n')
            f.write(md_table(rows))
        exported.append((name, len([r for r in rows if any(r)])))

    if not exported:
        print('FAILED: none of the wanted sheets were found', file=sys.stderr)
        return 1
    for name, n in exported:
        print(f'  exported {name}: {n} non-empty rows')
    print(f'Model export complete: {len(exported)} sheet(s) -> {OUT_DIR}/')
    return 0


if __name__ == '__main__':
    sys.exit(main())

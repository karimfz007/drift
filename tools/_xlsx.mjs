import { readFileSync } from 'node:fs';
import { inflateRawSync } from 'node:zlib';
export function entryOf(file, want) {
    const buf = readFileSync(file);
    let i = 0;
    while ((i = buf.indexOf(Buffer.from('PK\u0003\u0004'), i)) >= 0) {
        const nameLen = buf.readUInt16LE(i + 26), extraLen = buf.readUInt16LE(i + 28);
        const method = buf.readUInt16LE(i + 8), csize = buf.readUInt32LE(i + 18);
        const name = buf.slice(i + 30, i + 30 + nameLen).toString();
        const ds = i + 30 + nameLen + extraLen;
        if (name === want) {
            const raw = buf.slice(ds, ds + csize);
            return method === 8 ? inflateRawSync(raw).toString('utf8') : raw.toString('utf8');
        }
        i = ds + (csize || 1);
    }
    return null;
}
export function sharedStrings(file) {
    const ss = entryOf(file, 'xl/sharedStrings.xml') || '';
    return [...ss.matchAll(/<si>(.*?)<\/si>/gs)].map((m) =>
        [...m[1].matchAll(/<t[^>]*>(.*?)<\/t>/gs)].map((x) => x[1]).join(''));
}

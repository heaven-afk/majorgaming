/**
 * Reads an uploaded spreadsheet into rows of text: Excel (.xlsx, every sheet) or CSV / pasted
 * text. No library: an .xlsx file is a zip of XML files, and that's all this needs. Server only.
 */

import { inflateRawSync } from "node:zlib";

export type Sheet = { name: string; rows: string[][] };

// Zip -----------------------------------------------------------------------------------------

function unzip(buf: Buffer) {
  // The end-of-central-directory record sits in the last 64 KB.
  let end = -1;
  for (let i = buf.length - 22; i >= Math.max(0, buf.length - 65_557); i--) {
    if (buf.readUInt32LE(i) === 0x06054b50) {
      end = i;
      break;
    }
  }
  if (end < 0) throw new Error("That file isn't a valid Excel workbook.");
  const count = buf.readUInt16LE(end + 10);
  let p = buf.readUInt32LE(end + 16);
  const files = new Map<string, Buffer>();
  for (let n = 0; n < count; n++) {
    if (buf.readUInt32LE(p) !== 0x02014b50) break;
    const method = buf.readUInt16LE(p + 10);
    const size = buf.readUInt32LE(p + 20);
    const nameLen = buf.readUInt16LE(p + 28);
    const extraLen = buf.readUInt16LE(p + 30);
    const commentLen = buf.readUInt16LE(p + 32);
    const local = buf.readUInt32LE(p + 42);
    const name = buf.toString("utf8", p + 46, p + 46 + nameLen);
    const start = local + 30 + buf.readUInt16LE(local + 26) + buf.readUInt16LE(local + 28);
    const data = buf.subarray(start, start + size);
    if (method === 0) files.set(name, data);
    else if (method === 8) files.set(name, inflateRawSync(data));
    p += 46 + nameLen + extraLen + commentLen;
  }
  return files;
}

// XML ----------------------------------------------------------------------------------------

const decode = (s: string) =>
  s
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/&amp;/g, "&");

const texts = (xml: string) => [...xml.matchAll(/<(?:\w+:)?t(?:\s[^>]*)?>([\s\S]*?)<\/(?:\w+:)?t>/g)].map((m) => decode(m[1])).join("");
const attr = (tag: string, name: string) => tag.match(new RegExp(`\\s${name}="([^"]*)"`))?.[1];

function column(ref: string) {
  let n = 0;
  for (const ch of ref.match(/^[A-Z]+/)?.[0] ?? "A") n = n * 26 + ch.charCodeAt(0) - 64;
  return n - 1;
}

export function readXlsx(buf: Buffer): Sheet[] {
  const files = unzip(buf);
  const read = (path: string) => files.get(path)?.toString("utf8");
  const shared = [...(read("xl/sharedStrings.xml") ?? "").matchAll(/<si>([\s\S]*?)<\/si>/g)].map((m) => texts(m[1]));
  const rels = new Map([...(read("xl/_rels/workbook.xml.rels") ?? "").matchAll(/<Relationship\b[^>]*>/g)].map((m) => [attr(m[0], "Id")!, attr(m[0], "Target")!]));
  const sheets: Sheet[] = [];
  for (const m of (read("xl/workbook.xml") ?? "").matchAll(/<sheet\b[^>]*>/g)) {
    const target = rels.get(attr(m[0], "r:id") ?? "")?.replace(/^\//, "");
    if (!target) continue;
    const xml = read(target.startsWith("xl/") ? target : `xl/${target}`);
    if (!xml) continue;
    const rows: string[][] = [];
    for (const r of xml.matchAll(/<row\b[^>]*>([\s\S]*?)<\/row>/g)) {
      const cells: string[] = [];
      for (const c of r[1].matchAll(/<c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)) {
        const type = attr(c[1], "t");
        const ref = attr(c[1], "r");
        const body = c[2] ?? "";
        const v = body.match(/<v>([\s\S]*?)<\/v>/)?.[1];
        let value = "";
        if (type === "inlineStr") value = texts(body);
        else if (v === undefined) continue;
        else if (type === "s") value = shared[Number(v)] ?? "";
        else value = decode(v);
        cells[ref ? column(ref) : cells.length] = value;
      }
      if (cells.some((x) => x?.trim())) rows.push(Array.from(cells, (x) => clean(x ?? "")));
    }
    sheets.push({ name: decode(attr(m[0], "name") ?? `Sheet ${sheets.length + 1}`), rows });
  }
  return sheets;
}

// CSV and pasted text ------------------------------------------------------------------------

/** CSV, or tab-separated text as Excel and Google Sheets copy it. */
export function readDelimited(text: string): Sheet[] {
  const sep = text.split(/\r?\n/, 1)[0].includes("\t") ? "\t" : ",";
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (ch === '"') quoted = false;
      else cell += ch;
    } else if (ch === '"' && !cell) quoted = true;
    else if (ch === sep) {
      row.push(cell);
      cell = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && text[i + 1] === "\n") i++;
      row.push(cell);
      if (row.some((x) => x.trim())) rows.push(row.map(clean));
      row = [];
      cell = "";
    } else cell += ch;
  }
  row.push(cell);
  if (row.some((x) => x.trim())) rows.push(row.map(clean));
  return [{ name: "Pasted", rows }];
}

/** Strips the invisible characters sheets pick up from copy and paste. */
export function clean(s: string) {
  return s
    .replace(/[​-‍﻿ ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export async function readUpload(file: File): Promise<Sheet[]> {
  if (file.size > 5 * 1024 * 1024) throw new Error("Sheets can be up to 5 MB.");
  const buf = Buffer.from(await file.arrayBuffer());
  if (/\.xlsx$/i.test(file.name) || buf.readUInt32LE(0) === 0x04034b50) return readXlsx(buf);
  if (/\.xls$/i.test(file.name)) throw new Error("Save the sheet as .xlsx (Excel 2007 or later) or CSV, then upload it again.");
  return readDelimited(buf.toString("utf8"));
}

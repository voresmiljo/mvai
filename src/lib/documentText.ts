import { inflateRawSync } from "node:zlib";

const TEXT_LIMIT = 40000;

function clean(value: string): string {
  return value.replace(/\u0000/g, "").replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim().slice(0, TEXT_LIMIT);
}

function xmlText(xml: string, paragraph: RegExp): string {
  return xml
    .replace(/<w:tab\/>/g, "\t")
    .replace(/<w:br\/>/g, "\n")
    .replace(paragraph, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, "\"")
    .replace(/&#(\d+);/g, (_, digits: string) => String.fromCodePoint(Number(digits)));
}

function readZipEntry(bytes: Uint8Array, name: string): Uint8Array | null {
  const wanted = new TextEncoder().encode(name);
  for (let offset = 0; offset + 30 < bytes.length; offset += 1) {
    if (bytes[offset] !== 0x50 || bytes[offset + 1] !== 0x4b || bytes[offset + 2] !== 0x03 || bytes[offset + 3] !== 0x04) {
      continue;
    }
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    const method = view.getUint16(offset + 8, true);
    const compressed = view.getUint32(offset + 18, true);
    const nameLength = view.getUint16(offset + 26, true);
    const extraLength = view.getUint16(offset + 28, true);
    const nameStart = offset + 30;
    const dataStart = nameStart + nameLength + extraLength;
    const entryName = bytes.subarray(nameStart, nameStart + nameLength);
    const same = entryName.length === wanted.length && entryName.every((byte, index) => byte === wanted[index]);
    if (!same) continue;
    const data = bytes.subarray(dataStart, dataStart + compressed);
    if (method === 0) return data;
    if (method === 8) return inflateRawSync(data);
  }
  return null;
}

function textFromXmlZip(bytes: Uint8Array, entry: string, paragraph: RegExp): string {
  const xml = readZipEntry(bytes, entry);
  if (!xml) return "";
  return clean(xmlText(new TextDecoder().decode(xml), paragraph));
}

async function textFromPdf(bytes: Uint8Array): Promise<string> {
  const { extractText } = await import("unpdf");
  const result = await extractText(bytes, { mergePages: true });
  return result.text;
}

function textFromRtf(bytes: Uint8Array): string {
  const raw = new TextDecoder("latin1").decode(bytes);
  const decoded = raw
    .replace(/\\par[d]?/g, "\n")
    .replace(/\\'([0-9a-f]{2})/gi, (_, hex: string) => String.fromCharCode(Number.parseInt(hex, 16)))
    .replace(/\\[a-z]+-?\d* ?/gi, "")
    .replace(/[{}]/g, "");
  return clean(decoded);
}

function textFromLegacyDoc(bytes: Uint8Array): string {
  const parts: string[] = [];
  let current = "";
  for (let index = 0; index + 1 < bytes.length; index += 2) {
    const code = bytes[index] + (bytes[index + 1] << 8);
    if (code >= 32 && code <= 0xff) current += String.fromCharCode(code);
    else {
      if (current.length > 40) parts.push(current);
      current = "";
    }
  }
  if (current.length > 40) parts.push(current);
  return clean(parts.join("\n"));
}

export async function textFromDocument(name: string, bytes: Uint8Array): Promise<string> {
  const lower = name.toLowerCase();
  try {
    if (lower.endsWith(".pdf") || (bytes[0] === 0x25 && bytes[1] === 0x50)) return clean(await textFromPdf(bytes));
    if (lower.endsWith(".docx")) return textFromXmlZip(bytes, "word/document.xml", /<\/w:p>/g);
    if (lower.endsWith(".odt")) return textFromXmlZip(bytes, "content.xml", /<\/text:p>/g);
    if (lower.endsWith(".rtf")) return textFromRtf(bytes);
    if (lower.endsWith(".doc")) return textFromLegacyDoc(bytes);
    return clean(new TextDecoder().decode(bytes));
  } catch {
    return "";
  }
}

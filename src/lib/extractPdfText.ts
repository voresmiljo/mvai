import { createRequire } from "node:module";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { PDFParse } from "pdf-parse";

const require = createRequire(path.join(process.cwd(), "package.json"));

let workerReady = false;

function ensurePdfWorker() {
  if (workerReady) return;
  const workerPath = require.resolve("pdfjs-dist/legacy/build/pdf.worker.mjs");
  PDFParse.setWorker(pathToFileURL(workerPath).href);
  workerReady = true;
}

export async function extractPdfText(data: Buffer): Promise<{ text: string; pageCount: number }> {
  ensurePdfWorker();
  const parser = new PDFParse({ data });
  try {
    const result = await parser.getText();
    return {
      text: (result.text || "").replace(/\u0000/g, "").trim(),
      pageCount: result.total || result.pages?.length || 1,
    };
  } finally {
    await parser.destroy().catch(() => undefined);
  }
}

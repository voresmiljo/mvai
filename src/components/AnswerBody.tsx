"use client";

import React from "react";
import { CitationText, type CitationSource } from "@/components/CitationText";

type Block =
  | { kind: "heading"; text: string }
  | { kind: "numbered"; items: string[] }
  | { kind: "bullets"; items: string[] }
  | { kind: "text"; text: string };

function blocksFrom(text: string): Block[] {
  const blocks: Block[] = [];
  let numbered: string[] = [];
  let bullets: string[] = [];
  let paragraph: string[] = [];

  const flushParagraph = () => {
    if (!paragraph.length) return;
    blocks.push({ kind: "text", text: paragraph.join("\n") });
    paragraph = [];
  };
  const flushNumbered = () => {
    if (!numbered.length) return;
    blocks.push({ kind: "numbered", items: numbered });
    numbered = [];
  };
  const flushBullets = () => {
    if (!bullets.length) return;
    blocks.push({ kind: "bullets", items: bullets });
    bullets = [];
  };
  const flush = () => {
    flushParagraph();
    flushNumbered();
    flushBullets();
  };

  for (const line of text.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed) {
      flush();
      continue;
    }
    const heading = trimmed.match(/^#{1,3}\s+(.+)$/);
    if (heading) {
      flush();
      blocks.push({ kind: "heading", text: heading[1] });
      continue;
    }
    const number = trimmed.match(/^\d+\.\s+(.+)$/);
    if (number) {
      flushParagraph();
      flushBullets();
      numbered.push(number[1]);
      continue;
    }
    const bullet = trimmed.match(/^[*-]\s+(.+)$/);
    if (bullet) {
      flushParagraph();
      flushNumbered();
      bullets.push(bullet[1]);
      continue;
    }
    flushNumbered();
    flushBullets();
    paragraph.push(trimmed);
  }
  flush();
  return blocks;
}

export function AnswerBody<T extends CitationSource>({
  text,
  sources,
  activeId,
  onSelectSource,
  onDownloadOriginal,
}: {
  text: string;
  sources?: T[];
  activeId?: string | null;
  onSelectSource?: (source: T) => void;
  onDownloadOriginal?: (source: T) => void;
}) {
  const blocks = blocksFrom(text);
  const line = (value: string) =>
    sources && onSelectSource ? (
      <CitationText
        inline
        text={value}
        sources={sources}
        activeId={activeId}
        onSelectSource={onSelectSource}
        onDownloadOriginal={onDownloadOriginal}
      />
    ) : (
      <CitationText inline text={value} sources={[]} onSelectSource={() => undefined} />
    );

  return (
    <div className="space-y-3 text-sm leading-relaxed">
      {blocks.map((block, index) => {
        if (block.kind === "heading") {
          return (
            <h3 key={index} className="text-base font-bold text-slate-900">
              {line(block.text)}
            </h3>
          );
        }
        if (block.kind === "numbered") {
          return (
            <ol key={index} className="list-decimal space-y-1 pl-5">
              {block.items.map((item, itemIndex) => (
                <li key={itemIndex}>{line(item)}</li>
              ))}
            </ol>
          );
        }
        if (block.kind === "bullets") {
          return (
            <ul key={index} className="list-disc space-y-1 pl-5">
              {block.items.map((item, itemIndex) => (
                <li key={itemIndex}>{line(item)}</li>
              ))}
            </ul>
          );
        }
        return <p key={index}>{line(block.text)}</p>;
      })}
    </div>
  );
}

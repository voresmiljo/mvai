"use client";

import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { sourceMeta } from "@/lib/sourceLevel";

export interface CitationSource {
  id: string;
  title: string;
  citation: string;
  textSnippet: string;
  relevanceScore: number;
  lawSection?: string;
  date?: string;
  sourceType?: string;
  hasOriginal?: boolean;
}

const POPOVER_WIDTH = 420;

function richText(value: string): React.ReactNode[] {
  const pieces: React.ReactNode[] = [];
  const pattern = /\*\*([^*]+)\*\*/g;
  let last = 0;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(value)) !== null) {
    if (match.index > last) pieces.push(value.slice(last, match.index));
    pieces.push(
      <strong key={match.index} className="font-semibold text-slate-900">
        {match[1]}
      </strong>
    );
    last = match.index + match[0].length;
  }
  if (last < value.length) pieces.push(value.slice(last));
  return pieces;
}

function placePopover(anchor: HTMLElement): { top: number; left: number } {
  const rect = anchor.getBoundingClientRect();
  const height = 280;
  let left = rect.left;
  if (left + POPOVER_WIDTH > window.innerWidth - 8) {
    left = window.innerWidth - POPOVER_WIDTH - 8;
  }
  if (left < 8) left = 8;
  let top = rect.bottom + 6;
  if (top + height > window.innerHeight - 8) {
    top = Math.max(8, rect.top - height - 6);
  }
  return { top, left };
}

function CitationMark<T extends CitationSource>({
  n,
  source,
  open,
  active,
  onOpen,
  onScheduleClose,
  onCancelClose,
  onSelectSource,
  onDownloadOriginal,
}: {
  n: number;
  source: T;
  open: boolean;
  active: boolean;
  onOpen: () => void;
  onScheduleClose: () => void;
  onCancelClose: () => void;
  onSelectSource: (source: T) => void;
  onDownloadOriginal?: (source: T) => void;
}) {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [pos, setPos] = useState({ top: 0, left: 0 });

  useLayoutEffect(() => {
    if (!open || !buttonRef.current) return;
    setPos(placePopover(buttonRef.current));
  }, [open]);

  useEffect(() => {
    if (!open || !buttonRef.current) return;
    const update = () => {
      if (buttonRef.current) setPos(placePopover(buttonRef.current));
    };
    window.addEventListener("scroll", update, true);
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update, true);
      window.removeEventListener("resize", update);
    };
  }, [open]);

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        aria-expanded={open}
        aria-label={`Kilde ${n}: ${source.title}`}
        onMouseEnter={() => {
          onCancelClose();
          onOpen();
        }}
        onMouseLeave={onScheduleClose}
        onClick={() => {
          onCancelClose();
          onOpen();
        }}
        className={`mx-0.5 inline-flex items-center justify-center rounded border px-1.5 py-0.5 align-super text-xs font-bold transition-colors ${
          active || open
            ? "border-[#0F382C] bg-[#0F382C] text-white"
            : "border-emerald-300/70 bg-emerald-100/80 text-emerald-900 hover:bg-emerald-200"
        }`}
      >
        {n}
      </button>
      {open &&
        createPortal(
          <div
            role="dialog"
            aria-label={`Kilde ${n}`}
            onMouseEnter={onCancelClose}
            onMouseLeave={onScheduleClose}
            style={{ top: pos.top, left: pos.left, width: POPOVER_WIDTH }}
            data-citation-popover={n}
            className="fixed z-[80] flex max-h-[70vh] flex-col rounded-xl border border-slate-200 bg-white/95 p-4 text-left shadow-xl backdrop-blur-md"
          >
            <div className="mb-2 min-w-0 shrink-0">
              <p className="break-words text-base font-bold leading-snug text-slate-900">{source.title}</p>
              {source.lawSection && (
                <p className="mt-1 break-words text-xs leading-snug text-slate-500">{source.lawSection}</p>
              )}
              {sourceMeta(source) && (
                <p className="mt-1 break-words text-[11px] leading-snug text-slate-400">{sourceMeta(source)}</p>
              )}
            </div>
            <div className="mb-3 max-h-48 min-h-0 flex-1 overflow-y-auto whitespace-pre-wrap rounded-lg border-l-4 border-emerald-600 bg-slate-50 p-3 text-xs italic leading-relaxed text-slate-700">
              “{source.textSnippet}”
            </div>
            <div className="flex shrink-0 gap-2 border-t border-slate-100 pt-3">
              <button
                type="button"
                data-open-source={source.id}
                onClick={() => onSelectSource(source)}
                className="flex-1 rounded-md bg-emerald-50 py-1.5 text-xs font-medium text-emerald-800 transition-colors hover:bg-emerald-100"
              >
                Åbn i Kildeviser
              </button>
              {source.hasOriginal && onDownloadOriginal && (
                <button
                  type="button"
                  onClick={() => onDownloadOriginal(source)}
                  className="flex-1 rounded-md border border-slate-200 py-1.5 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50"
                >
                  Hent original PDF
                </button>
              )}
            </div>
          </div>,
          document.body
        )}
    </>
  );
}

export function CitationText<T extends CitationSource>({
  text,
  sources,
  activeId,
  onSelectSource,
  onDownloadOriginal,
  inline = false,
}: {
  text: string;
  sources: T[];
  activeId?: string | null;
  onSelectSource: (source: T) => void;
  onDownloadOriginal?: (source: T) => void;
  inline?: boolean;
}) {
  const [openKey, setOpenKey] = useState<number | null>(null);
  const closeTimer = useRef<number | null>(null);

  const cancelClose = () => {
    if (closeTimer.current !== null) {
      window.clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
  };

  const scheduleClose = () => {
    cancelClose();
    closeTimer.current = window.setTimeout(() => setOpenKey(null), 180);
  };

  useEffect(() => () => cancelClose(), []);

  const parts: React.ReactNode[] = [];
  const pattern = /\[(\d{1,2})\]/g;
  let last = 0;
  let match: RegExpExecArray | null;
  let key = 0;
  while ((match = pattern.exec(text)) !== null) {
    const n = Number(match[1]);
    const source = sources[n - 1];
    if (match.index > last) parts.push(...richText(text.slice(last, match.index)));
    if (source) {
      const markKey = key;
      parts.push(
        <CitationMark
          key={markKey}
          n={n}
          source={source}
          open={openKey === markKey}
          active={activeId === source.id}
          onOpen={() => setOpenKey(markKey)}
          onScheduleClose={scheduleClose}
          onCancelClose={cancelClose}
          onSelectSource={(selected) => {
            cancelClose();
            setOpenKey(null);
            onSelectSource(selected);
          }}
          onDownloadOriginal={onDownloadOriginal}
        />
      );
    } else {
      parts.push(match[0]);
    }
    last = match.index + match[0].length;
    key += 1;
  }
  if (last < text.length) parts.push(...richText(text.slice(last)));

  const Tag = inline ? "span" : "div";
  return <Tag className={inline ? undefined : "whitespace-pre-line"}>{parts}</Tag>;
}

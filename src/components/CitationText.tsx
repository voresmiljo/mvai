"use client";

import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

export interface CitationSource {
  id: string;
  title: string;
  citation: string;
  textSnippet: string;
  relevanceScore: number;
  lawSection?: string;
  hasOriginal?: boolean;
}

const POPOVER_WIDTH = 320;

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
            className="fixed z-[80] flex max-h-[70vh] flex-col rounded-xl border border-emerald-200 bg-white p-3.5 text-left shadow-2xl"
          >
            <div className="mb-2 min-w-0 shrink-0">
              <p className="text-xs font-semibold leading-snug text-[#0F382C]">{source.title}</p>
              {source.lawSection && (
                <p className="mt-0.5 text-[10px] leading-snug text-slate-600">Afsnit: {source.lawSection}</p>
              )}
              {source.citation && (
                <p className="mt-0.5 font-mono text-[10px] leading-snug text-slate-500">{source.citation}</p>
              )}
            </div>
            <div className="mb-3 max-h-40 min-h-0 flex-1 overflow-y-auto whitespace-pre-wrap rounded-lg border border-slate-200/60 bg-slate-50 p-2.5 font-mono text-xs leading-relaxed text-slate-700">
              {source.textSnippet}
            </div>
            <div className="flex shrink-0 gap-2">
              <button
                type="button"
                onClick={() => onSelectSource(source)}
                className="flex-1 rounded-lg bg-[#0F382C] py-1.5 text-xs font-medium text-white shadow-sm transition-colors hover:bg-[#14493a]"
              >
                Vis kilde
              </button>
              {source.hasOriginal && onDownloadOriginal && (
                <button
                  type="button"
                  onClick={() => onDownloadOriginal(source)}
                  className="flex-1 rounded-lg border border-[#0F382C] py-1.5 text-xs font-medium text-[#0F382C] transition-colors hover:bg-emerald-50"
                >
                  Download original
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
}: {
  text: string;
  sources: T[];
  activeId?: string | null;
  onSelectSource: (source: T) => void;
  onDownloadOriginal?: (source: T) => void;
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
    if (match.index > last) parts.push(text.slice(last, match.index));
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
  if (last < text.length) parts.push(text.slice(last));

  return <div className="whitespace-pre-line">{parts}</div>;
}

import { useRef } from "react";
import { FileText, ScrollText, ListOrdered, Mail, StickyNote, Camera, Lock, Sparkles } from "lucide-react";
import { useLang } from "@/context/LangContext";
import { ASSETS } from "@/lib/assets";
import { sfx } from "@/lib/sound";

export const SIZE = { person: [190, 250], doc: [240, 168] };
export const isPerson = (kind) => kind === "victim" || kind === "suspect";
export const cardSize = (kind) => (isPerson(kind) ? SIZE.person : SIZE.doc);

const ICONS = { report: FileText, statement: ScrollText, log: ListOrdered, letter: Mail, note: StickyNote, photo: Camera };
const LABELS = { report: "REPORT", statement: "STATEMENT", log: "RECORD", letter: "DOCUMENT", note: "NOTE", photo: "PHOTO" };

const PersonFace = ({ item }) => {
  const { pick } = useLang();
  return (
    <div className="paper-light w-full h-full p-2.5 pb-3 flex flex-col">
      <div className="relative flex-1 overflow-hidden bg-black">
        <img src={ASSETS[item.image_key]} alt="" draggable={false} className="w-full h-full object-cover grayscale contrast-110" />
        <span className={`absolute top-2 start-2 font-mono-tu text-[9px] tracking-[0.2em] px-1.5 py-0.5 ${item.kind === "victim" ? "bg-white text-black" : "bg-black/70 text-white"}`}>
          {item.kind === "victim" ? "VICTIM" : "SUSPECT"}
        </span>
      </div>
      <div className="pt-2 text-center">
        <div className="font-semibold text-[14px] leading-tight">{pick(item.title)}</div>
        <div className="text-[11px] text-[#3c414b] mt-0.5">{pick(item.subtitle)}</div>
      </div>
    </div>
  );
};

const DocFace = ({ item }) => {
  const { pick } = useLang();
  const Icon = ICONS[item.kind] || FileText;
  const light = item.kind === "note";
  return (
    <div className={`${light ? "paper-light" : "paper"} w-full h-full p-4 flex flex-col overflow-hidden`}>
      <div className={`flex items-center justify-between font-mono-tu text-[9px] tracking-[0.25em] ${light ? "text-[#3c414b]" : "text-[#8E95A2]"}`}>
        <span>{LABELS[item.kind]}</span>
        <Icon className="w-3.5 h-3.5" />
      </div>
      {item.image_key ? (
        <div className="flex gap-3 mt-2.5 flex-1 min-h-0">
          <img src={ASSETS[item.image_key]} alt="" draggable={false} className="w-20 h-full object-cover grayscale" />
          <div className="min-w-0">
            <div className="font-semibold text-[14px] leading-snug">{pick(item.title)}</div>
            <div className="text-[11px] text-[#8E95A2] mt-1">{pick(item.subtitle)}</div>
          </div>
        </div>
      ) : (
        <>
          <div className="font-semibold text-[15px] leading-snug mt-2.5">{pick(item.title)}</div>
          <div className={`text-[11px] mt-1 ${light ? "text-[#3c414b]" : "text-[#8E95A2]"}`}>{pick(item.subtitle)}</div>
          <div className="mt-auto space-y-1.5 opacity-40">
            {[92, 78, 64].map((w) => <div key={w} className={`h-px ${light ? "bg-black" : "bg-white"}`} style={{ width: `${w}%` }} />)}
          </div>
        </>
      )}
    </div>
  );
};

const SealedFace = ({ item }) => {
  const { t, pick } = useLang();
  return (
    <div className="w-full h-full border border-dashed border-[#C0C7D0]/30 bg-[#0E1014]/80 flex flex-col items-center justify-center text-center p-4 gap-2">
      <Lock className="w-5 h-5 text-[#8E95A2]" />
      <div className="font-display text-sm text-[#C0C7D0]">{t("sealed")}</div>
      <div className="text-[11px] text-[#8E95A2] leading-relaxed">{t("sealedBy", { q: pick(item.lockTitle) })}</div>
    </div>
  );
};

export const BoardCard = ({ item, pos, zoom, onMove, onTap, selected, highlight }) => {
  const drag = useRef(null);
  const [w, h] = cardSize(item.kind);

  const down = (e) => {
    if (e.button !== undefined && e.button !== 0) return;
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = { sx: e.clientX, sy: e.clientY, ox: pos.x, oy: pos.y, moved: false };
  };
  const move = (e) => {
    const d = drag.current;
    if (!d) return;
    const dx = (e.clientX - d.sx) / zoom;
    const dy = (e.clientY - d.sy) / zoom;
    if (!d.moved && Math.hypot(dx, dy) < 4) return;
    d.moved = true;
    onMove(item.id, { x: Math.max(0, d.ox + dx), y: Math.max(0, d.oy + dy) });
  };
  const up = () => {
    const d = drag.current;
    drag.current = null;
    if (d && !d.moved) onTap(item);
    else if (d) sfx("pin");
  };

  return (
    <div
      data-testid={`board-card-${item.id}`}
      data-tour={`card-${item.id}`}
      onPointerDown={down}
      onPointerMove={move}
      onPointerUp={up}
      onPointerCancel={() => (drag.current = null)}
      className={`absolute select-none touch-none cursor-grab active:cursor-grabbing transition-[box-shadow,filter] duration-200 hover:brightness-110 hover:z-20 ${selected ? "ring-2 ring-white shadow-[0_0_30px_rgba(240,244,248,.45)] z-30" : ""} ${highlight ? "shadow-[0_0_40px_rgba(169,184,204,.55)]" : ""}`}
      style={{ left: pos.x, top: pos.y, width: w, height: h, transform: `rotate(${item.rot || 0}deg)` }}
    >
      <div className="pin absolute -top-1.5 left-1/2 -translate-x-1/2 z-10" />
      {item.sealed ? <SealedFace item={item} /> : isPerson(item.kind) ? <PersonFace item={item} /> : <DocFace item={item} />}
      {item.isNew && (
        <span className="absolute -top-3 -end-3 z-10 flex items-center gap-1 bg-white text-black text-[10px] font-semibold px-2 py-1 rounded-full shadow-lg">
          <Sparkles className="w-3 h-3" /> NEW
        </span>
      )}
    </div>
  );
};

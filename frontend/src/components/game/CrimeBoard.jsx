import { useEffect, useRef } from "react";
import { BoardCard, cardSize } from "@/components/game/BoardCard";

const anchor = (item, p) => [p.x + cardSize(item.kind)[0] / 2, p.y + 6];

const Threads = ({ items, posOf, threads, onRemove, width, height }) => {
  const byId = Object.fromEntries(items.map((i) => [i.id, i]));
  return (
    <svg className="absolute inset-0 z-[15] pointer-events-none" width={width} height={height}>
      {threads.map(([a, b]) => {
        if (!byId[a] || !byId[b]) return null;
        const [x1, y1] = anchor(byId[a], posOf(byId[a]));
        const [x2, y2] = anchor(byId[b], posOf(byId[b]));
        const sag = Math.min(90, Math.hypot(x2 - x1, y2 - y1) * 0.12);
        const d = `M${x1},${y1} Q${(x1 + x2) / 2},${(y1 + y2) / 2 + sag} ${x2},${y2}`;
        return (
          <g key={`${a}-${b}`} className="pointer-events-auto cursor-pointer" onClick={() => onRemove(a, b)} data-testid={`thread-${a}-${b}`}>
            <path d={d} stroke="transparent" strokeWidth="16" fill="none" />
            <path d={d} className="thread-line" strokeWidth="1.6" fill="none" />
          </g>
        );
      })}
    </svg>
  );
};

export const CrimeBoard = ({ board, items, pos, setPos, threads, toggleThread, zoom, onTap, selectedId, highlightIds }) => {
  const scroller = useRef(null);
  const pan = useRef(null);
  const posOf = (item) => pos[item.id] || { x: item.x, y: item.y };

  useEffect(() => {
    const el = scroller.current;
    if (el) el.scrollLeft = (el.scrollWidth - el.clientWidth) / 2;
  }, []);

  const down = (e) => {
    if (e.pointerType !== "mouse") return;
    pan.current = { x: e.clientX, y: e.clientY, l: scroller.current.scrollLeft, t: scroller.current.scrollTop };
  };
  const move = (e) => {
    if (!pan.current) return;
    scroller.current.scrollLeft = pan.current.l - (e.clientX - pan.current.x);
    scroller.current.scrollTop = pan.current.t - (e.clientY - pan.current.y);
  };

  return (
    <div
      ref={scroller}
      data-testid="crime-board"
      data-tour="board"
      dir="ltr"
      onPointerDown={down}
      onPointerMove={move}
      onPointerUp={() => (pan.current = null)}
      onPointerLeave={() => (pan.current = null)}
      className="absolute inset-0 overflow-auto tu-scroll board-surface cursor-grab"
    >
      <div style={{ width: board.width * zoom, height: board.height * zoom }} className="relative">
        <div style={{ width: board.width, height: board.height, transform: `scale(${zoom})`, transformOrigin: "0 0" }} className="relative">
          <Threads items={items} posOf={posOf} threads={threads} onRemove={toggleThread} width={board.width} height={board.height} />
          {items.map((item) => (
            <BoardCard
              key={item.id}
              item={item}
              pos={posOf(item)}
              zoom={zoom}
              onMove={setPos}
              onTap={onTap}
              selected={selectedId === item.id}
              highlight={highlightIds?.includes(item.id)}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

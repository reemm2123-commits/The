const TIME_RE = /(\d{1,2}:\d{2})/;

const Inline = ({ text }) =>
  text.split(TIME_RE).map((part, i) =>
    i % 2 === 1
      ? <span key={i} dir="ltr" className="font-mono-tu text-white bg-white/[0.07] px-1 rounded-sm">{part}</span>
      : <span key={i}>{part}</span>
  );

export const RichText = ({ text = "" }) => {
  const blocks = [];
  text.split("\n").forEach((raw) => {
    const line = raw.trimEnd();
    const last = blocks[blocks.length - 1];
    if (!line.trim()) return blocks.push({ type: "gap" });
    if (line.startsWith("## ")) return blocks.push({ type: "h", text: line.slice(3) });
    if (line.startsWith("- ")) {
      if (last?.type === "ul") last.items.push(line.slice(2));
      else blocks.push({ type: "ul", items: [line.slice(2)] });
      return null;
    }
    if (line.startsWith("> ")) {
      if (last?.type === "q") last.lines.push(line.slice(2));
      else blocks.push({ type: "q", lines: [line.slice(2)] });
      return null;
    }
    return blocks.push({ type: "p", text: line });
  });

  return (
    <div className="space-y-3 text-[15px] leading-loose text-[#C0C7D0]">
      {blocks.map((b, i) => {
        if (b.type === "gap") return <div key={i} className="h-1" />;
        if (b.type === "h") return <h4 key={i} className="font-mono-tu text-[11px] tracking-[0.25em] uppercase text-[#A9B8CC] pt-3 border-b border-white/10 pb-1.5">{b.text}</h4>;
        if (b.type === "ul") return (
          <ul key={i} className="space-y-1.5">
            {b.items.map((it, j) => <li key={j} className="flex gap-3"><span className="mt-[0.85em] w-1.5 h-px bg-[#8E95A2] shrink-0" /><span><Inline text={it} /></span></li>)}
          </ul>
        );
        if (b.type === "q") return (
          <blockquote key={i} className="border-s-2 border-[#C0C7D0]/40 ps-4 italic text-[#E3E8EE] space-y-1">
            {b.lines.map((l, j) => <p key={j}><Inline text={l} /></p>)}
          </blockquote>
        );
        return <p key={i}><Inline text={b.text} /></p>;
      })}
    </div>
  );
};

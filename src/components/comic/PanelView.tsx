"use client";
import { useState, useRef, useCallback } from "react";

interface PanelData {
  dialog?: string;
  speaker?: string;
  nummer: number;
  bubble_type?: "speech" | "caption" | "shout" | "thought" | "whisper" | null;
}

interface PanelPosition {
  nummer: number;
  top: number;
  left: number;
  width: number;
  height: number;
}

interface PanelViewProps {
  imageUrl: string;
  title?: string;
  panels?: PanelData[];
  panelPositions?: PanelPosition[] | null;
  pageNumber?: number;
}

// ── Handdrawn SVG bubble border ───────────────────────────────────────────────
function HanddrawnBubble({
  w, h, type, children,
}: {
  w: number; h: number; type?: string | null; children: React.ReactNode;
}) {
  const pad = 10;
  // Generate slightly wobbly path points
  const jitter = (v: number, amt = 2) => v + (Math.random() - 0.5) * amt;

  const tl = { x: jitter(pad + 6), y: jitter(pad + 4) };
  const tr = { x: jitter(w - pad - 6), y: jitter(pad + 4) };
  const br = { x: jitter(w - pad - 6), y: jitter(h - pad - 4) };
  const bl = { x: jitter(pad + 6), y: jitter(h - pad - 4) };

  // Slightly curved sides using quadratic bezier
  const path = `
    M ${tl.x + 8} ${tl.y}
    Q ${jitter((tl.x + tr.x) / 2, 3)} ${jitter(tl.y - 2, 2)} ${tr.x - 8} ${tr.y}
    Q ${jitter(tr.x + 3, 2)} ${jitter(tr.y, 2)} ${tr.x} ${tr.y + 6}
    Q ${jitter(tr.x + 2, 2)} ${jitter((tr.y + br.y) / 2, 3)} ${br.x} ${br.y - 6}
    Q ${jitter(br.x + 2, 2)} ${jitter(br.y + 2, 2)} ${br.x - 8} ${br.y}
    Q ${jitter((br.x + bl.x) / 2, 3)} ${jitter(br.y + 3, 2)} ${bl.x + 8} ${bl.y}
    Q ${jitter(bl.x - 3, 2)} ${jitter(bl.y + 2, 2)} ${bl.x} ${bl.y - 6}
    Q ${jitter(bl.x - 2, 2)} ${jitter((bl.y + tl.y) / 2, 3)} ${tl.x} ${tl.y + 6}
    Q ${jitter(tl.x - 2, 2)} ${jitter(tl.y - 2, 2)} ${tl.x + 8} ${tl.y}
    Z
  `;

  const isCaption = type === "caption";
  const isThought = type === "thought";
  const fill = isCaption ? "rgba(30,15,50,0.88)" : "#FFFEF8";
  const stroke = isCaption ? "#6B3FA0" : "#1A1410";
  const strokeW = isThought ? "1.2" : "1.5";
  const dashArray = isThought ? "4 3" : undefined;

  return (
    <div className="relative" style={{ width: w, height: h }}>
      <svg
        width={w} height={h}
        style={{ position: "absolute", top: 0, left: 0, overflow: "visible", pointerEvents: "none" }}
      >
        <path
          d={path}
          fill={fill}
          stroke={stroke}
          strokeWidth={strokeW}
          strokeDasharray={dashArray}
          strokeLinejoin="round"
          strokeLinecap="round"
          style={{ filter: "drop-shadow(1px 2px 2px rgba(0,0,0,0.18))" }}
        />
        {/* Tail for speech bubbles */}
        {!isCaption && !isThought && (
          <path
            d={`M ${bl.x + 10} ${bl.y - 2} Q ${bl.x + 4} ${bl.y + 12} ${bl.x - 2} ${bl.y + 16} Q ${bl.x + 18} ${bl.y + 4} ${bl.x + 24} ${bl.y - 1} Z`}
            fill={fill}
            stroke={stroke}
            strokeWidth={strokeW}
            strokeLinejoin="round"
          />
        )}
        {/* Thought bubbles */}
        {isThought && (
          <>
            <circle cx={bl.x + 8} cy={bl.y + 8} r="3" fill={fill} stroke={stroke} strokeWidth="1" />
            <circle cx={bl.x + 4} cy={bl.y + 14} r="2" fill={fill} stroke={stroke} strokeWidth="1" />
          </>
        )}
      </svg>
      <div
        style={{
          position: "absolute",
          top: pad + 4,
          left: pad + 8,
          right: pad + 8,
          bottom: pad + 4,
          overflow: "hidden",
        }}
      >
        {children}
      </div>
    </div>
  );
}

// ── Resizable bubble wrapper ──────────────────────────────────────────────────
function ResizableBubble({
  children, initW, initH, style, onResize,
}: {
  children: (w: number, h: number) => React.ReactNode;
  initW: number; initH: number;
  style: React.CSSProperties;
  onResize?: (w: number, h: number) => void;
}) {
  const [size, setSize] = useState({ w: initW, h: initH });
  const resizing = useRef<{ dir: string; startX: number; startY: number; startW: number; startH: number } | null>(null);

  const onResizeMouseDown = useCallback((e: React.MouseEvent, dir: string) => {
    e.stopPropagation();
    e.preventDefault();
    resizing.current = { dir, startX: e.clientX, startY: e.clientY, startW: size.w, startH: size.h };

    const onMove = (ev: MouseEvent) => {
      if (!resizing.current) return;
      const dx = ev.clientX - resizing.current.startX;
      const dy = ev.clientY - resizing.current.startY;
      const { dir: d, startW, startH } = resizing.current;
      let newW = startW;
      let newH = startH;
      if (d.includes("e")) newW = Math.max(80, startW + dx);
      if (d.includes("s")) newH = Math.max(40, startH + dy);
      if (d.includes("w")) newW = Math.max(80, startW - dx);
      if (d.includes("n")) newH = Math.max(40, startH - dy);
      setSize({ w: newW, h: newH });
      onResize?.(newW, newH);
    };
    const onUp = () => {
      resizing.current = null;
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  }, [size, onResize]);

  const handleStyle = (cursor: string): React.CSSProperties => ({
    position: "absolute", width: 10, height: 10,
    background: "#C9963A", border: "1.5px solid white",
    borderRadius: 2, cursor, zIndex: 30,
  });

  return (
    <div style={{ ...style, position: "absolute", width: size.w, height: size.h }}>
      {children(size.w, size.h)}
      {/* Resize handles — only visible on hover via group */}
      <div className="opacity-0 group-hover:opacity-100 transition-opacity">
        <div style={{ ...handleStyle("nw-resize"), top: -5, left: -5 }} onMouseDown={(e) => onResizeMouseDown(e, "nw")} />
        <div style={{ ...handleStyle("ne-resize"), top: -5, right: -5 }} onMouseDown={(e) => onResizeMouseDown(e, "ne")} />
        <div style={{ ...handleStyle("se-resize"), bottom: -5, right: -5 }} onMouseDown={(e) => onResizeMouseDown(e, "se")} />
        <div style={{ ...handleStyle("sw-resize"), bottom: -5, left: -5 }} onMouseDown={(e) => onResizeMouseDown(e, "sw")} />
        <div style={{ ...handleStyle("e-resize"), top: "50%", right: -5, transform: "translateY(-50%)" }} onMouseDown={(e) => onResizeMouseDown(e, "e")} />
        <div style={{ ...handleStyle("s-resize"), bottom: -5, left: "50%", transform: "translateX(-50%)" }} onMouseDown={(e) => onResizeMouseDown(e, "s")} />
      </div>
    </div>
  );
}

// ── Fallback positions ────────────────────────────────────────────────────────
function getFallbackPosition(index: number, total: number): React.CSSProperties {
  const base: React.CSSProperties = { position: "absolute", zIndex: 10 };
  const h = 5;
  if (total <= 3) {
    const pos = [
      { top: `${h + 3}%`, left: "3%" },
      { top: `${h + 58}%`, left: "3%" },
      { top: `${h + 58}%`, right: "3%" },
    ];
    return { ...base, ...(pos[index] || pos[0]) };
  }
  if (total === 4) {
    const row = Math.floor(index / 2);
    const col = index % 2;
    const top = row === 0 ? `${h + 3}%` : `${h + 50}%`;
    const side = col === 0 ? { left: "3%" } : { right: "3%" };
    return { ...base, top, ...side };
  }
  const positions = [
    { top: `${h + 3}%`, left: "3%" },
    { top: `${h + 3}%`, right: "3%" },
    { top: `${h + 35}%`, left: "3%" },
    { top: `${h + 67}%`, left: "3%" },
    { top: `${h + 67}%`, right: "3%" },
  ];
  return { ...base, ...(positions[index] || positions[0]) };
}

function getDetectedPosition(panelIndex: number, positions: PanelPosition[]): React.CSSProperties {
  const pos = positions.find(p => p.nummer === panelIndex + 1) || positions[panelIndex];
  if (!pos) return { position: "absolute", top: "5%", left: "3%", zIndex: 10 };
  return {
    position: "absolute",
    top: `${pos.top + 2}%`,
    left: `${pos.left + 2}%`,
    zIndex: 10,
  };
}

// ── Compute initial bubble size from dialog length ────────────────────────────
function initBubbleSize(dialog: string, speaker: string): { w: number; h: number } {
  const text = (speaker ? speaker + ": " : "") + dialog;
  const chars = text.length;
  const w = Math.min(220, Math.max(100, 80 + chars * 3.2));
  const lines = Math.ceil(chars / 22);
  const h = Math.max(48, 28 + lines * 20);
  return { w, h };
}

// ── Main PanelView ────────────────────────────────────────────────────────────
export default function PanelView({ imageUrl, title, panels = [], panelPositions, pageNumber }: PanelViewProps) {
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editedDialogs, setEditedDialogs] = useState<Record<number, string>>({});
  const [dragPositions, setDragPositions] = useState<Record<number, { top: number; left: number }>>({});
  const [dragging, setDragging] = useState<number | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  const isValidDialog = (d?: string | null) =>
    d && d.trim().length > 0 && d.trim().toLowerCase() !== "null";

  const getDialog = (panel: PanelData, i: number) => {
    const edited = editedDialogs[i];
    if (edited !== undefined) return edited;
    return isValidDialog(panel.dialog) ? panel.dialog! : "";
  };

  const dialogPanels = panels
    .map((p, i) => ({ ...p, originalIndex: i }))
    .filter((p) => isValidDialog(p.dialog));

  const hasDetectedPositions = panelPositions && panelPositions.length > 0;

  const handleMouseDown = (e: React.MouseEvent, index: number) => {
    if (editingIndex !== null) return;
    e.preventDefault();
    setDragging(index);
    const rect = e.currentTarget.getBoundingClientRect();
    const containerRect = containerRef.current?.getBoundingClientRect();
    if (containerRect) {
      setDragOffset({ x: e.clientX - rect.left, y: e.clientY - rect.top });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (dragging === null || !containerRef.current) return;
    e.preventDefault();
    const containerRect = containerRef.current.getBoundingClientRect();
    const newLeft = ((e.clientX - containerRect.left - dragOffset.x) / containerRect.width) * 100;
    const newTop = ((e.clientY - containerRect.top - dragOffset.y) / containerRect.height) * 100;
    setDragPositions(prev => ({
      ...prev,
      [dragging]: { left: Math.max(0, Math.min(75, newLeft)), top: Math.max(0, Math.min(90, newTop)) },
    }));
  };

  const handleMouseUp = () => setDragging(null);

  const getFinalPosition = (panelIndex: number): React.CSSProperties => {
    const dragPos = dragPositions[panelIndex];
    if (dragPos) return { position: "absolute", top: `${dragPos.top}%`, left: `${dragPos.left}%`, zIndex: 10 };
    return hasDetectedPositions
      ? getDetectedPosition(panelIndex, panelPositions!)
      : getFallbackPosition(panelIndex, panels.length);
  };

  return (
    <div
      ref={containerRef}
      className="relative w-full bg-[#F5EDE0] rounded-xl overflow-hidden shadow-xl"
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      <div className="relative">
        {/* Page Title Overlay */}
        {title && (
          <div className="absolute top-0 left-0 right-0 z-20 bg-gradient-to-b from-black/60 to-transparent py-3 px-4">
            <h3 className="text-white text-lg font-serif font-semibold tracking-wide drop-shadow-lg"
              style={{ fontFamily: "'Playfair Display', serif" }}>
              {title}
            </h3>
          </div>
        )}

        {imageUrl ? (
          <img src={imageUrl} alt={title || "Comic page"} className="w-full h-auto block" />
        ) : (
          <div className="w-full aspect-[2/3] bg-gray-100 flex items-center justify-center">
            <p className="text-gray-400 text-sm">Kein Bild</p>
          </div>
        )}

        {dialogPanels.map((panel) => {
          const i = panel.originalIndex;
          const dialog = getDialog(panel, i);
          if (!dialog) return null;
          const isEditing = editingIndex === i;
          const posStyle = getFinalPosition(i);
          const isDragging = dragging === i;
          const { w: initW, h: initH } = initBubbleSize(dialog, panel.speaker || "");

          return (
            <div
              key={i}
              className="group"
              style={{ ...posStyle, cursor: isDragging ? "grabbing" : "grab" }}
              onMouseDown={(e) => handleMouseDown(e, i)}
            >
              <ResizableBubble initW={initW} initH={initH} style={{}}>
                {(w, h) => (
                  <HanddrawnBubble w={w} h={h} type={panel.bubble_type}>
                    {isEditing ? (
                      <textarea
                        autoFocus
                        value={dialog}
                        onChange={(e) => setEditedDialogs({ ...editedDialogs, [i]: e.target.value })}
                        onBlur={() => setEditingIndex(null)}
                        onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && setEditingIndex(null)}
                        className="w-full h-full bg-transparent outline-none resize-none text-[#1A1410]"
                        style={{ fontFamily: "'Comic Neue', cursive", fontSize: "12px" }}
                        onClick={(e) => e.stopPropagation()}
                      />
                    ) : (
                      <p
                        className="text-[#1A1410] leading-snug select-none"
                        style={{ fontFamily: "'Comic Neue', cursive", fontSize: "12px", fontWeight: 500 }}
                        onDoubleClick={(e) => { e.stopPropagation(); setEditingIndex(i); }}
                      >
                        {panel.speaker && panel.speaker !== "narrator" && panel.speaker.toLowerCase() !== "null" && (
                          <span className="font-bold">{panel.speaker}: </span>
                        )}
                        {dialog}
                      </p>
                    )}
                  </HanddrawnBubble>
                )}
              </ResizableBubble>
            </div>
          );
        })}
      </div>

      {pageNumber && (
        <div className="text-center py-1 text-xs text-gray-400">Seite {pageNumber}</div>
      )}
    </div>
  );
}

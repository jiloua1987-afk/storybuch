"use client";
import { useState, useRef, useCallback, useMemo } from "react";
import { resolveCollisions } from "./bubble-collision";

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
  pageId?: string; // NEW: To identify which page we're editing
  onPositionsChange?: (positions: PanelPosition[]) => void; // NEW: Callback to save positions
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

// ── Bubble slot system ────────────────────────────────────────────────────────
// Each panel gets its own "zone" in the image. Within that zone we pick
// a corner slot. Slots are tracked globally so no two bubbles share the
// same pixel area.

interface Slot {
  top: string;   // CSS percentage
  left?: string;
  right?: string;
}

// All available slots across the whole image (portrait 2:3 ratio)
// Ordered so we naturally spread across the page top→bottom, left↔right
const ALL_SLOTS: Slot[] = [
  { top: "5%",  left: "2%" },
  { top: "5%",  right: "2%" },
  { top: "27%", left: "2%" },
  { top: "27%", right: "2%" },
  { top: "49%", left: "2%" },
  { top: "49%", right: "2%" },
  { top: "71%", left: "2%" },
  { top: "71%", right: "2%" },
  { top: "88%", left: "2%" },
  { top: "88%", right: "2%" },
];

// For a given panel count, assign each panel a preferred slot index so
// bubbles are spread evenly and never start in the same corner.
function getPreferredSlotIndex(panelIndex: number, total: number): number {
  if (total <= 2) {
    // Panel 0 → top-left, Panel 1 → bottom-right
    return panelIndex === 0 ? 0 : 7;
  }
  if (total === 3) {
    return [0, 4, 7][panelIndex] ?? panelIndex * 2;
  }
  if (total === 4) {
    // 2×2 grid: TL, TR, BL, BR
    return [0, 1, 4, 5][panelIndex] ?? panelIndex;
  }
  if (total === 5) {
    return [0, 1, 4, 6, 7][panelIndex] ?? panelIndex;
  }
  // 6+ panels: spread evenly
  return Math.min(panelIndex, ALL_SLOTS.length - 1);
}

function getFallbackPosition(index: number, total: number): React.CSSProperties {
  const slotIdx = getPreferredSlotIndex(index, total);
  const slot = ALL_SLOTS[slotIdx] ?? ALL_SLOTS[index % ALL_SLOTS.length];
  return {
    position: "absolute",
    zIndex: 10,
    top: slot.top,
    ...(slot.left  ? { left:  slot.left  } : {}),
    ...(slot.right ? { right: slot.right } : {}),
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
export default function PanelView({ imageUrl, title, panels = [], panelPositions, pageNumber, pageId, onPositionsChange }: PanelViewProps) {
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editedDialogs, setEditedDialogs] = useState<Record<number, string>>({});
  const [hiddenBubbles, setHiddenBubbles] = useState<Set<number>>(new Set());
  const [extraBubbles, setExtraBubbles] = useState<Array<{ id: number; top: number; left: number; dialog: string; speaker: string }>>([]);
  const [editingExtra, setEditingExtra] = useState<number | null>(null);
  const [dragPositions, setDragPositions] = useState<Record<number, { top: number; left: number }>>({});
  const [dragging, setDragging] = useState<{ type: "panel" | "extra"; index: number } | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [addMode, setAddMode] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const nextExtraId = useRef(1000);

  const isValidDialog = (d?: string | null) =>
    d && d.trim().length > 0 && d.trim().toLowerCase() !== "null";

  const getDialog = (panel: PanelData, i: number) => {
    const edited = editedDialogs[i];
    if (edited !== undefined) return edited;
    return isValidDialog(panel.dialog) ? panel.dialog! : "";
  };

  const dialogPanels = panels
    .map((p, i) => ({ ...p, originalIndex: i }))
    .filter((p) => isValidDialog(p.dialog) && !hiddenBubbles.has(p.originalIndex ?? 0));

  const hasDetectedPositions = panelPositions && panelPositions.length > 0;

  const resolvedPositions = useMemo(() => {
    const initial = dialogPanels.map((panel) => {
      const i = panel.originalIndex;
      let top = 5;
      let left = 2;
      if (hasDetectedPositions) {
        const pos = panelPositions!.find(p => p.nummer === i + 1) || panelPositions![i];
        if (pos) { top = pos.top + 2; left = pos.left + 2; }
      } else {
        const style = getFallbackPosition(i, panels.length);
        top  = parseFloat(String(style.top  ?? "5%"));
        left = parseFloat(String(style.left ?? style.right ?? "2%"));
      }
      const text = (panel.speaker || "") + (panel.dialog || "");
      const wPx = Math.min(220, Math.max(100, 80 + text.length * 3.2));
      const lines = Math.ceil(text.length / 22);
      const hPx = Math.max(48, 28 + lines * 20);
      return { top, left, w: (wPx / 400) * 100, h: (hPx / 600) * 100 };
    });
    const resolved = resolveCollisions(initial);
    // Merge resolved positions with original w/h
    return resolved.map((pos, idx) => ({
      ...pos,
      w: initial[idx].w,
      h: initial[idx].h
    }));
  }, [dialogPanels.length, hasDetectedPositions, panels.length]); // eslint-disable-line

  const handleMouseDown = (e: React.MouseEvent, type: "panel" | "extra", index: number) => {
    if (editingIndex !== null || editingExtra !== null) return;
    e.preventDefault();
    setDragging({ type, index });
    const rect = e.currentTarget.getBoundingClientRect();
    setDragOffset({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!dragging || !containerRef.current) return;
    e.preventDefault();
    const containerRect = containerRef.current.getBoundingClientRect();
    const newLeft = ((e.clientX - containerRect.left - dragOffset.x) / containerRect.width) * 100;
    const newTop = ((e.clientY - containerRect.top - dragOffset.y) / containerRect.height) * 100;
    const clampedLeft = Math.max(0, Math.min(75, newLeft));
    const clampedTop = Math.max(0, Math.min(90, newTop));

    if (dragging.type === "panel") {
      setDragPositions(prev => ({ ...prev, [dragging.index]: { left: clampedLeft, top: clampedTop } }));
    } else {
      setExtraBubbles(prev => prev.map(b => b.id === dragging.index ? { ...b, left: clampedLeft, top: clampedTop } : b));
    }
  };

  const handleMouseUp = () => {
    // Save positions to store when drag ends
    if (dragging && dragging.type === "panel" && onPositionsChange) {
      console.log('[PanelView] Saving positions on mouseUp', { dragging, dragPositions });
      const updatedPositions: PanelPosition[] = dialogPanels.map((panel, bubbleIndex) => {
        const i = panel.originalIndex;
        const dragPos = dragPositions[i];
        const resolved = resolvedPositions[bubbleIndex];
        
        const position = {
          nummer: i + 1,
          top: dragPos?.top ?? resolved?.top ?? 5,
          left: dragPos?.left ?? resolved?.left ?? 2,
          width: resolved?.w ?? 20,
          height: resolved?.h ?? 10,
        };
        console.log(`[PanelView] Panel ${i}:`, { dragPos, resolved, position });
        return position;
      });
      console.log('[PanelView] Calling onPositionsChange with:', updatedPositions);
      onPositionsChange(updatedPositions);
    }
    setDragging(null);
  };

  // Click on image to add new bubble
  const handleImageClick = (e: React.MouseEvent) => {
    if (!addMode || !containerRef.current) return;
    e.stopPropagation();
    const containerRect = containerRef.current.getBoundingClientRect();
    const left = ((e.clientX - containerRect.left) / containerRect.width) * 100;
    const top = ((e.clientY - containerRect.top) / containerRect.height) * 100;
    const id = nextExtraId.current++;
    setExtraBubbles(prev => [...prev, { id, top: Math.max(2, top - 5), left: Math.max(2, left - 10), dialog: "Neuer Text", speaker: "" }]);
    setEditingExtra(id);
    setAddMode(false);
  };

  const getFinalPosition = (panelIndex: number, bubbleIndex: number): React.CSSProperties => {
    const dragPos = dragPositions[panelIndex];
    if (dragPos) return { position: "absolute", top: `${dragPos.top}%`, left: `${dragPos.left}%`, zIndex: 10 };
    const resolved = resolvedPositions[bubbleIndex];
    if (resolved) return { position: "absolute", top: `${resolved.top}%`, left: `${resolved.left}%`, zIndex: 10 };
    return getFallbackPosition(panelIndex, panels.length);
  };

  return (
    <div className="space-y-2">
      {/* Toolbar */}
      <div className="flex gap-2 px-1">
        <button
          onClick={() => setAddMode(a => !a)}
          className={`text-xs px-3 py-1.5 rounded-lg border transition-all ${addMode ? "bg-[#C9963A] text-white border-[#C9963A]" : "border-[#E8D9C0] text-[#8B7355] hover:bg-[#F5EDE0]"}`}
        >
          {addMode ? "Klick ins Bild zum Platzieren…" : "+ Sprechblase hinzufügen"}
        </button>
        {(hiddenBubbles.size > 0 || extraBubbles.length > 0) && (
          <button
            onClick={() => { setHiddenBubbles(new Set()); setExtraBubbles([]); setEditedDialogs({}); }}
            className="text-xs px-3 py-1.5 rounded-lg border border-[#E8D9C0] text-[#8B7355] hover:bg-[#F5EDE0] transition-all"
          >
            Alle zurücksetzen
          </button>
        )}
      </div>

      <div
        ref={containerRef}
        className={`relative w-full bg-[#F5EDE0] rounded-xl overflow-hidden shadow-xl ${addMode ? "cursor-crosshair" : ""}`}
        style={{ aspectRatio: "1024 / 1536" }}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onClick={handleImageClick}
      >
        <div className="relative w-full h-full">
          {imageUrl ? (
            <img src={imageUrl} alt={title || "Comic page"} className="w-full h-full object-cover block" />
          ) : (
            <div className="w-full h-full bg-gray-100 flex items-center justify-center">
              <p className="text-gray-400 text-sm">Kein Bild</p>
            </div>
          )}

          {/* Existing bubbles from panels */}
          {dialogPanels.map((panel, bubbleIndex) => {
            const i = panel.originalIndex;
            const dialog = getDialog(panel, i);
            if (!dialog) return null;
            const isEditing = editingIndex === i;
            const posStyle = getFinalPosition(i, bubbleIndex);
            const isDragging = dragging?.type === "panel" && dragging.index === i;
            const { w: initW, h: initH } = initBubbleSize(dialog, panel.speaker || "");

            return (
              <div
                key={i}
                className="group"
                style={{ ...posStyle, cursor: isDragging ? "grabbing" : "grab" }}
                onMouseDown={(e) => { e.stopPropagation(); handleMouseDown(e, "panel", i); }}
              >
                {/* Delete button — always visible, red circle with white × */}
                <button
                  className="absolute z-50 w-6 h-6 bg-red-500 hover:bg-red-600 text-white rounded-full text-sm font-bold flex items-center justify-center shadow-md transition-colors"
                  style={{ position: "absolute", top: -12, right: -12 }}
                  onMouseDown={(e) => e.stopPropagation()}
                  onClick={(e) => { e.stopPropagation(); setHiddenBubbles(prev => new Set([...prev, i])); }}
                >✕</button>
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

          {/* Extra bubbles added by user */}
          {extraBubbles.map((bubble) => {
            const isEditing = editingExtra === bubble.id;
            const { w: initW, h: initH } = initBubbleSize(bubble.dialog, bubble.speaker);
            return (
              <div
                key={bubble.id}
                className="group"
                style={{ position: "absolute", top: `${bubble.top}%`, left: `${bubble.left}%`, zIndex: 15, cursor: "grab" }}
                onMouseDown={(e) => { e.stopPropagation(); handleMouseDown(e, "extra", bubble.id); }}
              >
                {/* Delete button — always visible */}
                <button
                  className="absolute z-50 w-6 h-6 bg-red-500 hover:bg-red-600 text-white rounded-full text-sm font-bold flex items-center justify-center shadow-md transition-colors"
                  style={{ position: "absolute", top: -12, right: -12 }}
                  onMouseDown={(e) => e.stopPropagation()}
                  onClick={(e) => { e.stopPropagation(); setExtraBubbles(prev => prev.filter(b => b.id !== bubble.id)); }}
                >✕</button>
                <ResizableBubble initW={initW} initH={initH} style={{}}>
                  {(w, h) => (
                    <HanddrawnBubble w={w} h={h} type="speech">
                      {isEditing ? (
                        <div
                          className="flex flex-col gap-1 w-full h-full"
                          onMouseDown={(e) => e.stopPropagation()}
                        >
                          <input
                            autoFocus
                            value={bubble.speaker}
                            onChange={(e) => setExtraBubbles(prev => prev.map(b => b.id === bubble.id ? { ...b, speaker: e.target.value } : b))}
                            placeholder="Sprecher (optional)"
                            className="bg-transparent outline-none text-[#1A1410] border-b border-[#C9963A]/40 text-xs font-bold w-full"
                            style={{ fontFamily: "'Comic Neue', cursive", fontSize: "11px" }}
                            onClick={(e) => e.stopPropagation()}
                            onKeyDown={(e) => e.key === "Tab" && e.preventDefault()}
                          />
                          <textarea
                            value={bubble.dialog}
                            onChange={(e) => setExtraBubbles(prev => prev.map(b => b.id === bubble.id ? { ...b, dialog: e.target.value } : b))}
                            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && setEditingExtra(null)}
                            className="w-full flex-1 bg-transparent outline-none resize-none text-[#1A1410]"
                            style={{ fontFamily: "'Comic Neue', cursive", fontSize: "12px" }}
                            onClick={(e) => e.stopPropagation()}
                            placeholder="Text eingeben…"
                          />
                          <button
                            className="text-xs text-[#C9963A] font-semibold text-right"
                            onMouseDown={(e) => { e.stopPropagation(); setEditingExtra(null); }}
                          >Fertig ✓</button>
                        </div>
                      ) : (
                        <p
                          className="text-[#1A1410] leading-snug select-none"
                          style={{ fontFamily: "'Comic Neue', cursive", fontSize: "12px", fontWeight: 500 }}
                          onDoubleClick={(e) => { e.stopPropagation(); setEditingExtra(bubble.id); }}
                        >
                          {bubble.speaker && (
                            <span className="font-bold">{bubble.speaker}: </span>
                          )}
                          {bubble.dialog}
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
          <div className="absolute bottom-1 left-0 right-0 text-center text-xs text-white/60 pointer-events-none">Seite {pageNumber}</div>
        )}
      </div>
    </div>
  );
}


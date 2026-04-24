"use client";
import { useState } from "react";

interface PanelData {
  dialog?: string;
  speaker?: string;
  nummer: number;
  bubble_type?: "speech" | "caption" | "shout" | "thought" | "whisper" | null;
}

interface PanelViewProps {
  imageUrl: string;
  title?: string;
  panels?: PanelData[];
  pageNumber?: number;
}

// ── Bubble styles ────────────────────────────────────────────────────────────
function getBubbleStyle(type?: string | null) {
  switch (type) {
    case "shout":
      return { bg: "bg-[#FFFDE8] border-[2.5px] border-[#1A1410]", radius: "rounded-sm" };
    case "thought":
      return { bg: "bg-white/90 border-2 border-dashed border-[#555]", radius: "rounded-[18px]" };
    case "whisper":
      return { bg: "bg-white/70 border border-dashed border-[#888]", radius: "rounded-[14px]" };
    case "caption":
      return { bg: "bg-[#2d1b4e]/90 border-0", radius: "rounded-md" };
    default:
      return { bg: "bg-white border-2 border-[#1A1410]", radius: "rounded-[16px]" };
  }
}

// Position bubbles inside their respective panel areas
// Header takes ~6%, then panels split the remaining space
function getBubblePosition(index: number, total: number): React.CSSProperties {
  const base: React.CSSProperties = { position: "absolute", maxWidth: "40%", zIndex: 10 };
  const header = 6; // % for title bar

  if (total <= 3) {
    // 1 wide top (60%) + 2 bottom (40%)
    const pos = [
      { top: `${header + 2}%`, left: "2%" },
      { top: `${header + 38}%`, left: "2%" },
      { top: `${header + 38}%`, right: "2%" },
    ];
    return { ...base, ...(pos[index] || pos[0]) };
  }
  if (total === 4) {
    // 2x2 grid — each panel is ~47% wide, ~47% tall
    const halfH = 47;
    const pos = [
      { top: `${header + 2}%`, left: "2%" },
      { top: `${header + 2}%`, right: "2%" },
      { top: `${header + halfH + 2}%`, left: "2%" },
      { top: `${header + halfH + 2}%`, right: "2%" },
    ];
    return { ...base, ...(pos[index] || pos[0]) };
  }
  // 5 panels: 2 top, 1 wide middle, 2 bottom — each row ~31%
  const rowH = 31;
  const pos = [
    { top: `${header + 2}%`, left: "2%" },
    { top: `${header + 2}%`, right: "2%" },
    { top: `${header + rowH + 2}%`, left: "2%" },
    { top: `${header + rowH * 2 + 2}%`, left: "2%" },
    { top: `${header + rowH * 2 + 2}%`, right: "2%" },
  ];
  return { ...base, ...(pos[index] || pos[0]) };
}

export default function PanelView({ imageUrl, title, panels = [], pageNumber }: PanelViewProps) {
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editedDialogs, setEditedDialogs] = useState<Record<number, string>>({});

  const getDialog = (panel: PanelData, i: number) =>
    editedDialogs[i] !== undefined ? editedDialogs[i] : panel.dialog || "";

  return (
    <div className="relative w-full bg-[#F5EDE0] rounded-xl overflow-hidden shadow-xl">
      <div className="relative">
        {imageUrl ? (
          <img src={imageUrl} alt={title || "Comic page"} className="w-full h-auto block" />
        ) : (
          <div className="w-full aspect-[2/3] bg-gray-100 flex items-center justify-center">
            <p className="text-gray-400 text-sm">Kein Bild</p>
          </div>
        )}

        {/* Page title — overlay on cream header area */}
        {title && (
          <div className="absolute top-0 inset-x-0 py-2 text-center"
            style={{ background: "linear-gradient(to bottom, #F5EDE0 60%, transparent)" }}>
            <h3 className="text-[#1A1410] tracking-wider text-sm md:text-base uppercase"
              style={{ fontFamily: "'Bangers', cursive", letterSpacing: "0.12em" }}>
              {title}
            </h3>
          </div>
        )}

        {/* Speech Bubbles */}
        {panels.map((panel, i) => {
          const dialog = getDialog(panel, i);
          if (!dialog) return null;
          const isEditing = editingIndex === i;
          const posStyle = getBubblePosition(i, panels.length);
          const { bg, radius } = getBubbleStyle(panel.bubble_type);
          const isCaption = panel.bubble_type === "caption";
          const isThought = panel.bubble_type === "thought";
          const hasTail = !isCaption && !isThought && panel.bubble_type !== "whisper";

          return (
            <div key={i} style={posStyle} className="group">
              {isEditing ? (
                <textarea
                  autoFocus
                  value={dialog}
                  onChange={(e) => setEditedDialogs({ ...editedDialogs, [i]: e.target.value })}
                  onBlur={() => setEditingIndex(null)}
                  onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && setEditingIndex(null)}
                  className={`text-[#1A1410] bg-white border-2 border-[#1A1410] ${radius} p-2 resize-none w-full outline-none`}
                  rows={2}
                  style={{ fontFamily: "'Bangers', cursive", fontSize: "13px" }}
                />
              ) : (
                <div className="relative">
                  <div
                    onClick={() => setEditingIndex(i)}
                    className={`${bg} ${radius} px-3 py-1.5 cursor-pointer hover:scale-[1.03] transition-transform`}
                    style={{ boxShadow: isCaption ? "none" : "1px 2px 0px rgba(26,20,16,0.3)" }}
                  >
                    <p className={`${isCaption ? "text-white" : "text-[#1A1410]"} leading-snug`}
                      style={{ fontFamily: "'Bangers', cursive", fontSize: "13px", letterSpacing: "0.03em" }}>
                      {panel.speaker && panel.speaker !== "narrator" && (
                        <span className={`${isCaption ? "text-[#C9963A]" : "text-[#1A1410]"} font-bold`}>
                          {panel.speaker}:{" "}
                        </span>
                      )}
                      {dialog}
                    </p>
                  </div>

                  {/* Tail */}
                  {hasTail && (
                    <div className="absolute -bottom-[7px] left-5"
                      style={{
                        width: 0, height: 0,
                        borderLeft: "7px solid transparent",
                        borderRight: "7px solid transparent",
                        borderTop: panel.bubble_type === "shout"
                          ? "9px solid #FFFDE8"
                          : "9px solid white",
                      }}
                    />
                  )}

                  {/* Thought dots */}
                  {isThought && (
                    <div className="absolute -bottom-3 left-4 flex gap-1">
                      <div className="w-1.5 h-1.5 rounded-full bg-white/90 border border-[#555]" />
                      <div className="w-1 h-1 rounded-full bg-white/80 border border-[#555]" />
                    </div>
                  )}
                </div>
              )}
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

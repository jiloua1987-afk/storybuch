"use client";
import { useState } from "react";

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

function getBubbleStyle(type?: string | null) {
  switch (type) {
    case "shout":
      return { bg: "bg-[#FFFDE8] border-[2.5px] border-[#1A1410]", radius: "rounded-sm" };
    case "thought":
      return { bg: "bg-white/90 border-2 border-dashed border-[#555]", radius: "rounded-[18px]" };
    case "caption":
      return { bg: "bg-[#2d1b4e]/90", radius: "rounded-md" };
    default:
      return { bg: "bg-white border-2 border-[#1A1410]", radius: "rounded-[16px]" };
  }
}

// Fallback positions when GPT-4o Vision detection is not available
function getFallbackPosition(index: number, total: number): React.CSSProperties {
  const base: React.CSSProperties = { position: "absolute", maxWidth: "38%", zIndex: 10 };
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

// Use GPT-4o Vision detected positions — place bubble inside the detected panel area
function getDetectedPosition(panelIndex: number, positions: PanelPosition[]): React.CSSProperties {
  const pos = positions.find(p => p.nummer === panelIndex + 1) || positions[panelIndex];
  if (!pos) return { position: "absolute", top: "5%", left: "3%", maxWidth: "38%", zIndex: 10 };

  return {
    position: "absolute",
    top: `${pos.top + 2}%`,
    left: `${pos.left + 2}%`,
    maxWidth: `${Math.min(pos.width - 4, 40)}%`,
    zIndex: 10,
  };
}

export default function PanelView({ imageUrl, title, panels = [], panelPositions, pageNumber }: PanelViewProps) {
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editedDialogs, setEditedDialogs] = useState<Record<number, string>>({});

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

        {title && (
          <div className="absolute top-0 inset-x-0 py-1.5 text-center"
            style={{ background: "linear-gradient(to bottom, #F5EDE0 50%, transparent)" }}>
            <h3 className="text-[#1A1410] tracking-wider text-sm uppercase"
              style={{ fontFamily: "'Bangers', cursive", letterSpacing: "0.12em" }}>
              {title}
            </h3>
          </div>
        )}

        {dialogPanels.map((panel) => {
          const i = panel.originalIndex;
          const dialog = getDialog(panel, i);
          const isEditing = editingIndex === i;
          const posStyle = hasDetectedPositions
            ? getDetectedPosition(i, panelPositions!)
            : getFallbackPosition(i, panels.length);
          const { bg, radius } = getBubbleStyle(panel.bubble_type);
          const isCaption = panel.bubble_type === "caption";
          const hasTail = !isCaption && panel.bubble_type !== "thought" && panel.bubble_type !== "whisper";

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
                  style={{ fontFamily: "'Bangers', cursive", fontSize: "12px" }}
                />
              ) : (
                <div className="relative">
                  <div
                    onClick={() => setEditingIndex(i)}
                    className={`${bg} ${radius} px-2.5 py-1 cursor-pointer hover:scale-[1.03] transition-transform`}
                    style={{ boxShadow: isCaption ? "none" : "1px 2px 0px rgba(26,20,16,0.25)" }}
                  >
                    <p className={`${isCaption ? "text-white" : "text-[#1A1410]"} leading-snug`}
                      style={{ fontFamily: "'Bangers', cursive", fontSize: "12px", letterSpacing: "0.03em" }}>
                      {panel.speaker && panel.speaker !== "narrator" && panel.speaker.toLowerCase() !== "null" && (
                        <span className="font-bold">{panel.speaker}: </span>
                      )}
                      {dialog}
                    </p>
                  </div>
                  {hasTail && (
                    <div className="absolute -bottom-[6px] left-4"
                      style={{
                        width: 0, height: 0,
                        borderLeft: "6px solid transparent",
                        borderRight: "6px solid transparent",
                        borderTop: panel.bubble_type === "shout" ? "8px solid #FFFDE8" : "8px solid white",
                      }}
                    />
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

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

// ── Bubble shape styles per type ─────────────────────────────────────────────
function getBubbleClasses(type?: string | null): string {
  switch (type) {
    case "shout":
      return "bg-yellow-50/95 border-[3px] border-[#1A1410] px-3 py-2";
    case "thought":
      return "bg-white/90 border-2 border-dashed border-[#1A1410] px-3 py-2";
    case "whisper":
      return "bg-white/75 border border-dashed border-[#666] px-3 py-2";
    case "caption":
      return "bg-[#1A1410]/85 px-3 py-2";
    default: // speech
      return "bg-white/95 border-2 border-[#1A1410] px-3 py-2";
  }
}

function getBubbleRadius(type?: string | null): string {
  switch (type) {
    case "shout": return "rounded-sm"; // sharp edges for shout
    case "thought": return "rounded-[20px]"; // very round for thought
    case "caption": return "rounded-md";
    default: return "rounded-[14px]"; // speech bubble round
  }
}

function getTextColor(type?: string | null): string {
  return type === "caption" ? "text-white" : "text-[#1A1410]";
}

function getSpeakerColor(type?: string | null): string {
  return type === "caption" ? "text-yellow-300" : "text-purple-700";
}

export default function PanelView({ imageUrl, title, panels = [], pageNumber }: PanelViewProps) {
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editedDialogs, setEditedDialogs] = useState<Record<number, string>>({});

  const getDialog = (panel: PanelData, i: number) =>
    editedDialogs[i] !== undefined ? editedDialogs[i] : panel.dialog || "";

  // Position bubbles based on panel count and index
  function getBubblePosition(index: number, total: number): React.CSSProperties {
    const base: React.CSSProperties = { position: "absolute", maxWidth: "42%", zIndex: 10 };

    if (total <= 3) {
      const pos = [
        { top: "4%", left: "3%" },
        { bottom: "28%", left: "3%" },
        { bottom: "4%", right: "3%" },
      ];
      return { ...base, ...pos[index] };
    }
    if (total === 4) {
      const pos = [
        { top: "4%", left: "3%" },
        { top: "4%", right: "3%" },
        { top: "52%", left: "3%" },
        { top: "52%", right: "3%" },
      ];
      return { ...base, ...pos[index] };
    }
    const pos = [
      { top: "3%", left: "3%" },
      { top: "3%", right: "3%" },
      { top: "36%", left: "3%" },
      { top: "68%", left: "3%" },
      { top: "68%", right: "3%" },
      { top: "36%", right: "3%" },
    ];
    return { ...base, ...(pos[index] || pos[0]) };
  }

  return (
    <div className="relative w-full bg-[#F5EDE0] rounded-xl overflow-hidden shadow-xl">
      {/* Image + dialog overlays */}
      <div className="relative">
        {imageUrl ? (
          <img src={imageUrl} alt={title || "Comic page"} className="w-full h-auto block" />
        ) : (
          <div className="w-full aspect-[2/3] bg-gray-100 flex items-center justify-center">
            <p className="text-gray-400 text-sm">Kein Bild</p>
          </div>
        )}

        {/* Page title overlay — top of image */}
        {title && (
          <div className="absolute top-0 inset-x-0 bg-[#F5EDE0]/90 py-2 text-center border-b-2 border-[#1A1410]">
            <h3
              className="font-black text-[#1A1410] tracking-wider text-base md:text-lg uppercase"
              style={{ fontFamily: "'Bangers', cursive", letterSpacing: "0.1em" }}
            >
              {title}
            </h3>
          </div>
        )}

        {/* Comic Speech Bubble Overlays */}
        {panels.map((panel, i) => {
          const dialog = getDialog(panel, i);
          if (!dialog) return null;
          const isEditing = editingIndex === i;
          const posStyle = getBubblePosition(i, panels.length);
          const bubbleType = panel.bubble_type;
          const bubbleClasses = getBubbleClasses(bubbleType);
          const radiusClass = getBubbleRadius(bubbleType);
          const textColor = getTextColor(bubbleType);
          const speakerColor = getSpeakerColor(bubbleType);

          return (
            <div key={i} style={posStyle} className="group">
              {isEditing ? (
                <textarea
                  autoFocus
                  value={dialog}
                  onChange={(e) => setEditedDialogs({ ...editedDialogs, [i]: e.target.value })}
                  onBlur={() => setEditingIndex(null)}
                  onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && setEditingIndex(null)}
                  className={`text-xs font-bold text-[#1A1410] bg-white border-2 border-[#1A1410] ${radiusClass} p-2 resize-none w-full outline-none`}
                  rows={2}
                  style={{ fontFamily: "'Bangers', cursive", fontSize: "13px" }}
                />
              ) : (
                <div className="relative">
                  {/* Bubble body */}
                  <div
                    onClick={() => setEditingIndex(i)}
                    className={`${bubbleClasses} ${radiusClass} cursor-pointer hover:scale-105 transition-transform`}
                    style={{
                      boxShadow: bubbleType === "caption" ? "none" : "2px 3px 0px rgba(26,20,16,0.4)",
                    }}
                  >
                    <p
                      className={`${textColor} leading-snug`}
                      style={{
                        fontFamily: "'Bangers', cursive",
                        fontSize: "13px",
                        letterSpacing: "0.04em",
                      }}
                    >
                      {panel.speaker && panel.speaker !== "narrator" && (
                        <span className={`${speakerColor} font-bold`}>{panel.speaker}: </span>
                      )}
                      {dialog}
                    </p>
                  </div>

                  {/* Tail (speech + shout only) */}
                  {(bubbleType === "speech" || !bubbleType || bubbleType === "shout") && (
                    <div
                      className="absolute -bottom-2 left-4"
                      style={{
                        width: 0,
                        height: 0,
                        borderLeft: "8px solid transparent",
                        borderRight: "8px solid transparent",
                        borderTop: bubbleType === "shout"
                          ? "10px solid rgba(254,252,232,0.95)"
                          : "10px solid rgba(255,255,255,0.95)",
                        filter: "drop-shadow(1px 2px 0px rgba(26,20,16,0.3))",
                      }}
                    />
                  )}

                  {/* Thought dots */}
                  {bubbleType === "thought" && (
                    <div className="absolute -bottom-3 left-5 flex gap-1">
                      <div className="w-2 h-2 rounded-full bg-white/90 border border-[#1A1410]" />
                      <div className="w-1.5 h-1.5 rounded-full bg-white/80 border border-[#1A1410]" />
                    </div>
                  )}

                  {/* Edit hint on hover */}
                  <div className="absolute -top-5 left-0 opacity-0 group-hover:opacity-100 transition-opacity">
                    <span className="text-[10px] bg-purple-600 text-white px-1.5 py-0.5 rounded">✏️ edit</span>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Page number */}
      {pageNumber && (
        <div className="text-center py-1 text-xs text-gray-400">Seite {pageNumber}</div>
      )}
    </div>
  );
}

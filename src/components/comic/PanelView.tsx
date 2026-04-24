"use client";
import { useState } from "react";

interface PanelViewProps {
  imageUrl: string;
  title?: string;
  panels?: { dialog?: string; speaker?: string; nummer: number }[];
  pageNumber?: number;
}

export default function PanelView({ imageUrl, title, panels = [], pageNumber }: PanelViewProps) {
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editedDialogs, setEditedDialogs] = useState<Record<number, string>>({});

  const getDialog = (panel: any, i: number) =>
    editedDialogs[i] !== undefined ? editedDialogs[i] : panel.dialog || "";

  // Position bubbles based on panel count and index to avoid overlap
  function getBubbleStyle(index: number, total: number): React.CSSProperties {
    const base: React.CSSProperties = {
      position: "absolute",
      maxWidth: "44%",
      zIndex: 10,
    };

    if (total <= 3) {
      // 1 wide top + 2 bottom → distribute vertically
      const positions = [
        { top: "4%", left: "3%" },
        { bottom: "28%", left: "3%" },
        { bottom: "4%", right: "3%" },
      ];
      return { ...base, ...positions[index] };
    }

    if (total === 4) {
      // 2x2 grid
      const positions = [
        { top: "4%", left: "3%" },
        { top: "4%", right: "3%" },
        { top: "52%", left: "3%" },
        { top: "52%", right: "3%" },
      ];
      return { ...base, ...positions[index] };
    }

    // 5+ panels: stagger positions
    const positions = [
      { top: "3%", left: "3%" },
      { top: "3%", right: "3%" },
      { top: "36%", left: "3%" },
      { top: "68%", left: "3%" },
      { top: "68%", right: "3%" },
      { top: "36%", right: "3%" },
    ];
    return { ...base, ...(positions[index] || positions[0]) };
  }

  return (
    <div className="relative w-full bg-[#F5EDE0] rounded-xl overflow-hidden shadow-xl">
      {/* Page title */}
      {title && (
        <div className="px-4 py-3 text-center border-b-2 border-[#1A1410]">
          <h3
            className="font-black text-[#1A1410] tracking-wider text-lg uppercase"
            style={{ fontFamily: "'Bangers', 'Arial Black', sans-serif", letterSpacing: "0.1em" }}
          >
            {title}
          </h3>
        </div>
      )}

      {/* Image + dialog overlays */}
      <div className="relative">
        {imageUrl ? (
          <img src={imageUrl} alt={title || "Comic page"} className="w-full h-auto block" />
        ) : (
          <div className="w-full aspect-[2/3] bg-gray-100 flex items-center justify-center">
            <p className="text-gray-400 text-sm">Kein Bild</p>
          </div>
        )}

        {/* CSS Speech Bubble Overlays */}
        {panels.map((panel, i) => {
          const dialog = getDialog(panel, i);
          if (!dialog) return null;
          const isEditing = editingIndex === i;
          const posStyle = getBubbleStyle(i, panels.length);

          return (
            <div key={i} style={posStyle}>
              {isEditing ? (
                <textarea
                  autoFocus
                  value={dialog}
                  onChange={(e) => setEditedDialogs({ ...editedDialogs, [i]: e.target.value })}
                  onBlur={() => setEditingIndex(null)}
                  className="text-xs font-bold text-[#1A1410] bg-white border-2 border-[#1A1410] rounded p-1.5 resize-none w-full"
                  rows={2}
                  style={{ fontFamily: "'Bangers', 'Arial Black', sans-serif", fontSize: "12px" }}
                />
              ) : (
                <div
                  onClick={() => setEditingIndex(i)}
                  className="bg-white/95 border-2 border-[#1A1410] rounded-lg px-2.5 py-1.5 cursor-pointer hover:bg-yellow-50 transition-colors"
                  style={{ boxShadow: "2px 2px 0px #1A1410" }}
                >
                  <p
                    className="text-[#1A1410] leading-tight"
                    style={{
                      fontFamily: "'Bangers', 'Arial Black', sans-serif",
                      fontSize: "12px",
                      letterSpacing: "0.04em",
                    }}
                  >
                    {panel.speaker && (
                      <span className="text-purple-700 font-bold">{panel.speaker}: </span>
                    )}
                    {dialog}
                  </p>
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

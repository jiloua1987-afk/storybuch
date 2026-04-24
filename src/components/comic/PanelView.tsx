"use client";
import { useState } from "react";

interface Dialog {
  speaker?: string;
  text: string;
  position?: "top-left" | "top-right" | "bottom-left" | "bottom-right";
  bubble_type?: "speech" | "caption" | "shout" | "thought";
}

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

  const positions = ["top-left", "top-right", "bottom-left", "bottom-right", "top-left", "top-right"];

  return (
    <div className="relative w-full bg-[#F5EDE0] rounded-xl overflow-hidden shadow-xl">
      {/* Seitentitel */}
      {title && (
        <div className="px-4 py-3 text-center border-b-2 border-[#1A1410]">
          <h3 className="font-black text-[#1A1410] tracking-wider text-lg uppercase"
            style={{ fontFamily: "'Bangers', 'Arial Black', sans-serif", letterSpacing: "0.1em" }}>
            {title}
          </h3>
        </div>
      )}

      {/* Bild */}
      <div className="relative">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={title || "Comic page"}
            className="w-full h-auto block"
          />
        ) : (
          <div className="w-full aspect-[3/4] bg-gray-100 flex items-center justify-center">
            <p className="text-gray-400 text-sm">Kein Bild</p>
          </div>
        )}

        {/* CSS Dialog-Overlays */}
        {panels.map((panel, i) => {
          const dialog = getDialog(panel, i);
          if (!dialog) return null;
          const pos = (positions[i] || "top-left") as string;
          const isEditing = editingIndex === i;

          const posStyle: React.CSSProperties = {
            position: "absolute",
            maxWidth: "42%",
            zIndex: 10,
          };
          if (pos.includes("top")) posStyle.top = `${8 + Math.floor(i / 2) * 50}%`;
          else posStyle.bottom = "8%";
          if (pos.includes("left")) posStyle.left = "3%";
          else posStyle.right = "3%";

          return (
            <div key={i} style={posStyle}>
              {isEditing ? (
                <textarea
                  autoFocus
                  value={dialog}
                  onChange={(e) => setEditedDialogs({ ...editedDialogs, [i]: e.target.value })}
                  onBlur={() => setEditingIndex(null)}
                  className="text-xs font-bold text-[#1A1410] bg-white border-2 border-[#1A1410] rounded p-1 resize-none w-full"
                  rows={2}
                  style={{ fontFamily: "'Bangers', 'Arial Black', sans-serif", fontSize: "11px" }}
                />
              ) : (
                <div
                  onClick={() => setEditingIndex(i)}
                  className="bg-white border-2 border-[#1A1410] rounded px-2 py-1 cursor-pointer hover:bg-yellow-50 transition-colors"
                  style={{ boxShadow: "2px 2px 0px #1A1410" }}
                >
                  <p className="text-[#1A1410] leading-tight"
                    style={{ fontFamily: "'Bangers', 'Arial Black', sans-serif", fontSize: "11px", letterSpacing: "0.03em" }}>
                    {panel.speaker && <span className="text-purple-700">{panel.speaker}: </span>}
                    {dialog}
                  </p>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Seitenzahl */}
      {pageNumber && (
        <div className="text-center py-1 text-xs text-gray-400">
          Seite {pageNumber}
        </div>
      )}
    </div>
  );
}

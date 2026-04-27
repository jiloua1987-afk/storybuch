"use client";
import { useState, useRef } from "react";

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
      return { 
        bg: "bg-[#FFFDE8] border border-[#1A1410]", 
        radius: "rounded-sm",
        filter: "drop-shadow(2px 2px 0px rgba(26,20,16,0.3))"
      };
    case "thought":
      return { 
        bg: "bg-white/95 border border-dashed border-[#333]", 
        radius: "rounded-[20px]",
        filter: "drop-shadow(1px 2px 0px rgba(0,0,0,0.15))"
      };
    case "caption":
      return { 
        bg: "bg-[#2d1b4e]/90", 
        radius: "rounded-md",
        filter: "none"
      };
    default:
      return { 
        bg: "bg-[#FFFEF8] border border-[#1A1410]", 
        radius: "rounded-[12px]",
        filter: "drop-shadow(2px 2px 0px rgba(26,20,16,0.25))"
      };
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

  // Drag & Drop Functions
  const handleMouseDown = (e: React.MouseEvent, index: number) => {
    if (editingIndex !== null) return;
    e.preventDefault();
    setDragging(index);
    const rect = e.currentTarget.getBoundingClientRect();
    const containerRect = containerRef.current?.getBoundingClientRect();
    if (containerRect) {
      setDragOffset({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      });
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
      [dragging]: {
        left: Math.max(0, Math.min(70, newLeft)),
        top: Math.max(0, Math.min(90, newTop))
      }
    }));
  };

  const handleMouseUp = () => {
    setDragging(null);
  };

  const getFinalPosition = (panelIndex: number): React.CSSProperties => {
    const dragPos = dragPositions[panelIndex];
    if (dragPos) {
      return {
        position: "absolute",
        top: `${dragPos.top}%`,
        left: `${dragPos.left}%`,
        maxWidth: "38%",
        zIndex: 10,
      };
    }
    
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
          const isEditing = editingIndex === i;
          const posStyle = getFinalPosition(i);
          const { bg, radius, filter } = getBubbleStyle(panel.bubble_type);
          const isCaption = panel.bubble_type === "caption";
          const hasTail = !isCaption && panel.bubble_type !== "thought" && panel.bubble_type !== "whisper";
          const isDragging = dragging === i;

          return (
            <div 
              key={i} 
              style={posStyle} 
              className={`group ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
              onMouseDown={(e) => handleMouseDown(e, i)}
            >
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
                    className={`${bg} px-3 py-2 cursor-pointer hover:scale-[1.02] transition-transform ${isDragging ? 'scale-105 shadow-lg' : ''}`}
                    style={{ 
                      filter,
                      minWidth: dialog.length < 20 ? "90px" : dialog.length < 40 ? "140px" : "180px",
                      maxWidth: "220px",
                      borderRadius: `${11 + Math.random() * 3}px ${13 + Math.random() * 3}px ${12 + Math.random() * 2}px ${14 + Math.random() * 2}px`,
                    }}
                  >
                    <p className={`${isCaption ? "text-white" : "text-[#1A1410]"} leading-snug`}
                      style={{ 
                        fontFamily: "'Comic Neue', 'Bangers', cursive", 
                        fontSize: "13px", 
                        letterSpacing: "0.02em",
                        fontWeight: "500"
                      }}>
                      {panel.speaker && panel.speaker !== "narrator" && panel.speaker.toLowerCase() !== "null" && (
                        <span className="font-bold">{panel.speaker}: </span>
                      )}
                      {dialog}
                    </p>
                  </div>
                  {hasTail && (
                    <div className="absolute -bottom-[8px] left-5"
                      style={{
                        width: 0, height: 0,
                        borderLeft: "8px solid transparent",
                        borderRight: "6px solid transparent",
                        borderTop: panel.bubble_type === "shout" ? "10px solid #FFFDE8" : "10px solid #FFFEF8",
                        filter: "drop-shadow(1px 1px 0px rgba(26,20,16,0.3))"
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

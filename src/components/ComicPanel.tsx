"use client";

interface Dialog {
  speaker?: string;
  dialog?: string;
  position?: string;
}

interface ComicPanelProps {
  imageUrl: string;
  title: string;
  panels?: Dialog[];
}

export default function ComicPanel({ imageUrl, title, panels = [] }: ComicPanelProps) {
  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bangers&display=swap');
        .comic-caption {
          position: absolute;
          background: rgba(255,254,248,0.95);
          border: 2px solid #1a1410;
          border-radius: 6px;
          padding: 6px 10px;
          font-family: 'Bangers', cursive;
          font-size: 14px;
          color: #1a1410;
          max-width: 45%;
          line-height: 1.3;
          letter-spacing: 0.5px;
          z-index: 10;
        }
        .caption-top-left { top: 10px; left: 10px; }
        .caption-top-right { top: 10px; right: 10px; }
        .caption-bottom-left { bottom: 10px; left: 10px; }
        .caption-bottom-right { bottom: 10px; right: 10px; }
        .comic-title {
          font-family: 'Bangers', cursive;
          font-size: 22px;
          letter-spacing: 2px;
          color: #1a1410;
          text-align: center;
          padding: 8px 0 4px;
          background: #F5EDE0;
        }
      `}</style>

      <div style={{ background: "#F5EDE0" }}>
        <div className="comic-title">{title.toUpperCase()}</div>
        <div style={{ position: "relative" }}>
          {imageUrl ? (
            <img src={imageUrl} alt={title} style={{ width: "100%", display: "block" }} />
          ) : (
            <div style={{ width: "100%", aspectRatio: "1024/1536", background: "#e8d9c0" }} />
          )}
          {panels.slice(0, 4).map((p, i) => {
            if (!p.dialog) return null;
            const text = p.speaker ? `${p.speaker}: ${p.dialog}` : p.dialog;
            const posClass = ["caption-top-left", "caption-top-right", "caption-bottom-left", "caption-bottom-right"][i] || "caption-top-left";
            return (
              <div key={i} className={`comic-caption ${posClass}`}>
                {text}
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}

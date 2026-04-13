"use client";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useBookStore } from "@/store/bookStore";
import Button from "@/components/ui/Button";
import toast from "react-hot-toast";

// Bangers Font für Comic-Look
const BANGERS_STYLE = `
  @import url('https://fonts.googleapis.com/css2?family=Bangers&display=swap');
  .comic-caption {
    font-family: 'Bangers', cursive;
    font-size: 13px;
    letter-spacing: 0.5px;
    line-height: 1.3;
    color: #1a1410;
    background: rgba(255,254,248,0.96);
    border: 1.5px solid #1a1410;
    border-radius: 5px;
    padding: 5px 8px;
    max-width: 45%;
    position: absolute;
  }
`;

interface Panel {
  nummer: number;
  dialog?: string;
  speaker?: string;
  bubble_type?: string;
}

function ComicPageView({ imageUrl, panels, title }: { imageUrl: string; panels: Panel[]; title: string }) {
  return (
    <div className="relative w-full">
      <style>{BANGERS_STYLE}</style>

      {/* Seitentitel */}
      <div className="bg-[#F5EDE0] text-center py-3 border-b-2 border-[#1a1410]">
        <span style={{ fontFamily: "'Bangers', cursive", fontSize: "22px", letterSpacing: "2px", color: "#1a1410" }}>
          {title.toUpperCase()}
        </span>
      </div>

      {/* Bild */}
      <div className="relative">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={title}
            className="w-full h-auto block"
          />
        ) : (
          <div className="w-full bg-[#F5EDE0] flex items-center justify-center" style={{ aspectRatio: "1024/1536" }}>
            <p className="text-gray-400">Kein Bild</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default function Step5Preview() {
  const { project, setStep, updateChapter } = useBookStore();
  const [currentPage, setCurrentPage] = useState(-1);
  const [direction, setDirection] = useState(1);
  const [regenerating, setRegenerating] = useState<string | null>(null);

  if (!project) return null;

  const pages = project.chapters;
  const total = pages.length;
  const isCover = currentPage === -1;
  const page = isCover ? null : pages[currentPage];

  const goNext = () => { if (currentPage < total - 1) { setDirection(1); setCurrentPage(p => p + 1); } };
  const goPrev = () => { if (currentPage > -1) { setDirection(-1); setCurrentPage(p => p - 1); } };

  const handleRegen = async (pageId: string) => {
    setRegenerating(pageId);
    await new Promise(r => setTimeout(r, 2000));
    updateChapter(pageId, { imageUrl: `https://picsum.photos/seed/${Date.now()}/1024/1536` });
    setRegenerating(null);
    toast.success("Seite neu erstellt!");
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-3xl mx-auto space-y-6">
      <style>{BANGERS_STYLE}</style>

      <div className="text-center space-y-1">
        <h2 className="font-display text-3xl font-semibold text-[#1f1a2e]">{project.title}</h2>
        <p className="text-gray-400 text-sm">{isCover ? "Cover" : `Seite ${currentPage + 1} von ${total}`}</p>
      </div>

      {/* Viewer */}
      <div className="relative">
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={currentPage}
            custom={direction}
            initial={{ opacity: 0, x: direction * 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: direction * -40 }}
            transition={{ duration: 0.35 }}
            className="bg-white rounded-2xl overflow-hidden shadow-xl border border-gray-100"
          >
            {isCover ? (
              <div className="relative w-full max-w-sm mx-auto" style={{ aspectRatio: "1024/1536" }}>
                {project.coverImageUrl ? (
                  <img src={project.coverImageUrl} alt="Cover" className="w-full h-full object-cover" />
                ) : (
                  <div className="absolute inset-0 bg-gradient-to-b from-purple-600 to-purple-900 flex items-end p-8">
                    <h1 className="font-display text-4xl font-bold text-white">{project.title}</h1>
                  </div>
                )}
              </div>
            ) : page ? (
              <div>
                {regenerating === page.id ? (
                  <div className="w-full bg-purple-50 flex flex-col items-center justify-center gap-3 py-20">
                    <div className="text-4xl animate-pulse">🎨</div>
                    <p className="text-purple-600 font-medium text-sm">Seite wird neu illustriert…</p>
                  </div>
                ) : (
                  <ComicPageView
                    imageUrl={page.imageUrl || ""}
                    panels={(page as any).panels || []}
                    title={page.title}
                  />
                )}
                <div className="px-6 py-3 flex items-center justify-between border-t border-gray-100">
                  <h3 className="font-semibold text-[#1f1a2e] text-sm">{page.title}</h3>
                  <button
                    onClick={() => handleRegen(page.id)}
                    disabled={!!regenerating}
                    className="text-xs text-purple-500 hover:text-purple-700 border border-purple-200 px-3 py-1.5 rounded-lg hover:bg-purple-50 transition-all disabled:opacity-40"
                  >
                    Neu illustrieren
                  </button>
                </div>
              </div>
            ) : null}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <Button variant="secondary" onClick={goPrev} disabled={currentPage === -1} size="sm">← Vorherige</Button>
        <div className="flex gap-2 items-center">
          <button onClick={() => setCurrentPage(-1)} className={`rounded-full transition-all ${currentPage === -1 ? "w-6 h-2.5 bg-purple-500" : "w-2.5 h-2.5 bg-purple-200"}`} />
          {pages.map((_, i) => (
            <button key={i} onClick={() => setCurrentPage(i)} className={`rounded-full transition-all ${i === currentPage ? "w-6 h-2.5 bg-purple-500" : "w-2.5 h-2.5 bg-purple-200"}`} />
          ))}
        </div>
        <Button variant="secondary" onClick={goNext} disabled={currentPage === total - 1} size="sm">Nächste →</Button>
      </div>

      {/* Thumbnails */}
      <div className="bg-purple-50 rounded-2xl p-4 space-y-3">
        <h3 className="text-sm font-semibold text-[#1f1a2e]">Alle Seiten</h3>
        <div className="grid grid-cols-5 gap-3">
          <button onClick={() => setCurrentPage(-1)}
            className={`relative rounded-xl overflow-hidden border-2 transition-all ${currentPage === -1 ? "border-purple-500 shadow-md" : "border-transparent hover:border-purple-200"}`}
            style={{ aspectRatio: "2/3" }}>
            {project.coverImageUrl ? (
              <img src={project.coverImageUrl} alt="Cover" className="w-full h-full object-cover" />
            ) : (
              <div className="absolute inset-0 bg-gradient-to-b from-purple-400 to-purple-700 flex items-center justify-center">
                <span className="text-white text-xs font-bold">Cover</span>
              </div>
            )}
          </button>
          {pages.map((p, i) => (
            <button key={p.id} onClick={() => setCurrentPage(i)}
              className={`relative rounded-xl overflow-hidden border-2 transition-all ${i === currentPage ? "border-purple-500 shadow-md" : "border-transparent hover:border-purple-200"}`}
              style={{ aspectRatio: "2/3" }}>
              {p.imageUrl ? (
                <img src={p.imageUrl} alt={p.title} className="w-full h-full object-cover" />
              ) : (
                <div className="absolute inset-0 bg-gray-100 flex items-center justify-center">
                  <span className="text-gray-400 text-xs">{i + 1}</span>
                </div>
              )}
              <div className="absolute bottom-0 inset-x-0 bg-black/50 px-1.5 py-1">
                <p className="text-white text-xs truncate">{p.title}</p>
              </div>
            </button>
          ))}
        </div>
      </div>

      <div className="flex gap-3">
        <Button variant="secondary" onClick={() => setStep(2)}>← Zurück</Button>
        <Button onClick={() => setStep(5)} fullWidth size="lg">Jetzt bestellen</Button>
      </div>
    </motion.div>
  );
}

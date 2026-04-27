"use client";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useBookStore } from "@/store/bookStore";
import Button from "@/components/ui/Button";
import PanelView from "@/components/comic/PanelView";
import toast from "react-hot-toast";

// ── Cover with CSS title overlay ─────────────────────────────────────────────
function CoverView({ imageUrl, title, subtitle }: { imageUrl?: string; title: string; subtitle?: string }) {
  return (
    <div className="relative w-full max-w-sm mx-auto overflow-hidden rounded-xl" style={{ aspectRatio: "1024/1792" }}>
      {imageUrl ? (
        <img src={imageUrl} alt="Cover" className="w-full h-full object-cover" />
      ) : (
        <div className="absolute inset-0 bg-gradient-to-b from-[#2D2620] to-[#1A1410]" />
      )}
      <div className="absolute inset-x-0 bottom-0 h-[40%]"
        style={{ background: "linear-gradient(to bottom, transparent 0%, rgba(10,5,2,0.75) 60%, rgba(10,5,2,0.95) 100%)" }}>
        <div className="absolute inset-x-0 bottom-[15%] text-center px-6">
          <div className="mx-auto w-16 h-[3px] bg-[#C9963A] rounded mb-3" />
          <h1 className="text-white font-black text-2xl md:text-3xl leading-tight tracking-wide drop-shadow-lg"
            style={{ fontFamily: "'Bangers', 'Arial Black', sans-serif", letterSpacing: "0.05em" }}>
            {title.toUpperCase()}
          </h1>
          {subtitle && (
            <p className="text-white/70 text-sm mt-2 tracking-widest uppercase"
              style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>
              {subtitle}
            </p>
          )}
          <div className="mx-auto w-16 h-[3px] bg-[#C9963A] rounded mt-3" />
        </div>
      </div>
    </div>
  );
}

// ── Ending page — pure CSS/HTML, no image ────────────────────────────────────
function EndingView({ endingText, dedication, dedicationFrom }: { endingText: string; dedication?: string; dedicationFrom?: string }) {
  return (
    <div className="w-full max-w-sm mx-auto bg-[#FDF8F2] rounded-xl overflow-hidden border border-[#E8D9C0] shadow-lg"
      style={{ aspectRatio: "1024/1536" }}>
      <div className="flex flex-col items-center justify-center h-full px-8 py-12 text-center">
        <p className="text-[#C9963A] text-xs tracking-[0.3em] uppercase mb-2"
          style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>
          ✦ Widmung ✦
        </p>
        <div className="w-20 h-[2px] bg-[#C9963A] rounded mb-8" />
        <p className="text-[#1A1410] text-lg md:text-xl leading-relaxed italic"
          style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>
          {endingText}
        </p>
        <div className="w-12 h-[2px] bg-[#C9963A] rounded my-8" />
        {dedication && (
          <p className="text-[#8B7355] text-sm italic"
            style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>
            &ldquo;{dedication}&rdquo;
          </p>
        )}
        {dedicationFrom && (
          <p className="text-[#8B7355] text-sm mt-4"
            style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>
            Von: {dedicationFrom}
          </p>
        )}
        <div className="w-full flex flex-col items-center pt-8">
          <div className="w-20 h-[2px] bg-[#C9963A] rounded mb-2" />
          <p className="text-[#C9963A] text-xs tracking-[0.3em] uppercase"
            style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>
            ✦ The End ✦
          </p>
        </div>
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

  const comicPages = project.chapters.filter((c) => c.id !== "ending");
  const total = comicPages.length;
  const hasEnding = !!project.endingData?.endingText;
  const maxPage = hasEnding ? total : total - 1;
  const isCover = currentPage === -1;
  const isEnding = currentPage === total && hasEnding;
  const page = (!isCover && !isEnding) ? comicPages[currentPage] : null;

  const goNext = () => {
    if (currentPage < maxPage) { setDirection(1); setCurrentPage((p) => p + 1); }
  };
  const goPrev = () => {
    if (currentPage > -1) { setDirection(-1); setCurrentPage((p) => p - 1); }
  };

  const handleRegen = async (pageId: string) => {
    setRegenerating(pageId);
    await new Promise((r) => setTimeout(r, 2000));
    updateChapter(pageId, { imageUrl: `https://picsum.photos/seed/${Date.now()}/1024/1792` });
    setRegenerating(null);
    toast.success("Seite neu erstellt!");
  };

  const pageLabel = isCover ? "Cover" : isEnding ? "Abschluss" : `Seite ${currentPage + 1} von ${total}`;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-3xl mx-auto space-y-6">
      <div className="text-center space-y-1">
        <h2 className="font-display text-3xl font-semibold text-[#1f1a2e]">{project.title}</h2>
        <p className="text-gray-400 text-sm">{pageLabel}</p>
      </div>

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
              <CoverView
                imageUrl={project.coverImageUrl}
                title={project.title}
              />
            ) : isEnding && project.endingData ? (
              <EndingView
                endingText={project.endingData.endingText}
                dedication={project.endingData.dedication}
                dedicationFrom={project.endingData.dedicationFrom}
              />
            ) : page ? (
              <div>
                {regenerating === page.id ? (
                  <div className="w-full bg-[#F5EDE0] flex flex-col items-center justify-center gap-3 py-20">
                    <div className="text-4xl animate-pulse">🎨</div>
                    <p className="text-[#8B7355] font-medium text-sm">Seite wird neu illustriert…</p>
                  </div>
                ) : (
                  <PanelView
                    imageUrl={page.imageUrl || ""}
                    title={page.title}
                    panels={page.panels || []}
                    panelPositions={page.panelPositions}
                    pageNumber={currentPage + 1}
                  />
                )}
                <div className="px-6 py-3 flex items-center justify-between border-t border-gray-100">
                  <h3 className="font-semibold text-[#1f1a2e] text-sm">{page.title}</h3>
                  <button
                    onClick={() => handleRegen(page.id)}
                    disabled={!!regenerating}
                    className="text-xs text-[#C9963A] hover:text-[#A67A28] border border-[#E8D9C0] px-3 py-1.5 rounded-lg hover:bg-[#F5EDE0] transition-all disabled:opacity-40"
                  >
                    Neu illustrieren
                  </button>
                </div>
              </div>
            ) : null}
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="flex items-center justify-between">
        <Button variant="secondary" onClick={goPrev} disabled={currentPage === -1} size="sm">← Vorherige</Button>
        <div className="flex gap-2 items-center">
          <button
            onClick={() => setCurrentPage(-1)}
            className={`rounded-full transition-all ${currentPage === -1 ? "w-6 h-2.5 bg-[#C9963A]" : "w-2.5 h-2.5 bg-[#E8D9C0]"}`}
          />
          {comicPages.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrentPage(i)}
              className={`rounded-full transition-all ${i === currentPage ? "w-6 h-2.5 bg-[#C9963A]" : "w-2.5 h-2.5 bg-[#E8D9C0]"}`}
            />
          ))}
          {hasEnding && (
            <button
              onClick={() => setCurrentPage(total)}
              className={`rounded-full transition-all ${isEnding ? "w-6 h-2.5 bg-[#C9963A]" : "w-2.5 h-2.5 bg-[#E8D9C0]"}`}
            />
          )}
        </div>
        <Button variant="secondary" onClick={goNext} disabled={currentPage === maxPage} size="sm">Nächste →</Button>
      </div>

      <div className="bg-[#F5EDE0] rounded-2xl p-4 space-y-3">
        <h3 className="text-sm font-semibold text-[#1f1a2e]">Alle Seiten</h3>
        <div className="grid grid-cols-5 gap-3">
          <button
            onClick={() => setCurrentPage(-1)}
            className={`relative rounded-xl overflow-hidden border-2 transition-all ${currentPage === -1 ? "border-[#C9963A] shadow-md" : "border-transparent hover:border-[#E8D9C0]"}`}
            style={{ aspectRatio: "2/3" }}
          >
            {project.coverImageUrl ? (
              <img src={project.coverImageUrl} alt="Cover" className="w-full h-full object-cover" />
            ) : (
              <div className="absolute inset-0 bg-gradient-to-b from-[#2D2620] to-[#1A1410] flex items-center justify-center">
                <span className="text-white text-xs font-bold">Cover</span>
              </div>
            )}
          </button>

          {comicPages.map((p, i) => (
            <button
              key={p.id}
              onClick={() => setCurrentPage(i)}
              className={`relative rounded-xl overflow-hidden border-2 transition-all ${i === currentPage ? "border-[#C9963A] shadow-md" : "border-transparent hover:border-[#E8D9C0]"}`}
              style={{ aspectRatio: "2/3" }}
            >
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

          {hasEnding && (
            <button
              onClick={() => setCurrentPage(total)}
              className={`relative rounded-xl overflow-hidden border-2 transition-all ${isEnding ? "border-[#C9963A] shadow-md" : "border-transparent hover:border-[#E8D9C0]"}`}
              style={{ aspectRatio: "2/3" }}
            >
              <div className="absolute inset-0 bg-[#FDF8F2] flex items-center justify-center">
                <span className="text-[#C9963A] text-xs font-bold">Ende</span>
              </div>
            </button>
          )}
        </div>
      </div>

      <div className="flex gap-3">
        <Button variant="secondary" onClick={() => setStep(2)}>← Zurück</Button>
        <Button onClick={() => setStep(5)} fullWidth size="lg">Jetzt bestellen</Button>
      </div>
    </motion.div>
  );
}

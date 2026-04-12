"use client";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useBookStore } from "@/store/bookStore";
import Button from "@/components/ui/Button";
import Image from "next/image";
import toast from "react-hot-toast";

export default function Step5Preview() {
  const { project, setStep, updateChapter } = useBookStore();
  const [currentPage, setCurrentPage] = useState(0);
  const [direction, setDirection] = useState(1);
  const [regenerating, setRegenerating] = useState<string | null>(null);

  if (!project) return null;

  const pages = project.chapters;
  const total = pages.length;
  const page = pages[currentPage];

  const goNext = () => {
    if (currentPage < total - 1) { setDirection(1); setCurrentPage((p) => p + 1); }
  };
  const goPrev = () => {
    if (currentPage > 0) { setDirection(-1); setCurrentPage((p) => p - 1); }
  };

  const handleRegenPage = async (pageId: string) => {
    setRegenerating(pageId);
    await new Promise((r) => setTimeout(r, 2000));
    const seeds = ["comic1", "comic2", "comic3", "comic4", "comic5"];
    const seed = seeds[Math.floor(Math.random() * seeds.length)];
    updateChapter(pageId, { imageUrl: `https://picsum.photos/seed/${seed}-${Date.now()}/1536/1024` });
    setRegenerating(null);
    toast.success("Seite neu erstellt!");
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-5xl mx-auto space-y-6">

      {/* Header */}
      <div className="text-center space-y-1">
        <h2 className="font-display text-3xl font-semibold text-[#1f1a2e]">{project.title}</h2>
        <p className="text-gray-400 text-sm">Seite {currentPage + 1} von {total}</p>
      </div>

      {/* Comic Page Viewer */}
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
            {/* Full-page comic image */}
            <div className="relative w-full" style={{ aspectRatio: "1536/1024" }}>
              {regenerating === page.id ? (
                <div className="absolute inset-0 bg-purple-50 flex flex-col items-center justify-center gap-3">
                  <div className="text-4xl animate-pulse">🎨</div>
                  <p className="text-purple-600 font-medium text-sm">Seite wird neu illustriert…</p>
                </div>
              ) : page.imageUrl ? (
                <Image
                  src={page.imageUrl}
                  alt={page.title}
                  fill
                  className="object-contain"
                  unoptimized={page.imageUrl.startsWith("data:")}
                />
              ) : (
                <div className="absolute inset-0 bg-gray-100 flex items-center justify-center">
                  <p className="text-gray-400">Kein Bild verfügbar</p>
                </div>
              )}
            </div>

            {/* Page info bar */}
            <div className="px-6 py-4 flex items-center justify-between border-t border-gray-100">
              <div>
                <h3 className="font-display font-semibold text-[#1f1a2e]">{page.title}</h3>
                {page.content && (
                  <p className="text-gray-400 text-xs mt-0.5 line-clamp-1">{page.content}</p>
                )}
              </div>
              <button
                onClick={() => handleRegenPage(page.id)}
                disabled={!!regenerating}
                className="text-xs text-purple-500 hover:text-purple-700 border border-purple-200 px-3 py-1.5 rounded-lg hover:bg-purple-50 transition-all disabled:opacity-40"
              >
                Neu illustrieren
              </button>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <Button variant="secondary" onClick={goPrev} disabled={currentPage === 0} size="sm">
          ← Vorherige Seite
        </Button>

        {/* Page dots */}
        <div className="flex gap-2 items-center">
          {pages.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrentPage(i)}
              className={`rounded-full transition-all ${i === currentPage ? "w-6 h-2.5 bg-purple-500" : "w-2.5 h-2.5 bg-purple-200"}`}
            />
          ))}
        </div>

        <Button variant="secondary" onClick={goNext} disabled={currentPage === total - 1} size="sm">
          Nächste Seite →
        </Button>
      </div>

      {/* Page overview */}
      <div className="bg-purple-50 rounded-2xl p-4 space-y-3">
        <h3 className="text-sm font-semibold text-[#1f1a2e]">Alle Seiten</h3>
        <div className="grid grid-cols-4 gap-3">
          {pages.map((p, i) => (
            <button
              key={p.id}
              onClick={() => setCurrentPage(i)}
              className={`relative rounded-xl overflow-hidden border-2 transition-all ${
                i === currentPage ? "border-purple-500 shadow-md" : "border-transparent hover:border-purple-200"
              }`}
              style={{ aspectRatio: "3/2" }}
            >
              {p.imageUrl ? (
                <Image
                  src={p.imageUrl}
                  alt={p.title}
                  fill
                  className="object-cover"
                  unoptimized={p.imageUrl.startsWith("data:")}
                />
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

"use client";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useBookStore } from "@/store/bookStore";
import Button from "@/components/ui/Button";
import Image from "next/image";
import toast from "react-hot-toast";

export default function Step5Preview() {
  const { project, setStep, updateChapter, updateProject } = useBookStore();
  const [currentPage, setCurrentPage] = useState(-1); // -1 = cover
  const [editingChapter, setEditingChapter] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [editTitle, setEditTitle] = useState("");
  const [regenerating, setRegenerating] = useState<string | null>(null);
  const [direction, setDirection] = useState(1);

  if (!project) return null;

  const chapters = project.chapters;
  const totalPages = chapters.length;

  const goNext = () => {
    if (currentPage < totalPages - 1) {
      setDirection(1);
      setCurrentPage((p) => p + 1);
    }
  };

  const goPrev = () => {
    if (currentPage > -1) {
      setDirection(-1);
      setCurrentPage((p) => p - 1);
    }
  };

  const startEdit = (chapterId: string) => {
    const ch = chapters.find((c) => c.id === chapterId);
    if (!ch) return;
    setEditText(ch.content);
    setEditTitle(ch.title);
    setEditingChapter(chapterId);
  };

  const saveEdit = () => {
    if (!editingChapter) return;
    updateChapter(editingChapter, { content: editText, title: editTitle });
    setEditingChapter(null);
    toast.success("Kapitel gespeichert!");
  };

  const handleRegenImage = async (chapterId: string) => {
    setRegenerating(chapterId);
    // Simulate regeneration delay
    await new Promise((r) => setTimeout(r, 2000));
    const seeds = ["nature1", "city2", "family3", "adventure4", "sunset5", "travel6"];
    const newSeed = seeds[Math.floor(Math.random() * seeds.length)];
    updateChapter(chapterId, {
      imageUrl: `https://picsum.photos/seed/${newSeed}-${Date.now()}/800/500`,
    });
    setRegenerating(null);
    toast.success("Neues Bild generiert!");
  };

  const currentChapter = currentPage >= 0 ? chapters[currentPage] : null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="max-w-4xl mx-auto space-y-6"
    >
      <div className="text-center space-y-1">
        <h2 className="text-3xl font-bold text-brand-800" style={{ fontFamily: "var(--font-display)" }}>
          Dein Buch 📖
        </h2>
        <p className="text-gray-500 text-sm">
          {currentPage === -1 ? "Titelseite" : `Kapitel ${currentPage + 1} von ${totalPages}`}
        </p>
      </div>

      {/* Book viewer */}
      <div className="book-container relative">
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={currentPage}
            custom={direction}
            initial={{ opacity: 0, x: direction * 60 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: direction * -60 }}
            transition={{ duration: 0.4, ease: "easeInOut" }}
            className="bg-white rounded-3xl shadow-2xl overflow-hidden border border-brand-100"
          >
            {currentPage === -1 ? (
              /* Cover page */
              <div className="relative h-[500px] flex flex-col items-center justify-end pb-12">
                <Image
                  src={project.coverImageUrl || "https://picsum.photos/seed/cover/800/500"}
                  alt="Buchcover"
                  fill
                  className="object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                <div className="relative z-10 text-center px-8">
                  <h1
                    className="text-4xl font-bold text-white drop-shadow-lg"
                    style={{ fontFamily: "var(--font-display)" }}
                  >
                    {project.title}
                  </h1>
                  <p className="text-white/80 mt-2 text-sm">Ein persönliches Buch</p>
                </div>
              </div>
            ) : currentChapter ? (
              /* Chapter page */
              <div className="grid md:grid-cols-2 min-h-[500px]">
                {/* Image side */}
                <div className="relative h-64 md:h-auto">
                  {regenerating === currentChapter.id ? (
                    <div className="absolute inset-0 shimmer flex items-center justify-center">
                      <span className="text-brand-600 font-medium animate-pulse">Bild wird generiert…</span>
                    </div>
                  ) : (
                    <Image
                      src={currentChapter.imageUrl || "https://picsum.photos/seed/default/800/500"}
                      alt={currentChapter.title}
                      fill
                      className="object-cover"
                    />
                  )}
                  <button
                    onClick={() => handleRegenImage(currentChapter.id)}
                    disabled={!!regenerating}
                    className="absolute bottom-3 right-3 bg-white/90 backdrop-blur text-brand-700 text-xs px-3 py-1.5 rounded-full shadow hover:bg-white transition-all disabled:opacity-50"
                  >
                    🔄 Neu erstellen
                  </button>
                </div>

                {/* Text side */}
                <div className="p-8 flex flex-col justify-between">
                  {editingChapter === currentChapter.id ? (
                    <div className="space-y-3 flex-1">
                      <input
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        className="w-full text-xl font-bold text-brand-800 border-b-2 border-brand-200 focus:border-brand-400 focus:outline-none pb-1"
                        style={{ fontFamily: "var(--font-display)" }}
                      />
                      <textarea
                        value={editText}
                        onChange={(e) => setEditText(e.target.value)}
                        rows={8}
                        className="w-full text-sm text-gray-700 border border-brand-100 rounded-xl p-3 focus:border-brand-400 focus:outline-none resize-none leading-relaxed"
                      />
                      <div className="flex gap-2">
                        <Button size="sm" onClick={saveEdit}>Speichern</Button>
                        <Button size="sm" variant="ghost" onClick={() => setEditingChapter(null)}>Abbrechen</Button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="space-y-4">
                        <div className="flex items-start justify-between gap-2">
                          <h3
                            className="text-xl font-bold text-brand-800"
                            style={{ fontFamily: "var(--font-display)" }}
                          >
                            {currentChapter.title}
                          </h3>
                          <button
                            onClick={() => startEdit(currentChapter.id)}
                            className="text-brand-400 hover:text-brand-600 text-sm flex-shrink-0"
                          >
                            ✏️ Bearbeiten
                          </button>
                        </div>
                        <p className="prose-book text-sm leading-relaxed text-gray-700">
                          {currentChapter.content}
                        </p>
                      </div>
                      <div className="text-xs text-gray-300 text-right mt-4">
                        Seite {currentPage + 2}
                      </div>
                    </>
                  )}
                </div>
              </div>
            ) : null}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <Button
          variant="secondary"
          onClick={goPrev}
          disabled={currentPage === -1}
          size="sm"
        >
          ← Vorherige Seite
        </Button>

        {/* Page dots */}
        <div className="flex gap-1.5">
          {[-1, ...chapters.map((_, i) => i)].map((p) => (
            <button
              key={p}
              onClick={() => setCurrentPage(p)}
              className={`w-2 h-2 rounded-full transition-all ${
                p === currentPage ? "bg-brand-500 w-4" : "bg-brand-200"
              }`}
            />
          ))}
        </div>

        <Button
          variant="secondary"
          onClick={goNext}
          disabled={currentPage === totalPages - 1}
          size="sm"
        >
          Nächste Seite →
        </Button>
      </div>

      {/* Chapter list */}
      <div className="bg-brand-50 rounded-2xl p-4 space-y-2">
        <h3 className="text-sm font-semibold text-brand-700">📋 Inhaltsverzeichnis</h3>
        <div className="space-y-1">
          {chapters.map((ch, i) => (
            <button
              key={ch.id}
              onClick={() => setCurrentPage(i)}
              className={`w-full text-left px-3 py-2 rounded-xl text-sm transition-all ${
                currentPage === i
                  ? "bg-brand-500 text-white"
                  : "hover:bg-brand-100 text-gray-600"
              }`}
            >
              <span className="font-medium">{i + 1}.</span> {ch.title}
            </button>
          ))}
        </div>
      </div>

      <div className="flex gap-3">
        <Button variant="secondary" onClick={() => setStep(2)}>
          ← Stil ändern
        </Button>
        <Button onClick={() => setStep(5)} fullWidth size="lg">
          Jetzt bestellen 🚀
        </Button>
      </div>
    </motion.div>
  );
}

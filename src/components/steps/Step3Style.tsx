"use client";
import { useState } from "react";
import { motion } from "framer-motion";
import { useBookStore, IllustrationStyle, BookLanguage } from "@/store/bookStore";
import Button from "@/components/ui/Button";

const LANGUAGES: { id: BookLanguage; flag: string; label: string }[] = [
  { id: "de", flag: "🇩🇪", label: "Deutsch" },
  { id: "en", flag: "🇬🇧", label: "Englisch" },
  { id: "fr", flag: "🇫🇷", label: "Französisch" },
  { id: "es", flag: "🇪🇸", label: "Spanisch" },
];

export default function Step3Style() {
  const { setStep, project, updateProject } = useBookStore();
  const [bookTitle, setBookTitle]   = useState(project?.title || "");
  const [dedication, setDedication] = useState(project?.dedication || "");
  const [language, setLanguage]     = useState<BookLanguage>(project?.language || "de");

  const handleNext = () => {
    updateProject({
      title: bookTitle || "Mein persönlicher Comic",
      dedication,
      language,
    });
    setStep(3);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-2xl mx-auto space-y-8"
    >
      <div className="text-center space-y-2">
        <h2 className="text-3xl font-bold text-brand-800" style={{ fontFamily: "var(--font-display)" }}>
          Gestalte deinen Comic 🎨
        </h2>
        <p className="text-gray-500">Noch ein paar letzte Details – dann geht's los.</p>
      </div>

      {/* 1. Titel */}
      <div className="space-y-2">
        <label className="text-sm font-semibold text-brand-700">📚 Titel</label>
        <input
          value={bookTitle}
          onChange={(e) => setBookTitle(e.target.value)}
          placeholder="z. B. Unser Sommer auf Sardinien"
          className="w-full p-3 rounded-xl border-2 border-brand-100 focus:border-brand-400 focus:outline-none text-gray-700 bg-white text-lg transition-all"
        />
      </div>

      {/* 2. Widmung */}
      <div className="space-y-2">
        <label className="text-sm font-semibold text-brand-700">
          💌 Widmung <span className="font-normal text-gray-400">(optional)</span>
        </label>
        <textarea
          value={dedication}
          onChange={(e) => setDedication(e.target.value)}
          placeholder="z. B. Für Lisa – in Erinnerung an unsere schönsten Momente. In Liebe, Max."
          rows={2}
          className="w-full p-3 rounded-xl border-2 border-brand-100 focus:border-brand-400 focus:outline-none text-gray-700 bg-white resize-none transition-all"
        />
        <p className="text-xs text-gray-400">Erscheint auf der ersten Seite deines Comics.</p>
      </div>

      {/* 7. Sprache */}
      <div className="space-y-3">
        <label className="text-sm font-semibold text-brand-700">🌍 Sprache</label>
        <div className="flex gap-2 flex-wrap">
          {LANGUAGES.map((lang) => (
            <button
              key={lang.id}
              onClick={() => setLanguage(lang.id)}
              className={`px-4 py-2 rounded-full border-2 text-sm font-medium transition-all ${
                language === lang.id
                  ? "border-brand-400 bg-brand-500 text-white shadow-md"
                  : "border-gray-100 bg-white text-gray-600 hover:border-brand-200"
              }`}
            >
              {lang.flag} {lang.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex gap-3">
        <Button variant="secondary" onClick={() => setStep(1)}>← Zurück</Button>
        <Button onClick={handleNext} fullWidth>Comic erstellen ✨</Button>
      </div>
    </motion.div>
  );
}

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
  const [dedication, setDedication] = useState(project?.dedication || "");
  const [dedicationFrom, setDedicationFrom] = useState(project?.dedicationFrom || "");
  const [language, setLanguage]     = useState<BookLanguage>(project?.language || "de");

  const handleNext = () => {
    updateProject({
      dedication,
      dedicationFrom,
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
      <div className="text-center space-y-3">
        <h2 className="text-4xl font-bold text-gray-900 tracking-tight" style={{ fontFamily: "var(--font-display)" }}>
          Widmung & Details
        </h2>
        <p className="text-gray-600 text-lg leading-relaxed">Noch ein paar letzte Details – dann geht's los.</p>
      </div>

      {/* 1. Widmung */}
      <div className="space-y-3">
        <label className="text-sm font-semibold text-gray-900">
          Widmung <span className="font-normal text-gray-500">(optional)</span>
        </label>
        <textarea
          value={dedication}
          onChange={(e) => setDedication(e.target.value)}
          placeholder="z. B. Für Dich, lieber Werner, möge die Erinnerung an Deinen Hochzeitstanz mit Helga unter den Lampions immer in Deinem Herzen leuchten..."
          rows={3}
          className="w-full p-4 rounded-xl border border-gray-200 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 focus:outline-none text-gray-900 bg-white resize-none transition-all"
        />
        <input
          value={dedicationFrom}
          onChange={(e) => setDedicationFrom(e.target.value)}
          placeholder="Von wem? z. B. Deine Familie, Anna & Max, In Liebe, Sabine"
          className="w-full p-3.5 rounded-xl border border-gray-200 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 focus:outline-none text-gray-900 bg-white transition-all"
        />
        <p className="text-sm text-gray-500 leading-relaxed">Erscheint auf der letzten Seite deines Comics.</p>
      </div>

      {/* Sprache */}
      <div className="space-y-4">
        <label className="text-sm font-semibold text-gray-900">Sprache</label>
        <div className="flex gap-2 flex-wrap">
          {LANGUAGES.map((lang) => (
            <button
              key={lang.id}
              onClick={() => setLanguage(lang.id)}
              className={`px-5 py-2.5 rounded-xl border text-sm font-medium transition-all ${
                language === lang.id
                  ? "border-brand-600 bg-brand-600 text-white shadow-sm"
                  : "border-gray-200 bg-white text-gray-700 hover:border-brand-400 hover:bg-brand-50/30"
              }`}
            >
              {lang.flag} {lang.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex gap-3">
        <Button variant="secondary" onClick={() => setStep(1)}>← Zurück</Button>
        <Button onClick={handleNext} fullWidth>Comic erstellen</Button>
      </div>
    </motion.div>
  );
}

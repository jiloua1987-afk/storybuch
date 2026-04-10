"use client";
import { useState } from "react";
import { motion } from "framer-motion";
import { useBookStore, IllustrationStyle, BookLanguage } from "@/store/bookStore";
import Button from "@/components/ui/Button";

const ILLUSTRATION_STYLES: {
  id: IllustrationStyle;
  emoji: string;
  label: string;
  desc: string;
  preview: string;
}[] = [
  {
    id: "comic",
    emoji: "🎨",
    label: "Comic",
    desc: "Kräftige Farben, klare Konturen, lebendige Panels – wie im Beispiel",
    preview: "/Comic.png",
  },
  {
    id: "aquarell",
    emoji: "🖌️",
    label: "Aquarell",
    desc: "Weiche Farben, malerisch, romantisch und warm",
    preview: "",
  },
  {
    id: "bleistift",
    emoji: "✏️",
    label: "Bleistift / Skizze",
    desc: "Handgezeichnet, zeitlos, klassisch",
    preview: "",
  },
  {
    id: "realistisch",
    emoji: "🖼️",
    label: "Realistisch",
    desc: "Detailreiche digitale Malerei, fast wie ein Gemälde",
    preview: "",
  },
];

const LANGUAGES: { id: BookLanguage; flag: string; label: string }[] = [
  { id: "de", flag: "🇩🇪", label: "Deutsch" },
  { id: "en", flag: "🇬🇧", label: "Englisch" },
  { id: "fr", flag: "🇫🇷", label: "Französisch" },
  { id: "es", flag: "🇪🇸", label: "Spanisch" },
];

export default function Step3Style() {
  const { setStep, project, updateProject } = useBookStore();
  const [bookTitle, setBookTitle] = useState(project?.title || "");
  const [illustrationStyle, setIllustrationStyle] = useState<IllustrationStyle>(
    project?.illustrationStyle || "comic"
  );
  const [dedication, setDedication] = useState(project?.dedication || "");
  const [language, setLanguage] = useState<BookLanguage>(project?.language || "de");

  const handleNext = () => {
    updateProject({
      title: bookTitle || "Mein persönliches Buch",
      illustrationStyle,
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
      {/* Header */}
      <div className="text-center space-y-2">
        <h2 className="text-3xl font-bold text-brand-800" style={{ fontFamily: "var(--font-display)" }}>
          Gestalte dein Buch 🎨
        </h2>
        <p className="text-gray-500">Noch ein paar letzte Details – dann geht's los.</p>
      </div>

      {/* 1. Buchtitel */}
      <div className="space-y-2">
        <label className="text-sm font-semibold text-brand-700">📚 Buchtitel</label>
        <input
          value={bookTitle}
          onChange={(e) => setBookTitle(e.target.value)}
          placeholder="z. B. Unser Sommer auf Sardinien"
          className="w-full p-3 rounded-xl border-2 border-brand-100 focus:border-brand-400 focus:outline-none text-gray-700 bg-white text-lg transition-all"
        />
      </div>

      {/* 2. Illustrationsstil */}
      <div className="space-y-3">
        <label className="text-sm font-semibold text-brand-700">🖼️ Illustrationsstil</label>
        <div className="grid grid-cols-2 gap-3">
          {ILLUSTRATION_STYLES.map((style) => (
            <motion.button
              key={style.id}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setIllustrationStyle(style.id)}
              className={`p-4 rounded-2xl border-2 text-left transition-all space-y-1 ${
                illustrationStyle === style.id
                  ? "border-brand-400 bg-brand-50 shadow-md"
                  : "border-gray-100 bg-white hover:border-brand-200"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-2xl">{style.emoji}</span>
                {illustrationStyle === style.id && (
                  <span className="text-brand-500 font-bold">✓</span>
                )}
              </div>
              <div className="font-semibold text-brand-800 text-sm">{style.label}</div>
              <div className="text-xs text-gray-400 leading-snug">{style.desc}</div>
            </motion.button>
          ))}
        </div>
        {illustrationStyle === "comic" && (
          <p className="text-xs text-brand-500 text-center">
            ✨ Wie im Beispiel auf der Startseite – unser beliebtester Stil
          </p>
        )}
      </div>

      {/* 3. Widmung */}
      <div className="space-y-2">
        <label className="text-sm font-semibold text-brand-700">
          💌 Widmung <span className="font-normal text-gray-400">(optional)</span>
        </label>
        <textarea
          value={dedication}
          onChange={(e) => setDedication(e.target.value)}
          placeholder="z. B. Für Lisa – in Erinnerung an unsere schönsten Momente. In Liebe, Max."
          rows={3}
          className="w-full p-3 rounded-xl border-2 border-brand-100 focus:border-brand-400 focus:outline-none text-gray-700 bg-white resize-none transition-all"
        />
        <p className="text-xs text-gray-400">Erscheint auf der ersten Seite deines Buches.</p>
      </div>

      {/* 4. Sprache */}
      <div className="space-y-3">
        <label className="text-sm font-semibold text-brand-700">🌍 Sprache des Buches</label>
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
        <Button variant="secondary" onClick={() => setStep(1)}>
          ← Zurück
        </Button>
        <Button onClick={handleNext} fullWidth>
          Buch erstellen ✨
        </Button>
      </div>
    </motion.div>
  );
}

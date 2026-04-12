"use client";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useBookStore, IllustrationStyle, BookLanguage, ComicStyle, DialogMode, CustomDialog } from "@/store/bookStore";
import Button from "@/components/ui/Button";

const ILLUSTRATION_STYLES: { id: IllustrationStyle; emoji: string; label: string; desc: string }[] = [
  { id: "comic",       emoji: "🎨", label: "Comic",             desc: "Kräftige Farben, klare Konturen, lebendige Panels" },
  { id: "aquarell",    emoji: "🖌️", label: "Aquarell",          desc: "Weiche Farben, malerisch, romantisch und warm" },
  { id: "bleistift",   emoji: "✏️", label: "Bleistift / Skizze", desc: "Handgezeichnet, zeitlos, klassisch" },
  { id: "realistisch", emoji: "🖼️", label: "Realistisch",       desc: "Detailreiche digitale Malerei, fast wie ein Gemälde" },
];

const COMIC_STYLES: { id: ComicStyle; emoji: string; label: string; desc: string }[] = [
  { id: "action",    emoji: "⚡", label: "Action Comic",    desc: "Dynamisch, übertrieben, energiegeladen" },
  { id: "emotional", emoji: "💛", label: "Emotional Comic", desc: "Ruhig, warm, erzählerisch" },
  { id: "humor",     emoji: "😄", label: "Humor Comic",     desc: "Lustig, überzeichnet, spielerisch" },
];

const LANGUAGES: { id: BookLanguage; flag: string; label: string }[] = [
  { id: "de", flag: "🇩🇪", label: "Deutsch" },
  { id: "en", flag: "🇬🇧", label: "Englisch" },
  { id: "fr", flag: "🇫🇷", label: "Französisch" },
  { id: "es", flag: "🇪🇸", label: "Spanisch" },
];

export default function Step3Style() {
  const { setStep, project, updateProject } = useBookStore();
  const [bookTitle, setBookTitle]                   = useState(project?.title || "");
  const [illustrationStyle, setIllustrationStyle]   = useState<IllustrationStyle>(project?.illustrationStyle || "comic");
  const [comicStyle, setComicStyle]                 = useState<ComicStyle>(project?.comicStyle || "emotional");
  const [dedication, setDedication]                 = useState(project?.dedication || "");
  const [language, setLanguage]                     = useState<BookLanguage>(project?.language || "de");
  const [dialogMode, setDialogMode]                 = useState<DialogMode>(project?.dialogMode || "auto");
  const [customDialogs, setCustomDialogs]           = useState<CustomDialog[]>(
    project?.customDialogs?.length ? project.customDialogs : [{ id: "d1", speaker: "", text: "" }]
  );
  const [mustHaveSentences, setMustHaveSentences]   = useState(project?.mustHaveSentences || "");

  const addDialog = () =>
    setCustomDialogs((prev) => [...prev, { id: `d${Date.now()}`, speaker: "", text: "" }]);

  const updateDialog = (id: string, field: "speaker" | "text", value: string) =>
    setCustomDialogs((prev) => prev.map((d) => (d.id === id ? { ...d, [field]: value } : d)));

  const removeDialog = (id: string) =>
    setCustomDialogs((prev) => prev.filter((d) => d.id !== id));

  const handleNext = () => {
    updateProject({
      title: bookTitle || "Mein persönlicher Comic",
      illustrationStyle,
      comicStyle,
      dedication,
      language,
      dialogMode,
      customDialogs: dialogMode === "custom" ? customDialogs : [],
      mustHaveSentences,
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
                {illustrationStyle === style.id && <span className="text-brand-500 font-bold">✓</span>}
              </div>
              <div className="font-semibold text-brand-800 text-sm">{style.label}</div>
              <div className="text-xs text-gray-400 leading-snug">{style.desc}</div>
            </motion.button>
          ))}
        </div>
      </div>

      {/* 3. Comic-Stil – nur wenn Comic gewählt */}
      <AnimatePresence>
        {illustrationStyle === "comic" && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-3 overflow-hidden"
          >
            <label className="text-sm font-semibold text-brand-700">
              ⚡ Comic-Stil{" "}
              <span className="font-normal text-gray-400">(beeinflusst nur Dialoge & Prompts, nicht das Layout)</span>
            </label>
            <div className="grid grid-cols-3 gap-3">
              {COMIC_STYLES.map((cs) => (
                <button
                  key={cs.id}
                  onClick={() => setComicStyle(cs.id)}
                  className={`p-4 rounded-2xl border-2 text-center transition-all space-y-1 ${
                    comicStyle === cs.id
                      ? "border-brand-400 bg-brand-50 shadow-md"
                      : "border-gray-100 bg-white hover:border-brand-200"
                  }`}
                >
                  <div className="text-2xl">{cs.emoji}</div>
                  <div className="text-xs font-semibold text-brand-800">{cs.label}</div>
                  <div className="text-xs text-gray-400 leading-snug">{cs.desc}</div>
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 4. Dialog-Modus */}
      <div className="space-y-3">
        <label className="text-sm font-semibold text-brand-700">💬 Dialoge</label>
        <div className="flex gap-3 bg-brand-50 p-1 rounded-2xl">
          <button
            onClick={() => setDialogMode("auto")}
            className={`flex-1 py-2 rounded-xl text-sm font-medium transition-all ${
              dialogMode === "auto" ? "bg-white shadow text-brand-700" : "text-gray-500"
            }`}
          >
            ✨ Automatisch vorschlagen
          </button>
          <button
            onClick={() => setDialogMode("custom")}
            className={`flex-1 py-2 rounded-xl text-sm font-medium transition-all ${
              dialogMode === "custom" ? "bg-white shadow text-brand-700" : "text-gray-500"
            }`}
          >
            ✍️ Eigene Dialoge
          </button>
        </div>
        <p className="text-xs text-gray-400">
          {dialogMode === "auto"
            ? "Wir schlagen passende Dialoge vor – du kannst sie in der Vorschau anpassen."
            : "Gib eigene Dialoge ein – fehlende werden automatisch ergänzt."}
        </p>

        <AnimatePresence>
          {dialogMode === "custom" && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="space-y-3"
            >
              {customDialogs.map((d, i) => (
                <motion.div
                  key={d.id}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="bg-brand-50 rounded-2xl p-4 space-y-2"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-brand-400 w-5">#{i + 1}</span>
                    <input
                      value={d.speaker}
                      onChange={(e) => updateDialog(d.id, "speaker", e.target.value)}
                      placeholder="Sprecher, z. B. Max"
                      className="w-36 p-2 rounded-xl border-2 border-brand-100 focus:border-brand-400 focus:outline-none text-sm text-gray-700 bg-white"
                    />
                    {customDialogs.length > 1 && (
                      <button
                        onClick={() => removeDialog(d.id)}
                        className="ml-auto text-gray-300 hover:text-red-400 text-xl leading-none"
                      >×</button>
                    )}
                  </div>
                  <input
                    value={d.text}
                    onChange={(e) => updateDialog(d.id, "text", e.target.value)}
                    placeholder="Dialog, z. B. Warte, kennst du mich?"
                    className="w-full p-2 rounded-xl border-2 border-brand-100 focus:border-brand-400 focus:outline-none text-sm text-gray-700 bg-white"
                  />
                </motion.div>
              ))}
              <button
                onClick={addDialog}
                className="w-full py-3 rounded-2xl border-2 border-dashed border-brand-200 text-brand-500 text-sm font-medium hover:bg-brand-50 hover:border-brand-400 transition-all flex items-center justify-center gap-2"
              >
                <span className="text-xl">+</span> Dialog hinzufügen
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* 5. Must-Have Sätze */}
      <div className="space-y-2">
        <label className="text-sm font-semibold text-brand-700">
          ⭐ Wichtige Sätze oder Momente{" "}
          <span className="font-normal text-gray-400">(optional)</span>
        </label>
        <textarea
          value={mustHaveSentences}
          onChange={(e) => setMustHaveSentences(e.target.value)}
          placeholder="Gibt es Sätze oder Momente, die unbedingt vorkommen sollen? z. B. 'Ich liebe dich mehr als Pizza' oder der Moment als er auf die Knie ging..."
          rows={3}
          className="w-full p-3 rounded-xl border-2 border-brand-100 focus:border-brand-400 focus:outline-none text-gray-700 bg-white resize-none transition-all"
        />
        <p className="text-xs text-gray-400">Fließt direkt in die Dialog-Generierung ein.</p>
      </div>

      {/* 6. Widmung */}
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

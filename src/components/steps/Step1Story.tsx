"use client";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useBookStore, ComicStyle, DialogMode, CustomDialog } from "@/store/bookStore";
import Button from "@/components/ui/Button";
import toast from "react-hot-toast";
import { categoryIcons, styleIcons } from "@/components/icons/CategoryIcons";

const CATEGORIES = [
  { id: "liebe",     icon: "liebe", label: "Liebesgeschichte", tone: "romantisch"  },
  { id: "familie",   icon: "familie", label: "Familie",          tone: "kindgerecht" },
  { id: "urlaub",    icon: "urlaub", label: "Urlaub / Reise",   tone: "humorvoll"   },
  { id: "feier",     icon: "feier", label: "Feier / Event",    tone: "humorvoll"   },
  { id: "biografie", icon: "biografie", label: "Biografie",        tone: "biografisch" },
  { id: "freunde",   icon: "freunde", label: "Freundschaft",     tone: "humorvoll"   },
  { id: "sonstiges", icon: "sonstiges", label: "Sonstiges",        tone: "episch"      },
];

const COMIC_STYLES: { id: ComicStyle; icon: ComicStyle; label: string; desc: string }[] = [
  { id: "action",    icon: "action", label: "Action",    desc: "Dynamisch, übertrieben, energiegeladen" },
  { id: "emotional", icon: "emotional", label: "Emotional", desc: "Ruhig, warm, erzählerisch" },
  { id: "humor",     icon: "humor", label: "Humor",     desc: "Lustig, überzeichnet, spielerisch" },
];

const GUIDED_QUESTIONS: Record<string, { key: string; label: string; placeholder: string }[]> = {
  liebe: [
    { key: "kennengelernt", label: "Euer Kennenlernen", placeholder: "Wann, wo und wie habt ihr euch kennengelernt?" },
    { key: "zusammen",      label: "Der Anfang",        placeholder: "Wann seid ihr zusammengekommen?" },
    { key: "personen",      label: "Wer seid ihr?",     placeholder: "Eure Namen, ein paar Worte zu euch" },
    { key: "zeitraum",      label: "Zeitraum",          placeholder: "z. B. seit 2018, 5 gemeinsame Jahre" },
  ],
  familie: [
    { key: "personen", label: "Wer gehört dazu?",          placeholder: "z. B. Mama, Papa, Emma (6), Luca (4)" },
    { key: "zeitraum", label: "Zeitraum",                  placeholder: "z. B. Sommer 2023" },
    { key: "ort",      label: "Wo spielt die Geschichte?", placeholder: "z. B. Sardinien, Zuhause" },
  ],
  urlaub: [
    { key: "personen", label: "Wer war dabei?",        placeholder: "z. B. wir als Familie" },
    { key: "ort",      label: "Wohin ging die Reise?", placeholder: "z. B. Toskana, Italien" },
    { key: "zeitraum", label: "Wann?",                 placeholder: "z. B. Sommer 2023, 2 Wochen" },
  ],
  feier: [
    { key: "anlass",   label: "Was wurde gefeiert?", placeholder: "z. B. 40. Geburtstag, Hochzeit" },
    { key: "personen", label: "Wer war dabei?",      placeholder: "z. B. Familie und enge Freunde" },
    { key: "ort",      label: "Wo?",                 placeholder: "z. B. Restaurant Rosengarten" },
    { key: "zeitraum", label: "Wann?",               placeholder: "z. B. 12. Juni 2024" },
  ],
  biografie: [
    { key: "personen", label: "Um wen geht es?",          placeholder: "Name, Geburtsjahr, ein paar Worte" },
    { key: "zeitraum", label: "Welcher Lebensabschnitt?", placeholder: "z. B. Kindheit, die 80er Jahre" },
    { key: "ort",      label: "Wo aufgewachsen / gelebt?", placeholder: "z. B. Hamburg, später München" },
  ],
  freunde: [
    { key: "personen", label: "Wer seid ihr?",            placeholder: "Eure Namen und wie ihr euch kennt" },
    { key: "zeitraum", label: "Seit wann?",               placeholder: "z. B. seit der Schulzeit" },
    { key: "ort",      label: "Wo spielt die Geschichte?", placeholder: "z. B. Berlin" },
  ],
  sonstiges: [
    { key: "personen", label: "Wer kommt vor?", placeholder: "Namen und kurze Beschreibung" },
    { key: "ort",      label: "Wo?",            placeholder: "Ort oder Schauplatz" },
    { key: "zeitraum", label: "Wann?",          placeholder: "Zeitraum oder Datum" },
  ],
};

interface Moment { id: string; title: string; description: string; }

export default function Step1Story() {
  const { setStep, setProject } = useBookStore();
  const [mode, setMode]             = useState<"frei" | "gefuehrt">("gefuehrt");
  const [category, setCategory]     = useState<string | null>(null);
  const [comicStyle, setComicStyle] = useState<ComicStyle>("emotional");
  const [comicTitle, setComicTitle] = useState("");
  const [storyInput, setStoryInput] = useState("");
  const [answers, setAnswers]       = useState<Record<string, string>>({});
  const [moments, setMoments]       = useState<Moment[]>([{ id: "m1", title: "", description: "" }]);
  const [dialogMode, setDialogMode] = useState<DialogMode>("auto");
  const [customDialogs, setCustomDialogs] = useState<CustomDialog[]>([{ id: "d1", speaker: "", text: "" }]);
  const [mustHaveSentences, setMustHaveSentences] = useState("");

  const addDialog = () =>
    setCustomDialogs((prev) => [...prev, { id: `d${Date.now()}`, speaker: "", text: "" }]);
  const updateDialog = (id: string, field: "speaker" | "text", value: string) =>
    setCustomDialogs((prev) => prev.map((d) => (d.id === id ? { ...d, [field]: value } : d)));
  const removeDialog = (id: string) =>
    setCustomDialogs((prev) => prev.filter((d) => d.id !== id));

  const selectedCat = CATEGORIES.find((c) => c.id === category);
  const questions   = category ? GUIDED_QUESTIONS[category] : [];

  const addMoment = () =>
    setMoments((prev) => [...prev, { id: `m${Date.now()}`, title: "", description: "" }]);
  const updateMoment = (id: string, field: "title" | "description", value: string) =>
    setMoments((prev) => prev.map((m) => (m.id === id ? { ...m, [field]: value } : m)));
  const removeMoment = (id: string) => {
    if (moments.length === 1) return;
    setMoments((prev) => prev.filter((m) => m.id !== id));
  };

  const handleNext = () => {
    const hasContent = storyInput.trim() ||
      Object.values(answers).some((v) => v.trim()) ||
      moments.some((m) => m.title.trim());
    if (!hasContent) { toast.error("Bitte gib uns ein paar Infos zu deiner Geschichte."); return; }

    const momentsText = moments
      .filter((m) => m.title.trim())
      .map((m) => `${m.title}: ${m.description}`)
      .join(" | ");

    // Tone mapping: im geführten Modus aus Kategorie, im Freitext aus comicStyle
    let finalTone = "humorvoll";
    if (mode === "gefuehrt" && selectedCat) {
      finalTone = selectedCat.tone;
    } else if (mode === "frei") {
      // Im Freitext: tone aus comicStyle ableiten
      const styleToTone: Record<ComicStyle, string> = {
        action: "episch",
        emotional: "romantisch",
        humor: "humorvoll",
      };
      finalTone = styleToTone[comicStyle] || "humorvoll";
    }

    setProject({
      id: `proj-${Date.now()}`,
      title: comicTitle || "Mein persönlicher Comic",
      storyInput,
      guidedAnswers: {
        ...answers,
        specialMoments: momentsText,
        characters: answers.personen || "",
        location: answers.ort || "",
        timeframe: answers.zeitraum || "",
        category: category || "sonstiges",
      },
      tone: finalTone as any,
      comicStyle,
      dialogMode,
      customDialogs: dialogMode === "custom" ? customDialogs : [],
      mustHaveSentences,
      design: "kinderbuch",
      characters: [],
      chapters: [],
      status: "draft",
      createdAt: new Date().toISOString(),
    });
    setStep(1);
  };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-2xl mx-auto space-y-8">

      <div className="text-center space-y-3">
        <h2 className="text-3xl font-bold text-gray-800" style={{ fontFamily: "var(--font-display)" }}>
          Erzähl uns deine Geschichte
        </h2>
        <p className="text-gray-500 text-lg">Schreib frei oder lass dich Schritt für Schritt führen.</p>
        <p className="text-sm text-gray-400 max-w-md mx-auto">
          Stichpunkte reichen völlig – je mehr Details, desto persönlicher wird dein Comic
        </p>
      </div>

      <div className="flex gap-3 bg-white border border-gray-200 p-1.5 rounded-xl shadow-sm">
        <button onClick={() => setMode("gefuehrt")} className={`flex-1 py-3 rounded-lg text-sm font-medium transition-all ${mode === "gefuehrt" ? "bg-brand-600 text-white shadow-sm" : "text-gray-600 hover:text-brand-700"}`}>
          Schritt für Schritt
        </button>
        <button onClick={() => setMode("frei")} className={`flex-1 py-3 rounded-lg text-sm font-medium transition-all ${mode === "frei" ? "bg-brand-600 text-white shadow-sm" : "text-gray-600 hover:text-brand-700"}`}>
          Freitext
        </button>
      </div>

      {mode === "frei" && (
        <div className="space-y-6">
          {/* Titel */}
          <div className="space-y-2">
            <label className="text-sm font-semibold text-gray-700">Titel deines Comics</label>
            <input
              value={comicTitle}
              onChange={(e) => setComicTitle(e.target.value)}
              placeholder="z. B. Unser Sommer auf Sardinien"
              className="w-full p-3 rounded-xl border-2 border-gray-200 focus:border-brand-500 focus:outline-none text-gray-700 bg-white transition-all"
            />
          </div>

          {/* Comic-Stil */}
          <div className="space-y-3">
            <label className="text-sm font-semibold text-gray-700">Comic-Stil</label>
            <div className="grid grid-cols-3 gap-3">
              {COMIC_STYLES.map((cs) => {
                const IconComponent = styleIcons[cs.icon];
                return (
                  <button
                    key={cs.id}
                    onClick={() => setComicStyle(cs.id)}
                    className={`p-5 rounded-xl border-2 text-center transition-all shadow-sm hover:shadow-md space-y-2 ${
                      comicStyle === cs.id 
                        ? "border-brand-500 bg-brand-50 shadow-lg shadow-brand-100" 
                        : "border-gray-200 bg-white hover:border-brand-300 hover:bg-brand-50"
                    }`}
                  >
                    <div className={`mx-auto ${comicStyle === cs.id ? 'text-brand-600 scale-110' : 'text-brand-500'} transition-all`}>
                      <IconComponent className="w-10 h-10 mx-auto" />
                    </div>
                    <div className="text-sm font-semibold text-gray-800">{cs.label}</div>
                    <div className="text-xs text-gray-500 leading-snug">{cs.desc}</div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Freitext */}
          <div className="space-y-3">
            <label className="text-sm font-semibold text-gray-700">Deine Geschichte</label>
            <textarea
              value={storyInput}
              onChange={(e) => setStoryInput(e.target.value)}
              placeholder="Stichpunkte reichen! z. B.: Toskana, Sommer 2023, Emma 6 Jahre, erster Gelato, Sonnenuntergang am Strand, Papa hat Pizza verbrannt, Mama hat gelacht..."
              rows={12}
              className="w-full p-4 rounded-xl border-2 border-gray-200 focus:border-brand-500 focus:outline-none resize-none text-gray-700 bg-white shadow-sm transition-all"
            />
            <p className="text-xs text-gray-400 text-right">{storyInput.length} Zeichen</p>
          </div>
        </div>
      )}

      {mode === "gefuehrt" && (
        <div className="space-y-6">

          {/* 1. Kategorie */}
          <div className="space-y-3">
            <label className="text-sm font-semibold text-gray-700">1. Um was für eine Geschichte handelt es sich?</label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {CATEGORIES.map((cat) => {
                const IconComponent = categoryIcons[cat.icon as keyof typeof categoryIcons];
                return (
                  <button
                    key={cat.id}
                    onClick={() => { setCategory(cat.id); setAnswers({}); }}
                    className={`p-5 rounded-xl border-2 text-center transition-all shadow-sm hover:shadow-md ${
                      category === cat.id 
                        ? "border-brand-500 bg-brand-50 shadow-lg shadow-brand-100" 
                        : "border-gray-200 bg-white hover:border-brand-300 hover:bg-brand-50"
                    }`}
                  >
                    <div className={`mx-auto mb-2 ${category === cat.id ? 'text-brand-600 scale-110' : 'text-brand-500'} transition-all`}>
                      <IconComponent className="w-12 h-12 mx-auto" />
                    </div>
                    <div className="text-sm font-medium text-gray-800">{cat.label}</div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 2. Comic-Stil */}
          <AnimatePresence>
            {category && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-3">
                <label className="text-sm font-semibold text-gray-700">2. Welchen Comic-Stil soll deine Geschichte haben?</label>
                <div className="grid grid-cols-3 gap-3">
                  {COMIC_STYLES.map((cs) => {
                    const IconComponent = styleIcons[cs.icon];
                    return (
                      <button
                        key={cs.id}
                        onClick={() => setComicStyle(cs.id)}
                        className={`p-5 rounded-xl border-2 text-center transition-all shadow-sm hover:shadow-md space-y-2 ${
                          comicStyle === cs.id 
                            ? "border-brand-500 bg-brand-50 shadow-lg shadow-brand-100" 
                            : "border-gray-200 bg-white hover:border-brand-300 hover:bg-brand-50"
                        }`}
                      >
                        <div className={`mx-auto ${comicStyle === cs.id ? 'text-brand-600 scale-110' : 'text-brand-500'} transition-all`}>
                          <IconComponent className="w-10 h-10 mx-auto" />
                        </div>
                        <div className="text-sm font-semibold text-gray-800">{cs.label}</div>
                        <div className="text-xs text-gray-500 leading-snug">{cs.desc}</div>
                      </button>
                    );
                  })}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* 3. Titel */}
          <AnimatePresence>
            {category && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-2">
                <label className="text-sm font-semibold text-gray-700">
                  3. Titel deines Comics
                </label>
                <input
                  value={comicTitle}
                  onChange={(e) => setComicTitle(e.target.value)}
                  placeholder="z. B. Operation Gartenfest, Für die beste Oma der Welt"
                  className="w-full p-3 rounded-xl border-2 border-brand-100 focus:border-brand-400 focus:outline-none text-gray-700 bg-white transition-all"
                />
                <p className="text-xs text-gray-400">Wird auf dem Cover und als Buchtitel verwendet.</p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* 4. Fragen */}
          <AnimatePresence>
            {category && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-4">
                <label className="text-sm font-semibold text-gray-700">
                  4. Ein paar Infos <span className="font-normal text-gray-400">(alles optional – Stichpunkte reichen)</span>
                </label>
                {questions.map(({ key, label, placeholder }) => (
                  <div key={key} className="space-y-1">
                    <label className="text-sm font-medium text-gray-600">{label}</label>
                    <input
                      value={answers[key] || ""}
                      onChange={(e) => setAnswers({ ...answers, [key]: e.target.value })}
                      placeholder={placeholder}
                      className="w-full p-3 rounded-xl border-2 border-gray-200 focus:border-brand-500 focus:outline-none text-gray-700 bg-white transition-all"
                    />
                  </div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>

          {/* 4. Momente */}
          <AnimatePresence>
            {category && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
                <label className="text-sm font-semibold text-gray-700">
                  5. Besondere Momente / Szenen{" "}
                  <span className="font-normal text-gray-400">(jeder Moment wird ein Panel)</span>
                </label>
                <p className="text-xs text-gray-400">Jeder Moment bekommt seine eigene Illustration.</p>
                <div className="space-y-3">
                  {moments.map((moment, i) => (
                    <motion.div key={moment.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className="bg-white border border-gray-200 rounded-xl p-4 space-y-3">
                      <div className="flex items-center gap-3">
                        <span className="text-xs font-semibold text-gray-400 w-8">#{i + 1}</span>
                        <input
                          value={moment.title}
                          onChange={(e) => updateMoment(moment.id, "title", e.target.value)}
                          placeholder="Titel, z. B. Der erste Gelato"
                          className="flex-1 p-2.5 rounded-lg border-2 border-gray-200 focus:border-brand-500 focus:outline-none text-sm text-gray-700 bg-white"
                        />
                        {moments.length > 1 && (
                          <button onClick={() => removeMoment(moment.id)} className="text-gray-300 hover:text-red-500 text-xl">×</button>
                        )}
                      </div>
                      <textarea
                        value={moment.description}
                        onChange={(e) => updateMoment(moment.id, "description", e.target.value)}
                        placeholder="Kurze Beschreibung – Stichpunkte reichen!"
                        rows={2}
                        className="w-full p-2.5 rounded-lg border-2 border-gray-200 focus:border-brand-500 focus:outline-none text-sm text-gray-700 bg-white resize-none"
                      />
                    </motion.div>
                  ))}
                </div>
                <button
                  onClick={addMoment}
                  className="w-full py-3 rounded-xl border-2 border-dashed border-gray-300 text-gray-500 text-sm font-medium hover:bg-gray-50 hover:border-brand-400 hover:text-brand-600 transition-all flex items-center justify-center gap-2"
                >
                  <span className="text-lg">+</span> Weiteren Moment hinzufügen
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* 5. Dialoge & Wichtige Sätze */}
          <AnimatePresence>
            {category && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4 border-t border-gray-200 pt-6">
                <label className="text-sm font-semibold text-gray-700">
                  6. Dialoge <span className="font-normal text-gray-400">(optional)</span>
                </label>
                <div className="flex gap-3 bg-white border border-gray-200 p-1.5 rounded-xl shadow-sm">
                  <button
                    onClick={() => setDialogMode("auto")}
                    className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-all ${dialogMode === "auto" ? "bg-brand-600 text-white shadow-sm" : "text-gray-600 hover:text-brand-700"}`}
                  >
                    Automatisch vorschlagen
                  </button>
                  <button
                    onClick={() => setDialogMode("custom")}
                    className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-all ${dialogMode === "custom" ? "bg-brand-600 text-white shadow-sm" : "text-gray-600 hover:text-brand-700"}`}
                  >
                    Eigene Dialoge
                  </button>
                </div>
                <p className="text-xs text-gray-400">
                  {dialogMode === "auto"
                    ? "Wir schlagen passende Dialoge vor – du kannst sie in der Vorschau anpassen."
                    : "Gib eigene Dialoge ein – fehlende werden automatisch ergänzt."}
                </p>

                <AnimatePresence>
                  {dialogMode === "custom" && (
                    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-3">
                      {customDialogs.map((d, i) => (
                        <motion.div key={d.id} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} className="bg-white border border-gray-200 rounded-xl p-4 space-y-3">
                          <div className="flex items-center gap-3">
                            <span className="text-xs font-semibold text-gray-400 w-8">#{i + 1}</span>
                            <input
                              value={d.speaker}
                              onChange={(e) => updateDialog(d.id, "speaker", e.target.value)}
                              placeholder="Sprecher, z. B. Max"
                              className="w-36 p-2.5 rounded-lg border-2 border-gray-200 focus:border-brand-500 focus:outline-none text-sm text-gray-700 bg-white"
                            />
                            {customDialogs.length > 1 && (
                              <button onClick={() => removeDialog(d.id)} className="ml-auto text-gray-300 hover:text-red-500 text-xl">×</button>
                            )}
                          </div>
                          <input
                            value={d.text}
                            onChange={(e) => updateDialog(d.id, "text", e.target.value)}
                            placeholder="Dialog, z. B. Warte, kennst du mich?"
                            className="w-full p-2.5 rounded-lg border-2 border-gray-200 focus:border-brand-500 focus:outline-none text-sm text-gray-700 bg-white"
                          />
                        </motion.div>
                      ))}
                      <button
                        onClick={addDialog}
                        className="w-full py-3 rounded-xl border-2 border-dashed border-gray-300 text-gray-500 text-sm font-medium hover:bg-gray-50 hover:border-brand-400 hover:text-brand-600 transition-all flex items-center justify-center gap-2"
                      >
                        <span className="text-lg">+</span> Dialog hinzufügen
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className="space-y-2">
                  <label className="text-sm font-semibold text-gray-700">
                    Wichtige Sätze <span className="font-normal text-gray-400">(optional)</span>
                  </label>
                  <textarea
                    value={mustHaveSentences}
                    onChange={(e) => setMustHaveSentences(e.target.value)}
                    placeholder="Gibt es Sätze die unbedingt vorkommen sollen? z. B. 'Ich liebe dich mehr als Pizza'"
                    rows={2}
                    className="w-full p-3 rounded-xl border-2 border-gray-200 focus:border-brand-500 focus:outline-none text-gray-700 bg-white resize-none transition-all"
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      <Button onClick={handleNext} size="lg" fullWidth>
        Weiter zu den Bildern →
      </Button>
    </motion.div>
  );
}

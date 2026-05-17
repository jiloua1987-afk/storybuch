"use client";
import { useState } from "react";
import { motion } from "framer-motion";
import { usePosterStore } from "@/store/posterStore";
import Button from "@/components/ui/Button";
import toast from "react-hot-toast";

const MOMENT_SUGGESTIONS: Record<string, string[]> = {
  freunde: ["Ein unvergesslicher Abend", "Unser erstes Abenteuer", "Der lustigste Moment", "Wiedersehen nach langer Zeit"],
  familie: ["Frühstück am Sonntag", "Spielplatz-Abenteuer", "Familienausflug", "Geburtstagssurprise"],
  liebe:   ["Das erste Date", "Unser Lieblingsrestaurant", "Ein romantischer Abend", "Unser Abenteuer"],
  urlaub:  ["Ankunft am Urlaubsort", "Das kulinarische Highlight", "Der unvergessliche Ausflug", "Strandtag"],
  feier:   ["Die Überraschungsparty", "Der Höhepunkt der Feier", "Das Wiedersehen", "Der Jubiläumsabend"],
  sonstiges: ["Ein besonderer Moment", "Unser Abenteuer", "Ein Tag den wir nie vergessen"],
};

export default function PosterStep2Moment() {
  const { setStep, project, updateProject } = usePosterStore();
  const [title, setTitle] = useState(project?.title || "");
  const [moment, setMoment] = useState(project?.moment || "");

  const suggestions = MOMENT_SUGGESTIONS[project?.category || "sonstiges"] || [];

  const handleNext = () => {
    if (!title.trim()) { toast.error("Bitte gib deinem Poster einen Titel."); return; }
    if (!moment.trim()) { toast.error("Bitte beschreibe den Moment."); return; }
    updateProject({ title, moment });
    setStep(2);
  };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-2xl mx-auto space-y-8">
      <div className="text-center space-y-3">
        <h2 className="text-4xl font-bold text-gray-900 tracking-tight" style={{ fontFamily: "var(--font-display)" }}>
          Der Moment
        </h2>
        <p className="text-gray-600 text-lg">Ein Moment — drei Panels. Was soll auf deinem Poster zu sehen sein?</p>
      </div>

      {/* Titel */}
      <div className="space-y-2">
        <label className="text-sm font-semibold text-gray-900">Titel des Posters</label>
        <input value={title} onChange={(e) => setTitle(e.target.value)}
          placeholder="z.B. Ein Tag in Frankfurt"
          className="w-full p-3.5 rounded-xl border border-gray-200 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 focus:outline-none text-gray-900 bg-white" />
      </div>

      {/* Vorschläge */}
      {suggestions.length > 0 && (
        <div className="space-y-3">
          <label className="text-sm font-semibold text-gray-700">💡 Vorschläge</label>
          <div className="flex flex-wrap gap-2">
            {suggestions.map((s) => (
              <button key={s} onClick={() => setMoment(s)}
                className="px-4 py-2 rounded-lg border-2 border-brand-200 text-brand-700 text-sm font-medium hover:bg-brand-50 hover:border-brand-400 transition-all">
                + {s}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Moment */}
      <div className="space-y-2">
        <label className="text-sm font-semibold text-gray-900">Beschreibe den Moment</label>
        <textarea value={moment} onChange={(e) => setMoment(e.target.value)}
          placeholder="z.B. Wir essen im türkischen Restaurant in Frankfurt. Jil probiert die scharfe Suppe und bereut es sofort. Tek und Ray lachen sich kaputt."
          rows={5}
          className="w-full p-4 rounded-xl border border-gray-200 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 focus:outline-none resize-none text-gray-900 bg-white" />
        <p className="text-xs text-gray-400">Stichpunkte reichen. Je konkreter, desto besser.</p>
      </div>

      {/* Charaktere anzeigen */}
      {project?.characters && project.characters.length > 0 && (
        <div className="bg-brand-50 rounded-xl p-4 space-y-2">
          <p className="text-sm font-semibold text-gray-700">Charaktere auf dem Poster:</p>
          <div className="flex flex-wrap gap-2">
            {project.characters.map((c) => (
              <span key={c.id} className="px-3 py-1 bg-white border border-brand-200 rounded-full text-sm text-brand-700 font-medium">
                {c.name}
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="flex gap-3">
        <Button variant="secondary" onClick={() => setStep(0)}>← Zurück</Button>
        <Button onClick={handleNext} fullWidth>Poster erstellen →</Button>
      </div>
    </motion.div>
  );
}

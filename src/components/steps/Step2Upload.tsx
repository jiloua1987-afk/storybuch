"use client";
import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useDropzone } from "react-dropzone";
import { useBookStore, DialogMode, CustomDialog } from "@/store/bookStore";
import Button from "@/components/ui/Button";
import toast from "react-hot-toast";
import Image from "next/image";

interface UploadedImage {
  id: string;
  file: File;
  preview: string;
  label: string;
  type: "person" | "location" | "situation";
}

export default function Step2Upload() {
  const { setStep, project, updateProject } = useBookStore();
  const [images, setImages] = useState<UploadedImage[]>([]);
  const [consent, setConsent] = useState(false);
  const [activeType, setActiveType] = useState<"person" | "location" | "situation">("person");
  const [labelInput, setLabelInput] = useState("");
  const [dialogMode, setDialogMode] = useState<DialogMode>(project?.dialogMode || "auto");
  const [customDialogs, setCustomDialogs] = useState<CustomDialog[]>(
    project?.customDialogs?.length ? project.customDialogs : [{ id: "d1", speaker: "", text: "" }]
  );
  const [mustHaveSentences, setMustHaveSentences] = useState(project?.mustHaveSentences || "");

  const addDialog = () =>
    setCustomDialogs((prev) => [...prev, { id: `d${Date.now()}`, speaker: "", text: "" }]);
  const updateDialog = (id: string, field: "speaker" | "text", value: string) =>
    setCustomDialogs((prev) => prev.map((d) => (d.id === id ? { ...d, [field]: value } : d)));
  const removeDialog = (id: string) =>
    setCustomDialogs((prev) => prev.filter((d) => d.id !== id));

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      if (!consent) {
        toast.error("Bitte stimme zuerst der Datenschutzerklärung zu.");
        return;
      }
      const newImages: UploadedImage[] = acceptedFiles.map((file) => ({
        id: `img-${Date.now()}-${Math.random()}`,
        file,
        preview: URL.createObjectURL(file),
        label: labelInput || file.name.replace(/\.[^.]+$/, ""),
        type: activeType,
      }));
      setImages((prev) => [...prev, ...newImages]);
      setLabelInput("");
      toast.success(`${acceptedFiles.length} Bild(er) hochgeladen!`);
    },
    [consent, activeType, labelInput]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "image/*": [".jpg", ".jpeg", ".png", ".webp"] },
    maxSize: 10 * 1024 * 1024,
  });

  const removeImage = (id: string) => {
    setImages((prev) => prev.filter((img) => img.id !== id));
  };

  const handleNext = () => {
    // Save character images to project
    const characters = images
      .filter((img) => img.type === "person")
      .map((img) => ({
        id: img.id,
        name: img.label,
        role: "Hauptfigur",
        imageUrl: img.preview,
      }));
    updateProject({
      characters,
      dialogMode,
      customDialogs: dialogMode === "custom" ? customDialogs : [],
      mustHaveSentences,
    });
    setStep(2);
  };

  const typeLabels = {
    person: { label: "Person", emoji: "👤", desc: "Personen, die im Buch vorkommen" },
    location: { label: "Ort", emoji: "📍", desc: "Orte und Schauplätze" },
    situation: { label: "Situation", emoji: "📷", desc: "Besondere Momente & Szenen" },
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-2xl mx-auto space-y-8"
    >
      <div className="text-center space-y-2">
        <h2 className="text-3xl font-bold text-brand-800" style={{ fontFamily: "var(--font-display)" }}>
          Deine Bilder 📸
        </h2>
        <p className="text-gray-500">
          Komplett optional – aber je mehr Fotos, desto persönlicher wird dein Buch.
        </p>
        <div className="inline-flex items-center gap-2 bg-green-50 text-green-700 border border-green-200 px-4 py-2 rounded-full text-sm">
          💡 Keine Fotos? Kein Problem – du kannst diesen Schritt überspringen
        </div>
      </div>

      {/* DSGVO Consent */}
      <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 space-y-3">
        <p className="text-sm text-amber-800 font-medium">🔐 Datenschutzhinweis</p>
        <p className="text-xs text-amber-700">
          Deine Bilder werden ausschließlich zur Erstellung deines Buches verwendet und nicht an Dritte weitergegeben.
          Bilder echter Personen werden nur mit deren Einverständnis verarbeitet. Du kannst deine Daten jederzeit löschen lassen.
        </p>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={consent}
            onChange={(e) => setConsent(e.target.checked)}
            className="w-4 h-4 accent-brand-500"
          />
          <span className="text-sm text-amber-800">
            Ich stimme der Verarbeitung meiner Bilder zu und bestätige, dass ich die Einwilligung aller abgebildeten Personen habe.
          </span>
        </label>
      </div>

      {/* Type selector */}
      <div className="flex gap-2">
        {(Object.keys(typeLabels) as Array<keyof typeof typeLabels>).map((type) => (
          <button
            key={type}
            onClick={() => setActiveType(type)}
            className={`flex-1 p-3 rounded-xl border-2 text-center transition-all ${
              activeType === type
                ? "border-brand-400 bg-brand-50 text-brand-700"
                : "border-gray-100 bg-white text-gray-500 hover:border-brand-200"
            }`}
          >
            <div className="text-xl">{typeLabels[type].emoji}</div>
            <div className="text-xs font-medium mt-1">{typeLabels[type].label}</div>
          </button>
        ))}
      </div>

      {/* Label input */}
      <input
        value={labelInput}
        onChange={(e) => setLabelInput(e.target.value)}
        placeholder={`Name für ${typeLabels[activeType].label} (z. B. "Emma")`}
        className="w-full p-3 rounded-xl border-2 border-brand-100 focus:border-brand-400 focus:outline-none text-gray-700 bg-white"
      />

      {/* Dropzone */}
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-all ${
          isDragActive
            ? "border-brand-400 bg-brand-50"
            : consent
            ? "border-brand-200 hover:border-brand-400 hover:bg-brand-50"
            : "border-gray-200 bg-gray-50 opacity-50 cursor-not-allowed"
        }`}
      >
        <input {...getInputProps()} disabled={!consent} />
        <div className="text-4xl mb-3">{isDragActive ? "📂" : "📁"}</div>
        <p className="text-brand-700 font-medium">
          {isDragActive ? "Loslassen zum Hochladen" : "Bilder hierher ziehen oder klicken"}
        </p>
        <p className="text-xs text-gray-400 mt-1">JPG, PNG, WEBP – max. 10 MB pro Bild</p>
      </div>

      {/* Uploaded images */}
      <AnimatePresence>
        {images.length > 0 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
            <h3 className="text-sm font-medium text-brand-700">Hochgeladene Bilder ({images.length})</h3>
            <div className="grid grid-cols-3 gap-3">
              {images.map((img) => (
                <motion.div
                  key={img.id}
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.8, opacity: 0 }}
                  className="relative group rounded-xl overflow-hidden aspect-square bg-gray-100"
                >
                  <Image src={img.preview} alt={img.label} fill className="object-cover" />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-all flex flex-col items-center justify-center gap-1">
                    <span className="text-white text-xs font-medium px-2 text-center">{img.label}</span>
                    <span className="text-white/70 text-xs">{typeLabels[img.type].emoji}</span>
                    <button
                      onClick={() => removeImage(img.id)}
                      className="mt-1 bg-red-500 text-white text-xs px-2 py-1 rounded-lg"
                    >
                      Entfernen
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Dialoge & Wichtige Sätze ── */}
      <div className="space-y-6 border-t border-brand-100 pt-6">
        <h3 className="text-sm font-semibold text-brand-700">💬 Dialoge für deinen Comic</h3>

        {/* Dialog-Modus */}
        <div className="flex gap-3 bg-brand-50 p-1 rounded-2xl">
          <button
            onClick={() => setDialogMode("auto")}
            className={`flex-1 py-2 rounded-xl text-sm font-medium transition-all ${dialogMode === "auto" ? "bg-white shadow text-brand-700" : "text-gray-500"}`}
          >
            ✨ Automatisch vorschlagen
          </button>
          <button
            onClick={() => setDialogMode("custom")}
            className={`flex-1 py-2 rounded-xl text-sm font-medium transition-all ${dialogMode === "custom" ? "bg-white shadow text-brand-700" : "text-gray-500"}`}
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
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-3">
              {customDialogs.map((d, i) => (
                <motion.div key={d.id} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} className="bg-brand-50 rounded-2xl p-4 space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-brand-400 w-5">#{i + 1}</span>
                    <input
                      value={d.speaker}
                      onChange={(e) => updateDialog(d.id, "speaker", e.target.value)}
                      placeholder="Sprecher, z. B. Max"
                      className="w-36 p-2 rounded-xl border-2 border-brand-100 focus:border-brand-400 focus:outline-none text-sm text-gray-700 bg-white"
                    />
                    {customDialogs.length > 1 && (
                      <button onClick={() => removeDialog(d.id)} className="ml-auto text-gray-300 hover:text-red-400 text-xl">×</button>
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

        {/* Must-Have Sätze */}
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
      </div>

      <div className="flex gap-3">
        <Button variant="secondary" onClick={() => setStep(0)}>
          ← Zurück
        </Button>
        <Button onClick={handleNext} fullWidth>
          Weiter zum Stil →
        </Button>
      </div>
    </motion.div>
  );
}
# Sun Apr 12 11:11:30 CEST 2026

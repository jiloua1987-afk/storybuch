"use client";
import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useDropzone } from "react-dropzone";
import { useBookStore } from "@/store/bookStore";
import Button from "@/components/ui/Button";
import toast from "react-hot-toast";
import Image from "next/image";

interface UploadedImage {
  id: string;
  file: File;
  preview: string;
  base64: string;
  label: string;
  type: "person" | "location" | "situation";
}

async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve((e.target?.result as string).split(",")[1] || "");
    reader.readAsDataURL(file);
  });
}

export default function Step2Upload() {
  const { setStep, project, updateProject } = useBookStore();
  const [images, setImages] = useState<UploadedImage[]>([]);
  const [consent, setConsent] = useState(false);
  const [labelInput, setLabelInput] = useState("");
  const [uploading, setUploading] = useState(false);

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      if (!consent) { toast.error("Bitte stimme zuerst der Datenschutzerklärung zu."); return; }
      const newImages: UploadedImage[] = await Promise.all(acceptedFiles.map(async (file) => ({
        id: `img-${Date.now()}-${Math.random()}`,
        file,
        preview: URL.createObjectURL(file),
        base64: await fileToBase64(file),
        label: labelInput || file.name.replace(/\.[^.]+$/, ""),
        type: activeType,
      })));
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

  const removeImage = (id: string) => setImages((prev) => prev.filter((img) => img.id !== id));

  const handleNext = async () => {
    setUploading(true);
    try {
    let referenceImageUrls: { label: string; url: string }[] = [];
    const personImages = images.filter(img => img.type === "person");

    if (personImages.length > 0) {
      try {
        const formData = new FormData();
        personImages.forEach(img => {
          formData.append("files", img.file);
          formData.append("labels", img.label);
        });
        const res = await fetch("/api/upload", { method: "POST", body: formData });
        if (res.ok) {
          const data = await res.json();
          referenceImageUrls = data.uploaded || [];
        }
      } catch (e) {
        console.warn("Upload to Supabase failed, using base64 fallback");
      }
    }

    const characters = personImages.map((img) => ({
      id: img.id,
      name: img.label,
      role: "Hauptfigur",
      imageUrl: img.preview,
      base64: img.base64,
    }));
    const locationImages = images.filter(img => img.type === "location").map(img => img.base64).filter(Boolean);

    updateProject({
      characters,
      referenceImages: characters.map(c => c.base64).filter(Boolean), // Base64 fallback
      referenceImageUrls,  // Supabase URLs (primary)
      locationImages,
    });
    setStep(2);
    } finally {
      setUploading(false);
    }
  };

  const typeLabels = {
    person:    { label: "Person",    emoji: "👤", desc: "Personen, die im Comic vorkommen" },
    location:  { label: "Ort",       emoji: "📍", desc: "Orte und Schauplätze" },
    situation: { label: "Situation", emoji: "📷", desc: "Besondere Momente & Szenen" },
  };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-2xl mx-auto space-y-8">

      <div className="text-center space-y-2">
        <h2 className="text-3xl font-bold text-brand-800" style={{ fontFamily: "var(--font-display)" }}>
          Deine Bilder 📸
        </h2>
        <p className="text-gray-500">Komplett optional – aber je mehr Fotos, desto persönlicher wird dein Comic.</p>
        <div className="inline-flex items-center gap-2 bg-green-50 text-green-700 border border-green-200 px-4 py-2 rounded-full text-sm">
          💡 Keine Fotos? Kein Problem – du kannst diesen Schritt überspringen
        </div>
      </div>

      {/* DSGVO */}
      <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 space-y-3">
        <p className="text-sm text-amber-800 font-medium">🔐 Datenschutzhinweis</p>
        <p className="text-xs text-amber-700">
          Deine Bilder werden ausschließlich zur Erstellung deines Comics verwendet und nicht an Dritte weitergegeben.
        </p>
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="w-4 h-4 accent-brand-500" />
          <span className="text-sm text-amber-800">
            Ich stimme der Verarbeitung meiner Bilder zu und bestätige die Einwilligung aller abgebildeten Personen.
          </span>
        </label>
      </div>

      {/* Typ-Auswahl */}
      <div className="flex gap-2">
        {(Object.keys(typeLabels) as Array<keyof typeof typeLabels>).map((type) => (
          <button
            key={type}
            onClick={() => setActiveType(type)}
            className={`flex-1 p-3 rounded-xl border-2 text-center transition-all ${activeType === type ? "border-brand-400 bg-brand-50 text-brand-700" : "border-gray-100 bg-white text-gray-500 hover:border-brand-200"}`}
          >
            <div className="text-xl">{typeLabels[type].emoji}</div>
            <div className="text-xs font-medium mt-1">{typeLabels[type].label}</div>
          </button>
        ))}
      </div>

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
          isDragActive ? "border-brand-400 bg-brand-50"
          : consent ? "border-brand-200 hover:border-brand-400 hover:bg-brand-50"
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

      {/* Hochgeladene Bilder */}
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
                    <button onClick={() => removeImage(img.id)} className="mt-1 bg-red-500 text-white text-xs px-2 py-1 rounded-lg">
                      Entfernen
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex gap-3">
        <Button variant="secondary" onClick={() => setStep(0)}>← Zurück</Button>
        <Button onClick={handleNext} fullWidth disabled={uploading}>
          {uploading ? "Bilder werden hochgeladen…" : "Weiter zur Widmung →"}
        </Button>
      </div>
    </motion.div>
  );
}

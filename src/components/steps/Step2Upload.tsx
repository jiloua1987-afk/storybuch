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
  const [activeType, setActiveType] = useState<"person" | "location" | "situation">("person");
  const [labelInput, setLabelInput] = useState("");
  const [uploading, setUploading] = useState(false);
  const [familyCharacterNames, setFamilyCharacterNames] = useState("");  // NEW: For family photo mode

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
    const personImages = images.filter(img => img.type === "person");
    
    // Validation: If 1 photo (family mode), require character names
    if (personImages.length === 1 && !familyCharacterNames.trim()) {
      toast.error("Bitte gib die Namen der Personen im Foto ein (z.B. 'Marc, Hassan, Maria')");
      return;
    }
    
    setUploading(true);
    try {
    let referenceImageUrls: { label: string; url: string }[] = [];

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

    // Determine photo mode and characters
    let photoMode: "none" | "family" | "individual" = "none";
    let characters: any[] = [];
    
    if (personImages.length === 0) {
      photoMode = "none";
    } else if (personImages.length === 1) {
      // FAMILY MODE: 1 photo with multiple people
      photoMode = "family";
      // Parse character names from input (comma-separated)
      const names = familyCharacterNames.split(",").map(n => n.trim()).filter(Boolean);
      characters = names.map((name, i) => ({
        id: `char-${i}`,
        name,
        role: "Hauptfigur",
        imageUrl: personImages[0].preview,
        base64: personImages[0].base64,
      }));
    } else {
      // INDIVIDUAL MODE: 2+ separate photos
      photoMode = "individual";
      characters = personImages.map((img) => ({
        id: img.id,
        name: img.label,
        role: "Hauptfigur",
        imageUrl: img.preview,
        base64: img.base64,
      }));
    }
    
    const locationImages = images.filter(img => img.type === "location").map(img => img.base64).filter(Boolean);

    updateProject({
      characters,
      referenceImages: personImages.map(img => img.base64).filter(Boolean), // Base64 fallback
      referenceImageUrls,  // Supabase URLs (primary)
      locationImages,
      photoMode,
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

      <div className="text-center space-y-3">
        <h2 className="text-4xl font-bold text-gray-900 tracking-tight" style={{ fontFamily: "var(--font-display)" }}>
          Deine Bilder
        </h2>
        <p className="text-gray-600 text-lg leading-relaxed">Komplett optional – aber je mehr Fotos, desto persönlicher wird dein Comic.</p>
        <p className="text-sm text-gray-500 max-w-md mx-auto leading-relaxed">
          Keine Fotos? Kein Problem – du kannst diesen Schritt überspringen
        </p>
      </div>

      {/* DSGVO */}
      <div className="bg-amber-50/50 border border-amber-200/60 rounded-xl p-5 space-y-3">
        <p className="text-sm text-amber-900 font-semibold">Datenschutzhinweis</p>
        <p className="text-sm text-amber-800 leading-relaxed">
          Deine Bilder werden ausschließlich zur Erstellung deines Comics verwendet und nicht an Dritte weitergegeben.
        </p>
        <label className="flex items-start gap-3 cursor-pointer">
          <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-0.5 w-4 h-4 accent-brand-600" />
          <span className="text-sm text-amber-900 leading-relaxed">
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
            className={`flex-1 p-4 rounded-xl border text-center transition-all ${activeType === type ? "border-brand-600 bg-brand-50 text-brand-700" : "border-gray-200 bg-white text-gray-600 hover:border-brand-400 hover:bg-brand-50/30"}`}
          >
            <div className="text-2xl mb-1">{typeLabels[type].emoji}</div>
            <div className="text-xs font-medium">{typeLabels[type].label}</div>
          </button>
        ))}
      </div>

      <input
        value={labelInput}
        onChange={(e) => setLabelInput(e.target.value)}
        placeholder={`Name für ${typeLabels[activeType].label} (z. B. "Emma")`}
        className="w-full p-3.5 rounded-xl border border-gray-200 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 focus:outline-none text-gray-900 bg-white transition-all"
      />

      {/* Dropzone */}
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-all ${
          isDragActive ? "border-brand-500 bg-brand-50"
          : consent ? "border-gray-300 hover:border-brand-400 hover:bg-brand-50/30"
          : "border-gray-200 bg-gray-50 opacity-50 cursor-not-allowed"
        }`}
      >
        <input {...getInputProps()} disabled={!consent} />
        <div className="text-4xl mb-4">{isDragActive ? "📂" : "📁"}</div>
        <p className="text-gray-900 font-medium mb-1">
          {isDragActive ? "Loslassen zum Hochladen" : "Bilder hierher ziehen oder klicken"}
        </p>
        <p className="text-sm text-gray-500">JPG, PNG, WEBP – max. 10 MB pro Bild</p>
      </div>

      {/* Hochgeladene Bilder */}
      <AnimatePresence>
        {images.length > 0 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
            <h3 className="text-sm font-semibold text-gray-900">Hochgeladene Bilder ({images.length})</h3>
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
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-all flex flex-col items-center justify-center gap-2">
                    <span className="text-white text-sm font-medium px-3 text-center">{img.label}</span>
                    <button onClick={() => removeImage(img.id)} className="bg-red-500 text-white text-sm px-3 py-1.5 rounded-lg hover:bg-red-600 transition-colors">
                      Entfernen
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>
            
            {/* NEW: Character names input for family photo mode (1 photo) */}
            {images.filter(img => img.type === "person").length === 1 && (
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-5 space-y-3">
                <div className="flex items-start gap-2">
                  <span className="text-2xl">👥</span>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-blue-900 mb-1">Wer ist auf dem Foto?</p>
                    <p className="text-sm text-blue-800 mb-3">
                      Gib die Namen aller Personen ein (mit Komma getrennt)
                    </p>
                    <input
                      value={familyCharacterNames}
                      onChange={(e) => setFamilyCharacterNames(e.target.value)}
                      placeholder="z.B. Marc, Hassan, Maria"
                      className="w-full p-3 rounded-lg border border-blue-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none text-gray-900 bg-white"
                      required
                    />
                    <p className="text-xs text-blue-700 mt-2">
                      ✓ Diese Namen helfen uns, die Personen im Comic konsistent darzustellen
                    </p>
                  </div>
                </div>
              </div>
            )}
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

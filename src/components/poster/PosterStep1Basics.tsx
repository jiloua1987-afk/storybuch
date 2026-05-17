"use client";
import { useState, useCallback } from "react";
import { motion } from "framer-motion";
import { usePosterStore, PosterComicStyle, PosterOrientation } from "@/store/posterStore";
import Button from "@/components/ui/Button";
import toast from "react-hot-toast";
import Image from "next/image";

const CATEGORIES = [
  { id: "freunde",   label: "Freundschaft",     emoji: "🤝" },
  { id: "familie",   label: "Familie",           emoji: "👨‍👩‍👧‍👦" },
  { id: "liebe",     label: "Liebesgeschichte",  emoji: "❤️" },
  { id: "urlaub",    label: "Urlaub / Reise",    emoji: "✈️" },
  { id: "feier",     label: "Feier / Event",     emoji: "🎉" },
  { id: "sonstiges", label: "Sonstiges",         emoji: "⭐" },
];

const COMIC_STYLES: { id: PosterComicStyle; label: string; desc: string }[] = [
  { id: "emotional", label: "Emotional",  desc: "Warm, erzählerisch" },
  { id: "humor",     label: "Humor",      desc: "Lustig, spielerisch" },
  { id: "action",    label: "Action",     desc: "Dynamisch, energiegeladen" },
];

const ORIENTATIONS: { id: PosterOrientation; label: string; desc: string; ratio: string }[] = [
  { id: "portrait",  label: "Hochformat",  desc: "A3/A2 Poster",    ratio: "2/3" },
  { id: "landscape", label: "Querformat",  desc: "Panorama-Poster", ratio: "3/2" },
];

async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve((e.target?.result as string).split(",")[1] || "");
    reader.readAsDataURL(file);
  });
}

export default function PosterStep1Basics() {
  const { setStep, setProject } = usePosterStore();
  const [category, setCategory] = useState<string>("freunde");
  const [comicStyle, setComicStyle] = useState<PosterComicStyle>("emotional");
  const [orientation, setOrientation] = useState<PosterOrientation>("portrait");
  const [photoMode, setPhotoMode] = useState<"family" | "individual" | "none">("family");
  const [consent, setConsent] = useState(false);
  const [familyPhoto, setFamilyPhoto] = useState<File | null>(null);
  const [familyPhotoPreview, setFamilyPhotoPreview] = useState<string | null>(null);
  const [characterNames, setCharacterNames] = useState("");

  const handlePhotoSelect = useCallback(async (file: File) => {
    if (!consent) { toast.error("Bitte stimme zuerst der Datenschutzerklärung zu."); return; }
    setFamilyPhoto(file);
    setFamilyPhotoPreview(URL.createObjectURL(file));
    toast.success("Foto hochgeladen!");
  }, [consent]);

  const handleNext = async () => {
    if (photoMode === "family" && familyPhoto && !characterNames.trim()) {
      toast.error("Bitte gib die Namen der Personen im Foto ein.");
      return;
    }

    let referenceImageUrls: { label: string; url: string }[] = [];
    let referenceImages: string[] = [];

    if (photoMode === "family" && familyPhoto) {
      try {
        const formData = new FormData();
        formData.append("files", familyPhoto);
        formData.append("labels", "family");
        const res = await fetch("/api/upload", { method: "POST", body: formData });
        if (res.ok) {
          const data = await res.json();
          referenceImageUrls = data.uploaded || [];
        } else {
          const base64 = await fileToBase64(familyPhoto);
          referenceImages = [base64];
        }
      } catch {
        const base64 = await fileToBase64(familyPhoto);
        referenceImages = [base64];
      }
    }

    const names = characterNames.split(",").map(n => n.trim()).filter(Boolean);
    const characters = names.map((name, i) => ({ id: `char-${i}`, name }));

    setProject({
      id: `poster-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      title: "",
      moment: "",
      category,
      comicStyle,
      orientation,
      language: "de",
      photoMode,
      characters,
      referenceImages,
      referenceImageUrls,
      status: "draft",
      createdAt: new Date().toISOString(),
    });

    setStep(1);
  };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-2xl mx-auto space-y-8">
      <div className="text-center space-y-3">
        <h2 className="text-4xl font-bold text-gray-900 tracking-tight" style={{ fontFamily: "var(--font-display)" }}>
          Dein Comic-Poster
        </h2>
        <p className="text-gray-600 text-lg">Ein Moment. Drei Panels. Gedruckt als Poster.</p>
      </div>

      {/* Kategorie */}
      <div className="space-y-3">
        <label className="text-sm font-semibold text-gray-900">1. Um was für eine Geschichte handelt es sich?</label>
        <div className="grid grid-cols-3 gap-3">
          {CATEGORIES.map((cat) => (
            <button key={cat.id} onClick={() => setCategory(cat.id)}
              className={`p-4 rounded-xl border text-center transition-all ${
                category === cat.id ? "border-brand-600 bg-brand-50 shadow-sm" : "border-gray-200 bg-white hover:border-brand-400"
              }`}>
              <div className="text-2xl mb-1">{cat.emoji}</div>
              <div className="text-sm font-medium text-gray-900">{cat.label}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Stil */}
      <div className="space-y-3">
        <label className="text-sm font-semibold text-gray-900">2. Welchen Stil soll dein Poster haben?</label>
        <div className="grid grid-cols-3 gap-3">
          {COMIC_STYLES.map((cs) => (
            <button key={cs.id} onClick={() => setComicStyle(cs.id)}
              className={`p-4 rounded-xl border text-center transition-all ${
                comicStyle === cs.id ? "border-brand-600 bg-brand-50 shadow-sm" : "border-gray-200 bg-white hover:border-brand-400"
              }`}>
              <div className="text-sm font-semibold text-gray-900 mb-1">{cs.label}</div>
              <div className="text-xs text-gray-500">{cs.desc}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Format */}
      <div className="space-y-3">
        <label className="text-sm font-semibold text-gray-900">3. Format</label>
        <div className="grid grid-cols-2 gap-3">
          {ORIENTATIONS.map((o) => (
            <button key={o.id} onClick={() => setOrientation(o.id)}
              className={`p-4 rounded-xl border text-center transition-all ${
                orientation === o.id ? "border-brand-600 bg-brand-50 shadow-sm" : "border-gray-200 bg-white hover:border-brand-400"
              }`}>
              {/* Mini preview of aspect ratio */}
              <div className="flex justify-center mb-2">
                <div className={`bg-gray-200 rounded border border-gray-300 ${
                  o.id === "portrait" ? "w-8 h-12" : "w-12 h-8"
                }`} />
              </div>
              <div className="text-sm font-semibold text-gray-900">{o.label}</div>
              <div className="text-xs text-gray-500">{o.desc}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Foto */}
      <div className="space-y-4">
        <label className="text-sm font-semibold text-gray-900">4. Foto (optional, aber empfohlen)</label>

        {/* DSGVO */}
        <div className="bg-amber-50/50 border border-amber-200/60 rounded-xl p-4 space-y-2">
          <label className="flex items-start gap-3 cursor-pointer">
            <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)}
              className="mt-0.5 w-4 h-4 accent-brand-600" />
            <span className="text-sm text-amber-900 leading-relaxed">
              Ich stimme der Verarbeitung meiner Bilder zu und bestätige die Einwilligung aller abgebildeten Personen.
            </span>
          </label>
        </div>

        <div className="flex gap-3">
          {["family", "none"].map((mode) => (
            <button key={mode} onClick={() => setPhotoMode(mode as any)}
              className={`flex-1 p-3 rounded-xl border text-sm font-medium transition-all ${
                photoMode === mode ? "border-brand-600 bg-brand-50" : "border-gray-200 bg-white hover:border-brand-400"
              }`}>
              {mode === "family" ? "📷 Foto hochladen" : "🎨 Ohne Foto"}
            </button>
          ))}
        </div>

        {photoMode === "family" && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
            <label className={`block border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all ${
              consent ? "border-gray-300 hover:border-brand-400 hover:bg-brand-50/30" : "border-gray-200 bg-gray-50 opacity-50 cursor-not-allowed"
            }`}>
              <input type="file" accept="image/*" disabled={!consent} className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) handlePhotoSelect(f); }} />
              <div className="text-3xl mb-2">📁</div>
              <p className="text-sm font-medium text-gray-700">Foto hochladen</p>
              <p className="text-xs text-gray-500 mt-1">JPG, PNG – max. 10 MB</p>
            </label>

            {familyPhotoPreview && (
              <div className="space-y-3">
                <div className="relative rounded-xl overflow-hidden aspect-video bg-gray-100">
                  <Image src={familyPhotoPreview} alt="Foto" fill className="object-cover" />
                  <button onClick={() => { setFamilyPhoto(null); setFamilyPhotoPreview(null); }}
                    className="absolute top-2 right-2 bg-red-500 text-white text-sm px-3 py-1.5 rounded-lg hover:bg-red-600">
                    Entfernen
                  </button>
                </div>
                <input value={characterNames} onChange={(e) => setCharacterNames(e.target.value)}
                  placeholder="Namen der Personen, z.B. Jil, Tek, Ray"
                  className="w-full p-3 rounded-lg border border-gray-200 focus:border-brand-500 focus:outline-none text-gray-900 bg-white" />
              </div>
            )}
          </motion.div>
        )}
      </div>

      <Button onClick={handleNext} size="lg" fullWidth>
        Weiter zum Moment →
      </Button>
    </motion.div>
  );
}

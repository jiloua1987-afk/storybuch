"use client";
import { useState, useCallback } from "react";
import { motion } from "framer-motion";
import { useDropzone } from "react-dropzone";
import { useBookStore, ComicStyle } from "@/store/bookStore";
import Button from "@/components/ui/Button";
import toast from "react-hot-toast";
import Image from "next/image";
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
  { id: "action",    icon: "action", label: "Action",    desc: "Dynamisch, energiegeladen" },
  { id: "emotional", icon: "emotional", label: "Emotional", desc: "Ruhig, warm, erzählerisch" },
  { id: "humor",     icon: "humor", label: "Humor",     desc: "Lustig, spielerisch" },
];

type PhotoMode = "family" | "individual" | "none";

interface Character {
  id: string;
  name: string;
  photo: File | null;
  preview: string | null;
}

async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve((e.target?.result as string).split(",")[1] || "");
    reader.readAsDataURL(file);
  });
}

export default function Step1Basics() {
  const { setStep, setProject } = useBookStore();
  const [category, setCategory] = useState<string | null>(null);
  const [comicStyle, setComicStyle] = useState<ComicStyle>("emotional");
  const [photoMode, setPhotoMode] = useState<PhotoMode>("family");
  const [consent, setConsent] = useState(false);
  
  // Family photo
  const [familyPhoto, setFamilyPhoto] = useState<File | null>(null);
  const [familyPhotoPreview, setFamilyPhotoPreview] = useState<string | null>(null);
  const [familyCharacterNames, setFamilyCharacterNames] = useState("");  // NEW: Character names for family photo
  
  // Individual characters
  const [characters, setCharacters] = useState<Character[]>([
    { id: "c1", name: "", photo: null, preview: null }
  ]);

  const onDropFamily = useCallback(async (acceptedFiles: File[]) => {
    if (!consent) { toast.error("Bitte stimme zuerst der Datenschutzerklärung zu."); return; }
    const file = acceptedFiles[0];
    if (file) {
      setFamilyPhoto(file);
      setFamilyPhotoPreview(URL.createObjectURL(file));
      toast.success("Familienbild hochgeladen!");
    }
  }, [consent]);

  const { getRootProps: getFamilyRootProps, getInputProps: getFamilyInputProps, isDragActive: isFamilyDragActive } = useDropzone({
    onDrop: onDropFamily,
    accept: { "image/*": [".jpg", ".jpeg", ".png", ".webp"] },
    maxSize: 10 * 1024 * 1024,
    maxFiles: 1,
  });

  const addCharacter = () => {
    setCharacters([...characters, { id: `c${Date.now()}`, name: "", photo: null, preview: null }]);
  };

  const removeCharacter = (id: string) => {
    if (characters.length === 1) return;
    setCharacters(characters.filter(c => c.id !== id));
  };

  const updateCharacterName = (id: string, name: string) => {
    setCharacters(characters.map(c => c.id === id ? { ...c, name } : c));
  };

  const updateCharacterPhoto = async (id: string, file: File) => {
    if (!consent) { toast.error("Bitte stimme zuerst der Datenschutzerklärung zu."); return; }
    const preview = URL.createObjectURL(file);
    console.log(`📷 Photo uploaded for character ${id}:`, { fileName: file.name, preview });
    setCharacters(characters.map(c => c.id === id ? { ...c, photo: file, preview } : c));
    toast.success("Foto hochgeladen!");
  };

  const handleNext = async () => {
    if (!category) { toast.error("Bitte wähle eine Kategorie."); return; }

    // Validate photo mode
    if (photoMode === "family" && !familyPhoto && consent) {
      toast.error("Bitte lade ein Familienbild hoch oder wähle einen anderen Modus.");
      return;
    }
    if (photoMode === "family" && familyPhoto && !familyCharacterNames.trim()) {
      toast.error("Bitte gib die Namen der Personen im Foto ein (z.B. 'Marc, Hassan, Maria')");
      return;
    }
    if (photoMode === "individual") {
      const hasNames = characters.some(c => c.name.trim());
      if (!hasNames) {
        toast.error("Bitte gib mindestens einen Namen ein.");
        return;
      }
    }

    // Prepare data
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
          // Fallback to base64
          const base64 = await fileToBase64(familyPhoto);
          referenceImages = [base64];
        }
      } catch (e) {
        console.warn("Upload failed, using base64 fallback");
        const base64 = await fileToBase64(familyPhoto);
        referenceImages = [base64];
      }
    } else if (photoMode === "individual") {
      const charsWithPhotos = characters.filter(c => c.name.trim() && c.photo);
      if (charsWithPhotos.length > 0) {
        try {
          const formData = new FormData();
          charsWithPhotos.forEach(c => {
            formData.append("files", c.photo!);
            formData.append("labels", c.name);
          });
          const res = await fetch("/api/upload", { method: "POST", body: formData });
          if (res.ok) {
            const data = await res.json();
            referenceImageUrls = data.uploaded || [];
          } else {
            // Fallback to base64
            const base64s = await Promise.all(charsWithPhotos.map(c => fileToBase64(c.photo!)));
            referenceImages = base64s;
          }
        } catch (e) {
          console.warn("Upload failed, using base64 fallback");
          const base64s = await Promise.all(charsWithPhotos.map(c => fileToBase64(c.photo!)));
          referenceImages = base64s;
        }
      }
    }

    const selectedCat = CATEGORIES.find(c => c.id === category);
    
    // Prepare characters list
    let charactersList: any[] = [];
    if (photoMode === "family" && familyCharacterNames.trim()) {
      // Parse character names from family photo input
      const names = familyCharacterNames.split(",").map(n => n.trim()).filter(Boolean);
      charactersList = names.map((name, i) => ({
        id: `char-${i}`,
        name,
        role: "Hauptfigur",
        imageUrl: familyPhotoPreview || undefined,
      }));
    } else if (photoMode === "individual") {
      charactersList = characters.filter(c => c.name.trim()).map(c => ({
        id: c.id,
        name: c.name,
        role: "Hauptfigur",
        imageUrl: c.preview || undefined,
      }));
    }
    
    setProject({
      id: `proj-${Date.now()}`,
      title: "",
      storyInput: "",
      guidedAnswers: {
        category: category || "sonstiges",
        characters: charactersList.map(c => c.name).join(", "),
        location: "",
        timeframe: "",
        specialMoments: "",
      },
      tone: selectedCat?.tone as any || "humorvoll",
      comicStyle,
      photoMode,
      characters: charactersList,
      referenceImages,
      referenceImageUrls,
      design: "kinderbuch",
      chapters: [],
      status: "draft",
      createdAt: new Date().toISOString(),
    });
    
    setStep(1);
  };

  const selectedCat = CATEGORIES.find(c => c.id === category);

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-2xl mx-auto space-y-8">

      <div className="text-center space-y-3">
        <h2 className="text-4xl font-bold text-gray-900 tracking-tight" style={{ fontFamily: "var(--font-display)" }}>
          Dein persönlicher Comic
        </h2>
        <p className="text-gray-600 text-lg leading-relaxed">In 3 einfachen Schritten zu deinem einzigartigen Comic-Buch</p>
      </div>

      {/* 1. Kategorie */}
      <div className="space-y-4">
        <label className="text-sm font-semibold text-gray-900">1. Um was für eine Geschichte handelt es sich?</label>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {CATEGORIES.map((cat) => {
            const IconComponent = categoryIcons[cat.icon as keyof typeof categoryIcons];
            return (
              <button
                key={cat.id}
                onClick={() => setCategory(cat.id)}
                className={`group p-6 rounded-xl border transition-all ${
                  category === cat.id 
                    ? "border-brand-600 bg-brand-50 shadow-sm" 
                    : "border-gray-200 bg-white hover:border-brand-400 hover:bg-brand-50/30 hover:shadow-sm"
                }`}
              >
                <div className={`mx-auto mb-3 transition-all ${category === cat.id ? 'text-brand-600' : 'text-brand-500 group-hover:text-brand-600'}`}>
                  <IconComponent className="w-10 h-10 mx-auto" />
                </div>
                <div className="text-sm font-medium text-gray-900">{cat.label}</div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. Stil */}
      {category && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
          <label className="text-sm font-semibold text-gray-900">2. Welchen Stil soll dein Comic haben?</label>
          <div className="grid grid-cols-3 gap-3">
            {COMIC_STYLES.map((cs) => {
              const IconComponent = styleIcons[cs.icon];
              return (
                <button
                  key={cs.id}
                  onClick={() => setComicStyle(cs.id)}
                  className={`group p-6 rounded-xl border text-center transition-all space-y-3 ${
                    comicStyle === cs.id 
                      ? "border-brand-600 bg-brand-50 shadow-sm" 
                      : "border-gray-200 bg-white hover:border-brand-400 hover:bg-brand-50/30 hover:shadow-sm"
                  }`}
                >
                  <div className={`mx-auto transition-all ${comicStyle === cs.id ? 'text-brand-600' : 'text-brand-500 group-hover:text-brand-600'}`}>
                    <IconComponent className="w-9 h-9 mx-auto" />
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-gray-900 mb-1">{cs.label}</div>
                    <div className="text-xs text-gray-600 leading-relaxed">{cs.desc}</div>
                  </div>
                </button>
              );
            })}
          </div>
        </motion.div>
      )}

      {/* 3. Bilder */}
      {category && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
          <label className="text-sm font-semibold text-gray-900">3. Bilder (optional)</label>
          
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

          {/* Photo Mode Selection */}
          <div className="space-y-3">
            <button
              onClick={() => setPhotoMode("family")}
              className={`w-full p-4 rounded-xl border text-left transition-all ${
                photoMode === "family" ? "border-brand-600 bg-brand-50" : "border-gray-200 bg-white hover:border-brand-400"
              }`}
            >
              <div className="flex items-center gap-3">
                <input type="radio" checked={photoMode === "family"} onChange={() => setPhotoMode("family")} className="w-4 h-4 accent-brand-600" />
                <div className="flex-1">
                  <div className="font-medium text-gray-900">Familienbild / Gruppenfoto</div>
                  <div className="text-sm text-gray-600">✅ Empfohlen - funktioniert am besten!</div>
                </div>
              </div>
            </button>

            <button
              onClick={() => setPhotoMode("individual")}
              className={`w-full p-4 rounded-xl border text-left transition-all ${
                photoMode === "individual" ? "border-brand-600 bg-brand-50" : "border-gray-200 bg-white hover:border-brand-400"
              }`}
            >
              <div className="flex items-center gap-3">
                <input type="radio" checked={photoMode === "individual"} onChange={() => setPhotoMode("individual")} className="w-4 h-4 accent-brand-600" />
                <div className="flex-1">
                  <div className="font-medium text-gray-900">Einzelne Hauptfiguren</div>
                  <div className="text-sm text-gray-600">Jede Person separat fotografiert</div>
                </div>
              </div>
            </button>

            <button
              onClick={() => setPhotoMode("none")}
              className={`w-full p-4 rounded-xl border text-left transition-all ${
                photoMode === "none" ? "border-brand-600 bg-brand-50" : "border-gray-200 bg-white hover:border-brand-400"
              }`}
            >
              <div className="flex items-center gap-3">
                <input type="radio" checked={photoMode === "none"} onChange={() => setPhotoMode("none")} className="w-4 h-4 accent-brand-600" />
                <div className="flex-1">
                  <div className="font-medium text-gray-900">Keine Bilder</div>
                  <div className="text-sm text-gray-600">Charaktere werden aus Beschreibung generiert</div>
                </div>
              </div>
            </button>
          </div>

          {/* Family Photo Upload */}
          {photoMode === "family" && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
              <div
                {...getFamilyRootProps()}
                className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
                  isFamilyDragActive ? "border-brand-500 bg-brand-50"
                  : consent ? "border-gray-300 hover:border-brand-400 hover:bg-brand-50/30"
                  : "border-gray-200 bg-gray-50 opacity-50 cursor-not-allowed"
                }`}
              >
                <input {...getFamilyInputProps()} disabled={!consent} />
                <div className="text-4xl mb-3">{isFamilyDragActive ? "📂" : "📁"}</div>
                <p className="text-gray-900 font-medium mb-1">
                  {isFamilyDragActive ? "Loslassen zum Hochladen" : "Familienbild hierher ziehen oder klicken"}
                </p>
                <p className="text-sm text-gray-500">JPG, PNG, WEBP – max. 10 MB</p>
              </div>

              {familyPhotoPreview && (
                <div className="space-y-3">
                  <div className="relative rounded-xl overflow-hidden aspect-video bg-gray-100">
                    <Image src={familyPhotoPreview} alt="Familienbild" fill className="object-cover" />
                    <button
                      onClick={() => { setFamilyPhoto(null); setFamilyPhotoPreview(null); }}
                      className="absolute top-2 right-2 bg-red-500 text-white text-sm px-3 py-1.5 rounded-lg hover:bg-red-600 transition-colors"
                    >
                      Entfernen
                    </button>
                  </div>
                  
                  {/* Character names input */}
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
                </div>
              )}
            </motion.div>
          )}

          {/* Individual Characters */}
          {photoMode === "individual" && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
              {characters.map((char, i) => {
                console.log(`🎨 Rendering character ${i}:`, { id: char.id, name: char.name, hasPreview: !!char.preview });
                return (
                <div key={char.id} className="bg-white border border-gray-200 rounded-xl p-4 space-y-3">
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-semibold text-gray-400 w-8">#{i + 1}</span>
                    <input
                      value={char.name}
                      onChange={(e) => updateCharacterName(char.id, e.target.value)}
                      placeholder="Name, z. B. Jil"
                      className="flex-1 p-2.5 rounded-lg border-2 border-gray-200 focus:border-brand-500 focus:outline-none text-sm text-gray-700 bg-white"
                    />
                    {characters.length > 1 && (
                      <button onClick={() => removeCharacter(char.id)} className="text-gray-300 hover:text-red-500 text-xl">×</button>
                    )}
                  </div>
                  
                  <div className="space-y-2">
                    {!char.preview ? (
                      <div>
                        <input
                          type="file"
                          accept="image/*"
                          disabled={!consent}
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              console.log('📁 File selected:', file.name);
                              updateCharacterPhoto(char.id, file);
                            }
                          }}
                          className="hidden"
                          id={`photo-${char.id}`}
                        />
                        <label
                          htmlFor={`photo-${char.id}`}
                          className={`block border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-all ${
                            consent ? "border-gray-300 hover:border-brand-400 hover:bg-brand-50/30" : "border-gray-200 bg-gray-50 opacity-50 cursor-not-allowed"
                          }`}
                        >
                          <div className="text-3xl mb-2">📷</div>
                          <p className="text-sm font-medium text-gray-700">Foto hochladen</p>
                          <p className="text-xs text-gray-500 mt-1">JPG, PNG, WEBP – max. 10 MB</p>
                        </label>
                      </div>
                    ) : (
                      <div className="relative rounded-lg overflow-hidden aspect-square bg-gray-100 border-2 border-brand-200">
                        <Image src={char.preview} alt={char.name || "Character"} fill className="object-cover" />
                        <button
                          onClick={() => {
                            setCharacters(characters.map(c => 
                              c.id === char.id ? { ...c, photo: null, preview: null } : c
                            ));
                            toast.success("Foto entfernt");
                          }}
                          className="absolute top-2 right-2 bg-red-500 text-white text-sm px-3 py-1.5 rounded-lg hover:bg-red-600 transition-colors shadow-md"
                        >
                          Entfernen
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )})}
              
              <button
                onClick={addCharacter}
                className="w-full py-3 rounded-xl border-2 border-dashed border-gray-300 text-gray-500 text-sm font-medium hover:bg-gray-50 hover:border-brand-400 hover:text-brand-600 transition-all flex items-center justify-center gap-2"
              >
                <span className="text-lg">+</span> Weitere Figur hinzufügen
              </button>
            </motion.div>
          )}
        </motion.div>
      )}

      <Button onClick={handleNext} size="lg" fullWidth disabled={!category}>
        Weiter zum Inhalt →
      </Button>
    </motion.div>
  );
}

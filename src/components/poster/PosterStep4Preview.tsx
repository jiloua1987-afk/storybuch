"use client";
import { useState, useCallback, useEffect } from "react";
import { motion } from "framer-motion";
import { usePosterStore } from "@/store/posterStore";
import { useBookStore } from "@/store/bookStore";
import PanelView from "@/components/comic/PanelView";
import Button from "@/components/ui/Button";
import toast from "react-hot-toast";
import type { PanelPosition } from "@/store/bookStore";

const RAILWAY_URL = process.env.NEXT_PUBLIC_RAILWAY_URL || "";
const POSTER_PAGE_ID = "poster-main";

export default function PosterStep4Preview() {
  const { project, updateProject, setStep } = usePosterStore();
  const { setProject: setBookProject } = useBookStore();
  const [regenerating, setRegenerating] = useState(false);
  const [regenNote, setRegenNote] = useState("");
  const [exportingPDF, setExportingPDF] = useState(false);
  const [editingTitle, setEditingTitle] = useState(false);

  if (!project) return null;

  // Sync poster panels into bookStore so PanelView can save hiddenBubbles/extraBubbles there
  // PanelView always reads/writes via bookStore.updateChapter(pageId)
  useEffect(() => {
    if (!project) return;
    setBookProject({
      id: project.id,
      title: project.title,
      storyInput: "",
      guidedAnswers: { characters: "", location: "", timeframe: "", specialMoments: "" },
      tone: "humorvoll" as any,
      design: "kinderbuch" as any,
      characters: [],
      chapters: [{
        id: POSTER_PAGE_ID,
        title: project.title,
        content: "",
        imageUrl: project.imageUrl,
        panels: project.panels || [],
        panelPositions: project.panelPositions || null,
        hiddenBubbles: project.hiddenBubbles || [],
        extraBubbles: project.extraBubbles || [],
      }],
      status: "preview",
      createdAt: project.createdAt,
    });
  }, [project.id, project.imageUrl, project.panels]);

  const handlePositionsChange = useCallback((positions: PanelPosition[]) => {
    updateProject({ panelPositions: positions });
    // Also sync to bookStore so PanelView reads them back correctly
    useBookStore.getState().updateChapter(POSTER_PAGE_ID, { panelPositions: positions });
  }, [updateProject]);

  const handleDialogChange = useCallback((panelIndex: number, newDialog: string, bubbleIndex?: number) => {
    if (!project.panels) return;
    const updatedPanels = [...project.panels];
    const panel = updatedPanels[panelIndex];
    if (!panel) return;

    if (panel.dialogs && Array.isArray(panel.dialogs) && bubbleIndex !== undefined) {
      const updatedDialogs = [...panel.dialogs];
      if (updatedDialogs[bubbleIndex]) {
        updatedDialogs[bubbleIndex] = { ...updatedDialogs[bubbleIndex], text: newDialog };
        updatedPanels[panelIndex] = { ...panel, dialogs: updatedDialogs };
      }
    } else {
      updatedPanels[panelIndex] = { ...panel, dialog: newDialog };
    }
    updateProject({ panels: updatedPanels });
  }, [project.panels, updateProject]);

  const handleRegenerate = async () => {
    setRegenerating(true);
    try {
      const url = RAILWAY_URL ? `${RAILWAY_URL}/api/poster/generate` : "/api/poster/generate";

      // Re-generate structure first if note provided
      let structure = { panels: project.panels, location: "", title: project.title };
      if (regenNote) {
        const structUrl = RAILWAY_URL ? `${RAILWAY_URL}/api/poster/structure` : "/api/poster/structure";
        const structRes = await fetch(structUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            moment: `${project.moment}. Additional note: ${regenNote}`,
            characters: project.characters,
            language: project.language || "de",
            comicStyle: project.comicStyle,
            category: project.category,
          }),
        });
        if (structRes.ok) structure = await structRes.json();
      }

      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          structure,
          characters: project.characters,
          comicStyle: project.comicStyle,
          referenceImages: project.referenceImages,
          referenceImageUrls: project.referenceImageUrls,
          projectId: project.id,
          orientation: project.orientation,
        }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const result = await res.json();
      updateProject({
        imageUrl: result.imageUrl,
        panels: result.panels || project.panels,
        panelPositions: undefined, // Reset positions on regen
      });
      setRegenNote("");
      toast.success("Poster neu generiert! 🎨");
    } catch (e) {
      toast.error("Fehler beim Neu-Generieren");
    } finally {
      setRegenerating(false);
    }
  };

  const handleExportPDF = async () => {
    setExportingPDF(true);
    try {
      const url = RAILWAY_URL ? `${RAILWAY_URL}/api/comic/export-pdf` : "/api/comic/export-pdf";

      // Read the current state from bookStore — PanelView writes hiddenBubbles/extraBubbles there
      const bookState = useBookStore.getState();
      const posterPageFromBook = bookState.project?.chapters?.find(c => c.id === POSTER_PAGE_ID);

      const pdfProject = {
        title: project.title,
        isPoster: true,
        posterDedication: project.dedication || "",
        posterDedicationFrom: project.dedicationFrom || "",
        posterDedicationPosition: project.dedicationPosition || "bottom",
        chapters: [{
          id: POSTER_PAGE_ID,
          title: project.title,
          imageUrl: project.imageUrl,
          panels: posterPageFromBook?.panels || project.panels || [],
          panelPositions: posterPageFromBook?.panelPositions || project.panelPositions || null,
          extraBubbles: posterPageFromBook?.extraBubbles || [],
          hiddenBubbles: posterPageFromBook?.hiddenBubbles || [],
        }],
        endingData: null,
      };

      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ project: pdfProject }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const blob = await res.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = `${project.title}-Poster.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(blobUrl);
      toast.success("PDF exportiert! 📄");
    } catch (e) {
      toast.error("PDF-Export fehlgeschlagen");
    } finally {
      setExportingPDF(false);
    }
  };

  const aspectRatio = project.orientation === "landscape" ? "1536 / 1024" : "1024 / 1536";
  const maxWidth = project.orientation === "landscape" ? "max-w-2xl" : "max-w-[510px]";
  const hasDedication = !!project.dedication?.trim();
  const dedicationPos = project.dedicationPosition || "bottom";

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-3xl mx-auto space-y-6">
      <div className="text-center space-y-1">
        {editingTitle ? (
          <input autoFocus
            className="font-display text-3xl font-semibold text-gray-900 text-center bg-transparent border-b-2 border-brand-500 outline-none w-full max-w-md mx-auto block"
            value={project.title}
            onChange={(e) => updateProject({ title: e.target.value })}
            onBlur={() => setEditingTitle(false)}
            onKeyDown={(e) => e.key === "Enter" && setEditingTitle(false)} />
        ) : (
          <h2 className="font-display text-3xl font-semibold text-gray-900 cursor-text hover:text-brand-500 transition-colors"
            onClick={() => setEditingTitle(true)}>
            {project.title}
          </h2>
        )}
        <p className="text-gray-400 text-sm">
          {project.orientation === "landscape" ? "Querformat" : "Hochformat"} · {project.panels?.length || 2} Panels
        </p>
      </div>

      {/* Poster mit Bubbles + Widmungs-Overlay */}
      <div className={`bg-white rounded-2xl overflow-hidden shadow-xl border border-gray-100 ${maxWidth} mx-auto w-full`}>
        {regenerating ? (
          <div className="flex flex-col items-center justify-center gap-3 py-20" style={{ aspectRatio }}>
            <div className="text-4xl animate-pulse">🎨</div>
            <p className="text-[#8B7355] font-medium text-sm">Poster wird neu generiert…</p>
          </div>
        ) : (
          <div className="relative">
            <PanelView
              imageUrl={project.imageUrl || ""}
              panels={project.panels || []}
              panelPositions={project.panelPositions}
              pageId="poster-main"
              onPositionsChange={handlePositionsChange}
              onDialogChange={handleDialogChange}
            />

            {/* Widmungs-Overlay */}
            {hasDedication && (
              <div className={`absolute inset-x-0 ${dedicationPos === "top" ? "top-0" : "bottom-0"} pointer-events-none`}>
                <div className={`flex flex-col items-center px-6 ${dedicationPos === "top" ? "pt-5 pb-8" : "pb-5 pt-8"}`}
                  style={{ background: dedicationPos === "top"
                    ? "linear-gradient(to bottom, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0.3) 70%, transparent 100%)"
                    : "linear-gradient(to top, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0.3) 70%, transparent 100%)" }}>
                  {/* Goldene Linie oben — immer sichtbar, mit Abstand */}
                  <div className="w-16 h-[2px] bg-[#C9963A] rounded mb-4" />
                  <p className="text-white text-center leading-snug"
                    style={{
                      fontFamily: "'Playfair Display', Georgia, serif",
                      fontSize: "clamp(10px, 2.2vw, 13px)",
                      fontStyle: "italic",
                      textShadow: "1px 1px 3px rgba(0,0,0,0.8)",
                    }}>
                    {project.dedication}
                  </p>
                  {project.dedicationFrom && (
                    <p className="text-[#C9963A] text-center mt-3"
                      style={{
                        fontFamily: "'Playfair Display', Georgia, serif",
                        fontSize: "clamp(9px, 1.8vw, 11px)",
                        textShadow: "1px 1px 2px rgba(0,0,0,0.8)",
                        textAlign: "center",
                        width: "100%",
                      }}>
                      — {project.dedicationFrom}
                    </p>
                  )}
                  {/* Goldene Linie unten — immer sichtbar, mit Abstand */}
                  <div className="w-16 h-[2px] bg-[#C9963A] rounded mt-4" />
                </div>
              </div>
            )}
          </div>
        )}

        {/* Regen controls */}
        <div className="px-6 py-3 border-t border-gray-100 space-y-2">
          <textarea value={regenNote} onChange={(e) => setRegenNote(e.target.value)}
            placeholder="Was soll anders sein? z.B. 'Mehr Humor' oder 'Anderer Hintergrund' (optional)"
            className="w-full text-xs border border-[#E8D9C0] rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#C9963A]/30 resize-none"
            rows={2} disabled={regenerating} />
          <button onClick={handleRegenerate} disabled={regenerating}
            className="w-full text-sm bg-[#C9963A] hover:bg-[#A67A28] text-white px-4 py-2 rounded-lg transition-all flex items-center justify-center gap-2 font-medium disabled:opacity-50">
            {regenerating ? <><div className="animate-spin">🎨</div> Wird neu generiert…</> : "🎨 Neu generieren"}
          </button>
        </div>
      </div>

      {/* Export */}
      <div className="flex gap-3">
        <Button variant="secondary" onClick={() => setStep(1)}>← Zurück</Button>
        <button onClick={handleExportPDF} disabled={exportingPDF}
          className="flex-1 py-3 rounded-xl border-2 border-brand-200 text-brand-600 text-sm font-medium hover:bg-brand-50 transition-all disabled:opacity-50 flex items-center justify-center gap-2">
          {exportingPDF ? <><div className="animate-spin">⏳</div> PDF wird erstellt…</> : "📄 Als PDF exportieren"}
        </button>
        <Button onClick={() => setStep(4)} size="lg">Bestellen →</Button>
      </div>
    </motion.div>
  );
}

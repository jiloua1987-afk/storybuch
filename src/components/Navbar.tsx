"use client";
import { motion } from "framer-motion";
import { useBookStore } from "@/store/bookStore";

export default function Navbar() {
  const { project, resetProject } = useBookStore();

  return (
    <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-brand-100 shadow-sm">
      <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
        <motion.button
          whileHover={{ scale: 1.03 }}
          onClick={resetProject}
          className="flex items-center gap-2"
        >
          <span className="text-2xl">📚</span>
          <span
            className="text-xl font-bold text-brand-700"
            style={{ fontFamily: "var(--font-display)" }}
          >
            MeinKapitel
          </span>
        </motion.button>

        <div className="flex items-center gap-4 text-sm text-gray-500">
          {project && (
            <span className="hidden md:block text-brand-600 font-medium truncate max-w-[200px]">
              ✍️ {project.title}
            </span>
          )}
          <a href="#" className="hover:text-brand-600 transition-colors">Beispiele</a>
          <a href="#" className="hover:text-brand-600 transition-colors">Preise</a>
          <button className="bg-brand-500 text-white px-4 py-1.5 rounded-full text-sm font-medium hover:bg-brand-600 transition-all">
            Anmelden
          </button>
        </div>
      </div>
    </nav>
  );
}

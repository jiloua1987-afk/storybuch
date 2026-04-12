"use client";
import { useBookStore } from "@/store/bookStore";
import Link from "next/link";

export default function Navbar() {
  const { resetProject } = useBookStore();

  return (
    <nav className="sticky top-0 z-50 bg-[#fdfaf7] border-b border-purple-100">
      <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
        <button
          onClick={resetProject}
          className="font-display text-xl font-semibold text-[#1f1a2e] hover:opacity-70 transition-opacity"
        >
          MyComicStory
        </button>
        <div className="flex items-center gap-6 text-sm text-gray-500">
          <Link href="/ueber-uns" className="hover:text-[#1f1a2e] transition-colors">Über uns</Link>
          <Link href="/faq" className="hover:text-[#1f1a2e] transition-colors">FAQ</Link>
          <Link href="/preise" className="hover:text-[#1f1a2e] transition-colors">Preise</Link>
          <button
            onClick={resetProject}
            className="bg-purple-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-purple-700 transition-colors"
          >
            Anmelden
          </button>
        </div>
      </div>
    </nav>
  );
}

"use client";
import { useBookStore } from "@/store/bookStore";
import Link from "next/link";

export default function Navbar() {
  const { resetProject } = useBookStore();

  return (
    <nav style={{ background: "#FDF8F2", borderBottom: "1px solid #E8D9C0" }} className="sticky top-0 z-50">
      <div className="max-w-[1120px] mx-auto px-6 py-4 flex items-center justify-between">
        <button
          onClick={resetProject}
          className="font-display text-[22px] text-[#1A1410] tracking-tight hover:opacity-70 transition-opacity duration-200"
        >
          MyComicStory
        </button>

        <div className="flex items-center gap-8">
          <div className="hidden md:flex items-center gap-8">
            <Link href="/ueber-uns" className="text-[14px] text-[#8B7355] hover:text-[#1A1410] transition-colors duration-200">
              Über uns
            </Link>
            <Link href="/faq" className="text-[14px] text-[#8B7355] hover:text-[#1A1410] transition-colors duration-200">
              FAQ
            </Link>
            <Link href="/preise" className="text-[14px] text-[#8B7355] hover:text-[#1A1410] transition-colors duration-200">
              Preise
            </Link>
          </div>
          <button
            onClick={resetProject}
            style={{ border: "1.5px solid #1A1410" }}
            className="text-[14px] text-[#1A1410] px-5 py-2 rounded-[8px] hover:bg-[#1A1410] hover:text-white transition-all duration-200"
          >
            Anmelden
          </button>
        </div>
      </div>
    </nav>
  );
}

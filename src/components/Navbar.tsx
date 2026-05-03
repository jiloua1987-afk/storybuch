"use client";
import { useBookStore } from "@/store/bookStore";
import Link from "next/link";
import Image from "next/image";

export default function Navbar() {
  const { resetProject } = useBookStore();

  return (
    <nav className="sticky top-0 z-50 bg-[#FDF8F2] border-b border-[#E8D9C0]">
      <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
        <button
          onClick={resetProject}
          className="hover:opacity-70 transition-opacity overflow-hidden"
        >
          <div className="w-48 h-24 relative">
            <Image 
              src="/Logo 1.png" 
              alt="MyComicStory Logo" 
              fill
              className="object-cover scale-150"
            />
          </div>
        </button>
        <div className="flex items-center gap-6 text-[14px] text-[#8B7355]">
          <Link href="/ueber-uns" className="hover:text-[#1A1410] transition-colors">Über uns</Link>
          <Link href="/faq" className="hover:text-[#1A1410] transition-colors">FAQ</Link>
          <Link href="/preise" className="hover:text-[#1A1410] transition-colors">Preise</Link>
          <button
            onClick={resetProject}
            className="border border-[#E8D9C0] bg-transparent text-[#1A1410] px-5 py-2 rounded-lg text-sm font-medium hover:bg-[#F5EDE0] transition-colors"
          >
            Anmelden
          </button>
        </div>
      </div>
    </nav>
  );
}

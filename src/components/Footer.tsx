"use client";
import Link from "next/link";

export default function Footer() {
  return (
    <footer className="bg-[#1A1410]">
      <div className="max-w-5xl mx-auto px-6 py-16 grid md:grid-cols-4 gap-10">
        <div className="space-y-3 md:col-span-1">
          <p className="font-display text-xl text-white">MyComicStory</p>
          <p className="text-sm text-[#8B7355] leading-relaxed">Deine Erinnerungen. Als Comic. Für immer.</p>
        </div>
        <div className="space-y-3">
          <p className="text-xs text-[#8B7355] uppercase tracking-widest font-medium">Produkt</p>
          <ul className="space-y-2">
            <li><Link href="/ueber-uns" className="text-[13px] text-[#8B7355] hover:text-white transition-colors">Über uns</Link></li>
            <li><Link href="/faq" className="text-[13px] text-[#8B7355] hover:text-white transition-colors">FAQ & Kontakt</Link></li>
            <li><Link href="/preise" className="text-[13px] text-[#8B7355] hover:text-white transition-colors">Preise</Link></li>
          </ul>
        </div>
        <div className="space-y-3">
          <p className="text-xs text-[#8B7355] uppercase tracking-widest font-medium">Rechtliches</p>
          <ul className="space-y-2">
            <li><Link href="/impressum" className="text-[13px] text-[#8B7355] hover:text-white transition-colors">Impressum</Link></li>
            <li><Link href="/datenschutz" className="text-[13px] text-[#8B7355] hover:text-white transition-colors">Datenschutz</Link></li>
            <li><Link href="/agb" className="text-[13px] text-[#8B7355] hover:text-white transition-colors">AGB</Link></li>
          </ul>
        </div>
        <div className="space-y-3">
          <p className="text-xs text-[#8B7355] uppercase tracking-widest font-medium">Kontakt</p>
          <p className="text-[13px] text-[#8B7355]">kontakt@mycomicstory.de</p>
          <p className="text-xs text-[#4A3C2E] leading-relaxed">Bestellstatus bitte über DHL Sendungsverfolgung prüfen.</p>
        </div>
      </div>
      <div className="border-t border-white/5 max-w-5xl mx-auto px-6 py-6 flex flex-col md:flex-row items-center justify-between gap-3">
        <span className="text-xs text-[#4A3C2E]">© {new Date().getFullYear()} MyComicStory. Alle Rechte vorbehalten.</span>
        <div className="flex gap-5">
          <Link href="/impressum" className="text-xs text-[#4A3C2E] hover:text-white transition-colors">Impressum</Link>
          <Link href="/datenschutz" className="text-xs text-[#4A3C2E] hover:text-white transition-colors">Datenschutz</Link>
          <Link href="/agb" className="text-xs text-[#4A3C2E] hover:text-white transition-colors">AGB</Link>
        </div>
      </div>
    </footer>
  );
}

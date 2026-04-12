"use client";
import Link from "next/link";

export default function Footer() {
  return (
    <footer style={{ background: "#1A1410" }}>
      <div className="max-w-[1120px] mx-auto px-6 py-16 grid md:grid-cols-4 gap-10">
        <div className="space-y-3 md:col-span-1">
          <p className="font-display text-[20px] text-white">MyComicStory</p>
          <p className="text-[13px] text-[#8B7355] leading-relaxed">
            Deine Erinnerungen. Als Comic. Für immer.
          </p>
        </div>
        <div className="space-y-3">
          <p className="text-[13px] text-white font-medium uppercase tracking-widest">Produkt</p>
          <ul className="space-y-2">
            <li><Link href="/ueber-uns" className="text-[13px] text-[#8B7355] hover:text-white transition-colors duration-200">Über uns</Link></li>
            <li><Link href="/faq" className="text-[13px] text-[#8B7355] hover:text-white transition-colors duration-200">FAQ & Kontakt</Link></li>
            <li><Link href="/preise" className="text-[13px] text-[#8B7355] hover:text-white transition-colors duration-200">Preise</Link></li>
          </ul>
        </div>
        <div className="space-y-3">
          <p className="text-[13px] text-white font-medium uppercase tracking-widest">Rechtliches</p>
          <ul className="space-y-2">
            <li><Link href="/impressum" className="text-[13px] text-[#8B7355] hover:text-white transition-colors duration-200">Impressum</Link></li>
            <li><Link href="/datenschutz" className="text-[13px] text-[#8B7355] hover:text-white transition-colors duration-200">Datenschutz</Link></li>
            <li><Link href="/agb" className="text-[13px] text-[#8B7355] hover:text-white transition-colors duration-200">AGB</Link></li>
          </ul>
        </div>
        <div className="space-y-3">
          <p className="text-[13px] text-white font-medium uppercase tracking-widest">Kontakt</p>
          <p className="text-[13px] text-[#8B7355]">kontakt@mycomicstory.de</p>
          <p className="text-[12px] text-[#8B7355] leading-relaxed">
            Bestellstatus bitte über die DHL Sendungsverfolgung prüfen.
          </p>
        </div>
      </div>
      <div style={{ borderTop: "1px solid rgba(255,255,255,0.08)" }} className="max-w-[1120px] mx-auto px-6 py-6 flex flex-col md:flex-row items-center justify-between gap-3">
        <span className="text-[12px] text-[#8B7355]">© {new Date().getFullYear()} MyComicStory. Alle Rechte vorbehalten.</span>
        <div className="flex gap-6">
          <Link href="/impressum" className="text-[12px] text-[#8B7355] hover:text-white transition-colors duration-200">Impressum</Link>
          <Link href="/datenschutz" className="text-[12px] text-[#8B7355] hover:text-white transition-colors duration-200">Datenschutz</Link>
          <Link href="/agb" className="text-[12px] text-[#8B7355] hover:text-white transition-colors duration-200">AGB</Link>
        </div>
      </div>
    </footer>
  );
}

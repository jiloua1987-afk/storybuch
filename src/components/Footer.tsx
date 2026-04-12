"use client";
import Link from "next/link";

export default function Footer() {
  return (
    <footer className="bg-[#1f1a2e]">
      <div className="max-w-5xl mx-auto px-6 py-16 grid md:grid-cols-4 gap-10">
        <div className="space-y-3 md:col-span-1">
          <p className="font-display text-xl text-white">MyComicStory</p>
          <p className="text-sm text-gray-500 leading-relaxed">Deine Erinnerungen. Als Comic. Für immer.</p>
        </div>
        <div className="space-y-3">
          <p className="text-xs text-gray-400 uppercase tracking-widest font-medium">Produkt</p>
          <ul className="space-y-2">
            <li><Link href="/ueber-uns" className="text-sm text-gray-500 hover:text-white transition-colors">Über uns</Link></li>
            <li><Link href="/faq" className="text-sm text-gray-500 hover:text-white transition-colors">FAQ & Kontakt</Link></li>
            <li><Link href="/preise" className="text-sm text-gray-500 hover:text-white transition-colors">Preise</Link></li>
          </ul>
        </div>
        <div className="space-y-3">
          <p className="text-xs text-gray-400 uppercase tracking-widest font-medium">Rechtliches</p>
          <ul className="space-y-2">
            <li><Link href="/impressum" className="text-sm text-gray-500 hover:text-white transition-colors">Impressum</Link></li>
            <li><Link href="/datenschutz" className="text-sm text-gray-500 hover:text-white transition-colors">Datenschutz</Link></li>
            <li><Link href="/agb" className="text-sm text-gray-500 hover:text-white transition-colors">AGB</Link></li>
          </ul>
        </div>
        <div className="space-y-3">
          <p className="text-xs text-gray-400 uppercase tracking-widest font-medium">Kontakt</p>
          <p className="text-sm text-gray-500">kontakt@mycomicstory.de</p>
          <p className="text-xs text-gray-600 leading-relaxed">Bestellstatus bitte über DHL Sendungsverfolgung prüfen.</p>
        </div>
      </div>
      <div className="border-t border-white/5 max-w-5xl mx-auto px-6 py-6 flex flex-col md:flex-row items-center justify-between gap-3">
        <span className="text-xs text-gray-600">© {new Date().getFullYear()} MyComicStory. Alle Rechte vorbehalten.</span>
        <div className="flex gap-5">
          <Link href="/impressum" className="text-xs text-gray-600 hover:text-white transition-colors">Impressum</Link>
          <Link href="/datenschutz" className="text-xs text-gray-600 hover:text-white transition-colors">Datenschutz</Link>
          <Link href="/agb" className="text-xs text-gray-600 hover:text-white transition-colors">AGB</Link>
        </div>
      </div>
    </footer>
  );
}

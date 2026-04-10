"use client";
import Link from "next/link";

export default function Footer() {
  return (
    <footer className="bg-brand-900 text-white">
      <div className="max-w-5xl mx-auto px-4 py-16 grid md:grid-cols-4 gap-10">

        {/* Brand */}
        <div className="space-y-4 md:col-span-1">
          <div className="flex items-center gap-2">
            <span className="text-2xl">📚</span>
            <span className="text-xl font-bold" style={{ fontFamily: "var(--font-display)" }}>
              MyStoryBook
            </span>
          </div>
          <p className="text-brand-200 text-sm leading-relaxed">
            Deine Erinnerungen. Dein Buch. Für immer.
          </p>
          <div className="flex gap-3">
            <a href="#" className="w-9 h-9 bg-brand-700 rounded-full flex items-center justify-center hover:bg-brand-600 transition-all text-sm">f</a>
            <a href="#" className="w-9 h-9 bg-brand-700 rounded-full flex items-center justify-center hover:bg-brand-600 transition-all text-sm">in</a>
            <a href="#" className="w-9 h-9 bg-brand-700 rounded-full flex items-center justify-center hover:bg-brand-600 transition-all text-sm">ig</a>
          </div>
        </div>

        {/* Produkt */}
        <div className="space-y-4">
          <h3 className="font-semibold text-white">Produkt</h3>
          <ul className="space-y-2 text-brand-200 text-sm">
            <li><Link href="/ueber-uns" className="hover:text-white transition-colors">Über uns</Link></li>
            <li><Link href="/faq" className="hover:text-white transition-colors">FAQ & Kontakt</Link></li>
            <li><Link href="/preise" className="hover:text-white transition-colors">Preise</Link></li>
            <li><a href="#" className="hover:text-white transition-colors">Beispiele</a></li>
          </ul>
        </div>

        {/* Rechtliches */}
        <div className="space-y-4">
          <h3 className="font-semibold text-white">Rechtliches</h3>
          <ul className="space-y-2 text-brand-200 text-sm">
            <li><Link href="/impressum" className="hover:text-white transition-colors">Impressum</Link></li>
            <li><Link href="/datenschutz" className="hover:text-white transition-colors">Datenschutzerklärung</Link></li>
            <li><Link href="/agb" className="hover:text-white transition-colors">AGB</Link></li>
          </ul>
        </div>

        {/* Kontakt */}
        <div className="space-y-4">
          <h3 className="font-semibold text-white">Kontakt</h3>
          <ul className="space-y-2 text-brand-200 text-sm">
            <li>✉️ kontakt@mystorybook.de</li>
            <li className="text-xs leading-relaxed text-brand-300">
              Bestellstatus bitte über die DHL Sendungsverfolgung prüfen.
            </li>
          </ul>
        </div>
      </div>

      <div className="border-t border-brand-700 py-6">
        <div className="max-w-5xl mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-3 text-brand-300 text-xs">
          <span>© {new Date().getFullYear()} MyStoryBook. Alle Rechte vorbehalten.</span>
          <div className="flex gap-4">
            <Link href="/impressum" className="hover:text-white transition-colors">Impressum</Link>
            <Link href="/datenschutz" className="hover:text-white transition-colors">Datenschutz</Link>
            <Link href="/agb" className="hover:text-white transition-colors">AGB</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}

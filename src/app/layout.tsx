import type { Metadata } from "next";
import "./globals.css";
import { Toaster } from "react-hot-toast";

export const metadata: Metadata = {
  title: "StoryCraft – Dein persönliches Buch",
  description: "Verwandle deine Erinnerungen in ein illustriertes Buch. KI-gestützt, personalisiert, druckfertig.",
  keywords: ["Buch erstellen", "persönliche Geschichte", "KI Buch", "illustriertes Buch", "Fotobuch"],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de">
      <body>
        <Toaster
          position="top-center"
          toastOptions={{
            style: { background: "#2d1b4e", color: "#fff", borderRadius: "12px" },
            duration: 4000,
          }}
        />
        {children}
      </body>
    </html>
  );
}

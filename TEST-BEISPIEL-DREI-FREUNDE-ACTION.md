# Test-Beispiel: Drei Freunde Action-Comic
*Zum Copy & Paste in den Wizard*

## 📋 Wizard-Eingaben

### Step 1: Basics
**Titel:** Die drei Detektive  
**Kategorie:** Freundschaft  
**Ton:** Action/Abenteuer  
**Sprache:** Deutsch  

---

### Step 2: Content

#### Charaktere:
```
Marc (28 Jahre, sportlich, kurze braune Haare, Anführer der Gruppe)
Maria (27 Jahre, klug, lange schwarze Haare, Tech-Expertin)
Hassan (29 Jahre, stark, Glatze, ehemaliger Soldat)
```

#### Ort:
```
Verlassenes Lagerhaus am Hafen, Frankfurt
```

#### Zeitraum:
```
Eine Nacht im Sommer 2026
```

#### Besondere Momente (mit | trennen):
```
Die drei Freunde entdecken verdächtige Aktivitäten am Hafen | Marc klettert durchs Fenster während Maria und Hassan Wache halten | Hassan wird von Wachen entdeckt und es kommt zum Kampf | Maria hackt das Sicherheitssystem und öffnet die Tür | Die drei fliehen über die Dächer vor den Verfolgern | Spektakulärer Sprung von Dach zu Dach | Sie entkommen mit dem Motorboot
```

#### Wichtige Sätze (optional):
```
"Wir schaffen das zusammen!" - "Vertrau mir, ich hab einen Plan!"
```

---

### Step 3: Style
**Comic-Stil:** Action  
**Illustration:** Comic (Bande Dessinée)  

---

## 🎯 Erwartetes Ergebnis

### Multi-Bubble Dialoge:

**Seite 1 - Panel 1:**
```
Marc: "Seht ihr das? Da bewegt sich was!"
Maria: "Ich scanne die Gegend... drei Wärme-Signaturen."
Hassan: "Lass uns näher rangehen."
```

**Seite 2 - Panel 3:**
```
Hassan: "Sie haben mich gesehen!"
Marc: "Hassan, duck dich!"
Maria: "Ich öffne die Hintertür, rennt!"
```

**Seite 4 - Panel 2:**
```
Marc: "Wir müssen springen!"
Maria: "Das ist zu weit!"
Hassan: "Vertraut mir, wir schaffen das zusammen!"
```

### Action-Elemente:
- ✅ Dynamische Posen (Klettern, Kämpfen, Rennen)
- ✅ Motion Blur für Bewegung
- ✅ Verschiedene Kamerawinkel (Wide shots, Close-ups)
- ✅ Spannungsaufbau durch Panel-Variation

### Multi-Bubble Features:
- ✅ 2-3 Dialoge pro Panel bei Gesprächen
- ✅ Silent Panels bei Action-Momenten
- ✅ Kurze Reaktionen gemischt mit längeren Aussagen
- ✅ Natürlicher Gesprächsfluss

---

## 🧪 Test-Checkliste

Nach der Generierung prüfen:

### Backend (GPT-Antwort):
- [ ] Gibt GPT `dialogs: [{speaker, text}]` Array zurück?
- [ ] Sind 2-3 Dialoge pro Panel bei Gesprächen?
- [ ] Gibt es Silent Panels bei Action-Szenen?
- [ ] Sind Dialoge 10-25 Wörter lang?

### Frontend (Rendering):
- [ ] Werden mehrere Bubbles pro Panel angezeigt?
- [ ] Sind Bubbles einzeln verschiebbar?
- [ ] Sind Bubbles einzeln löschbar?
- [ ] Funktioniert Resize für jede Bubble?
- [ ] Werden Positionen gespeichert?

### Visuelle Qualität:
- [ ] Action-Posen dynamisch?
- [ ] Verschiedene Kamerawinkel?
- [ ] Motion Blur bei Bewegung?
- [ ] Charaktere konsistent über alle Seiten?

---

## 🎨 Alternative: Kürzere Version (3 Momente)

Wenn du schneller testen willst:

#### Besondere Momente (kurz):
```
Die drei Freunde entdecken verdächtige Aktivitäten | Hassan kämpft gegen Wachen während Marc und Maria fliehen | Spektakuläre Flucht über die Dächer
```

---

## 💡 Variations-Ideen

### Andere Action-Szenarien:

**Bergrettung:**
```
Marc, Maria und Hassan retten einen verletzten Wanderer | Gefährlicher Abstieg im Gewitter | Hubschrauber-Rettung am Abgrund
```

**Verfolgungsjagd:**
```
Die drei Freunde werden durch die Stadt verfolgt | Spektakuläre Motorrad-Verfolgung | Sprung vom fahrenden Auto
```

**Schatzsuche:**
```
Entdeckung einer alten Karte | Klettern durch gefährliche Höhlen | Kampf gegen Schatzräuber | Fund des antiken Artefakts
```

---

## 🔍 Debug-Tipps

**Wenn keine Multi-Bubbles erscheinen:**
1. Browser-Console öffnen (F12)
2. Prüfen: Kommt `dialogs` Array vom Backend?
3. Network-Tab → `/api/comic/structure` Response checken

**Wenn Bubbles nicht einzeln verschiebbar:**
1. Console prüfen auf Fehler
2. Verifizieren: Jede Bubble hat unique `bubbleId`?
3. React DevTools: `dialogPanels` Array checken

**Wenn Positionen nicht gespeichert werden:**
1. Console: `onPositionsChange` wird aufgerufen?
2. Store prüfen: `panelPositions` aktualisiert?
3. Nach Reload: Positionen noch da?

---

## ✅ Erfolgs-Kriterien

**Backend:**
- ✅ 7 Seiten generiert (7 Momente)
- ✅ Mindestens 3 Panels mit Multi-Bubbles
- ✅ Mindestens 1 Silent Panel
- ✅ Action-Beschreibungen dynamisch

**Frontend:**
- ✅ Alle Bubbles einzeln steuerbar
- ✅ Keine TypeScript-Fehler
- ✅ Smooth Drag & Drop
- ✅ Position-Saving funktioniert

**User Experience:**
- ✅ Dialoge wirken natürlich
- ✅ Action-Szenen spannend
- ✅ Charaktere erkennbar
- ✅ Story nachvollziehbar

---

## 🚀 Los geht's!

1. **Frontend starten:** `npm run dev`
2. **Wizard öffnen:** http://localhost:3000
3. **Oben kopieren & einfügen**
4. **Generieren klicken**
5. **Ergebnis prüfen** ✨

Viel Erfolg beim Testen! 🎬

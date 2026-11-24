# Vorführung: fünf Minuten

Auental Energie, das Standardszenario: ein fiktives Stadtwerk, das auch das Wasserwerk der Stadt
betreibt. Jede Zahl unten stammt aus der Rechenlogik, und der Leitfaden nennt dieselben.

## Bevor Sie anfangen

- Öffnen Sie die Seite in einem neuen Tab, im Vollbild, bei 1920 × 1080 oder 1280 × 720. *So
  funktioniert's* öffnet sich von selbst; `?lang=de&guide=present` öffnet direkt den Vorführungsteil.
- Schließen Sie den Leitfaden mit **Starten**. Drücken Sie **Abspielen** oder nutzen Sie die Pfeiltaste
  nach rechts oder einen Presenter: Jeder Schritt bleibt so lange, wie man zum Lesen braucht, und
  Abspielen hält, wo Sie handeln. Die Leertaste pausiert, während Sie sprechen.
- Ein Schlüssel ist nicht nötig, und die Simulation läuft auch offline.

## Die fünf Minuten

| Zeit | Schritt | Sagen | Tun und zeigen |
| --- | --- | --- | --- |
| 1 min | Auf die Kennzahlen zeigen | „Gerechnet ist schon: 3,8 Mio. € pro Jahr auf dem Spiel, Vorbereitungsgrad 51, drei von sechs Dimensionen unter Druck.“ | Auf die vier Kacheln zeigen, dann auf die Liste des Teams: drei äußere Kräfte, vom Team bewertet. |
| 1 min | Agenten starten, ein datiertes Signal öffnen | „Der Scanner füllt alle sechs Dimensionen aus den Nachrichten, jede mit Quelle.“ | **Agenten starten** klicken. Die sieben Signale öffnen und einen der neun Faktoren in Flieder: seine Grundlage, seine Quelle und das Lesedatum. |
| 1 min | Prüfen lassen, dann Rechtlich öffnen | „Das Red Team zieht den Wärmeplan auf jetzt vor: Rechtlich gerät unter Druck.“ | **Diese Analyse prüfen** klicken. Fünf Karten, jede mit Begründung und **Zurücknehmen**. Im Ring auf *Rechtlich* klicken: Der Wärmeplan ist bis 31. Dezember 2026 fällig, nicht in ein bis drei Jahren. Weiter: Die Risikomatrix setzt die Gaspreise auf Platz eins. |
| 1,5 min | Bei Antworten eine Wahl ändern | „Wärmeplan angehen, Forderungen beobachten: Jede Wahl bewegt die Zahlen.“ | Weiter. Die empfohlenen Antworten sind gewählt. Bei den Gaspreisen **Beobachten** wählen: Die Leiste zeigt 2,9 Mio. € und Vorbereitungsgrad 66. Zurück zur Absicherung, dann **Diese Antworten übernehmen** klicken. |
| 0,5 min | Übernehmen, die Beobachtungsliste zeigen | „Es bleiben 2,2 Mio. € pro Jahr auf dem Spiel, Vorbereitungsgrad 72.“ | Die Kacheln streichen 3,8 Mio. €, 51 und drei von sechs durch. Zur Beobachtungsliste scrollen: vier Signale, jedes mit Auslöser und wie oft hinzusehen ist. |

## Wenn etwas schiefgeht

- **Ein falscher Klick.** Jede Korrektur des Red Teams lässt sich zurücknehmen. Eine Wahl, die Sie nach
  dem Übernehmen ändern, öffnet die Entscheidung wieder; übernehmen Sie noch einmal.
- **Den Faden verloren.** `?lang=de&scenario=s3&step=4` öffnet die Entscheidung, `step=5` die
  Zusammenfassung mit den empfohlenen Antworten.
- **Ein kleiner Beamer.** Die Seite passt auf 1280 × 720. Senken Sie lieber die Auflösung, statt zu zoomen.

## Fragen, die kommen werden

**Ist das echt?** Auental Energie und seine eigenen Zahlen sind erfunden. Was es über die Welt sagt, ist
echt und datiert: das Gebäudemodernisierungsgesetz vom 10. Juli 2026, der niederländische Gaspreis über
100 €/MWh im Handel am 28. Oktober 2026, die Frist für den Wärmeplan in Niedersachsen. DATA_SOURCES.md
nennt jede Quelle.

**Woher kommen die Zahlen?** Aus Code. Die Agenten bewerten jeden Faktor und schätzen eine Euro-Spanne;
die Rechenlogik berechnet jede Kennzahl, und eine Faktenprüfung weist jede Zahl in den Texten der Agenten
zurück.

**Was ist der Vorbereitungsgrad?** Ein eigenes Maß dieses Werkzeugs, von 0 bis 100: auf wie viel vom
Gewicht seiner Risiken das Unternehmen vorbereitet ist. Der Dialog **Methode** zeigt die Regel und ein
Rechenbeispiel.

**Was kostet ein Lauf?** Etwa 0,06 € mit der Einstellung Ausgewogen und 0,27 € mit Gründlich, beide
geschätzt. Mit **Live laufen lassen** analysieren die Agenten Ihr eigenes Unternehmen mit Ihrem eigenen
Claude-Schlüssel, bis zu einer Kostenobergrenze, die Sie setzen.

## Nach der Vorführung

- Schicken Sie den Link mit `?lang=de&guide=present`: Mit dem Vorführungsteil kann jeder sie allein
  nachspielen.
- Zeigen Sie ein weiteres Unternehmen, wenn Zeit ist: `?scenario=s1` ist eine Containerreederei mit
  Recherche, `?scenario=s2` ein Antriebshersteller ohne Recherche, der sagt, wo das Wissen des Modells endet.

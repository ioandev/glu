import { DataList, LegalLink, type LegalSection } from "@/components/legal/LegalPage";
import type { DocumentContent } from "./types";
import { CLOCK_COUNT } from "@/clocks/registry";

/**
 * Das GLU-Handbuch auf Deutsch — eine Übersetzung von `en.tsx` (ADR 44). Die
 * englische Fassung ist die Quelle: ändert sich dort ein Standardwert, ein
 * Tastenkürzel oder ein Zeitfenster, ändert sich diese Datei in derselben
 * Sitzung mit, `updated` eingeschlossen.
 */
const updated = "26. Juli 2026";

const title = "So funktioniert GLU";

const intro = (
  <>
    GLU ist ein Fokus-Timer für ein Tablet, das neben dir aufgestellt ist, während
    du arbeitest. Diese Seite beschreibt alles, was GLU kann — den Timer, die
    Uhrengalerie, die Umgebungs-Chips, die Sitzungsaufzeichnung und die optionale
    Todoist-Verbindung. Es ist mit Absicht eine einzige Seite: nutz die
    Seitensuche deines Browsers, um dich zu bewegen.
  </>
);

const sections: LegalSection[] = [
  {
    heading: "Was GLU ist",
    body: (
      <>
        <p>
          Ein Pomodoro- und Fokus-Tracker. Du wählst eine Länge, drückst Start und
          arbeitest, bis die Uhr bei null ankommt. GLU zeichnet den Durchlauf auf,
          damit du siehst, wie viele du heute geschafft hast — und wenn du Todoist
          verbindest, kann es die Zeit an der Aufgabe vermerken, an der du
          gearbeitet hast.
        </p>
        <p>
          Es gibt <b>kein Konto und keine Anmeldung</b>. Alles, was GLU weiß, liegt
          in dem Browser, in dem du das hier liest. Es ist ein einziger Bildschirm:
          keine Menüs, in denen man sich verliert, kein Dashboard, nichts, was du
          einrichten musst, bevor es nützlich ist.
        </p>
        <p>
          Beim allerersten Öffnen zeigt GLU statt des Timers eine kurze Einführung,
          mit einem Button, der dich hineinbringt. Du siehst sie <b>einmal pro
          Browser</b> — danach öffnet GLU direkt die Uhr. Sie bleibt auf{" "}
          <LegalLink href="/welcome">der Willkommensseite</LegalLink> lesbar, falls
          du sie noch einmal brauchst oder jemandem schicken willst. Wenn du deine
          Browserdaten löschst, wird auch das zurückgesetzt — GLU begrüßt dich dann
          wieder als Neuling.
        </p>
      </>
    ),
  },
  {
    heading: "Wie eine App installieren",
    body: (
      <p>
        GLU lässt sich auf dem Startbildschirm oder dem Desktop installieren —
        „App installieren“ im Browsermenü unter Android, „Zum Home-Bildschirm“ auf
        einem iPad, das Installationssymbol in der Adressleiste im
        Desktop-Browser — und öffnet sich dann ohne Browserrahmen, was für einen
        Timer auf einem Ständer genau richtig aussieht. Wähle unter Android die
        Variante mit <i>Installieren</i>, wenn beide auftauchen: die einfache
        Verknüpfung behält oben eine Browserleiste. <b>Es ist keine Offline-App</b>:
        Sie braucht bei jedem Start eine Verbindung. Sonst ändert sich nichts; es
        ist dieselbe App mit denselben Daten in einem anderen Fenster.
      </p>
    ),
  },
  {
    heading: "Der Timer",
    body: (
      <>
        <p>
          Die Reihe über der Uhr enthält die Voreinstellungen — <b>5, 10, 15, 20,
          30, 45 und 60 Minuten</b>. Zwanzig ist beim ersten Besuch ausgewählt. Ein
          Tippen setzt den Timer, und ein Tippen <i>während</i> eines Durchlaufs
          stellt diesen Durchlauf um, statt auf sein Ende zu warten.
        </p>
        <p>
          Unter der Uhr zwei Buttons — die größten Ziele auf dem Bildschirm, weil du
          nach ihnen greifst, ohne hinzusehen. Der erste benennt immer, was er als
          Nächstes tut: <b>Start</b>, wenn nichts läuft, <b>Pause</b>, während etwas
          läuft, <b>Fortsetzen</b>, sobald du pausiert hast. Der zweite ist{" "}
          <b>Stopp</b>. Darunter <b>+1 / +5 / −1 / −5</b>, die je nach Zustand des
          Timers eines von zwei Dingen bedeuten.
        </p>
        <p>
          <i>Während</i> eines Durchlaufs verschieben sie nur diesen einen Durchlauf
          — Stoppen bringt dich zu der Länge zurück, die du gewählt hast. Wenn
          nichts läuft, wozu auch das Stehen bei 00:00 nach einem beendeten
          Durchlauf gehört, legen sie fest, wie lang der <b>nächste</b> Durchlauf
          wird. Eine Länge, die keine der sieben Voreinstellungen ist, erscheint in
          der Reihe als eigener zusätzlicher Button, ausgewählt, und bleibt dort über
          Starten, Stoppen und Neustarten hinweg, bis du wieder eine Voreinstellung
          antippst. Eine Minute ist der kürzeste Durchlauf, den GLU hält; wer auf
          einer bereits laufenden Uhr darunter abzieht, beendet den Durchlauf
          schlicht.
        </p>
        <DataList
          items={[
            {
              term: "Bereit",
              detail:
                "Nichts läuft. Die Uhr zeigt die gewählte Länge, startbereit.",
            },
            {
              term: "Läuft",
              detail:
                "Zählt herunter. Die Zahlen zappeln nicht — die Ziffern halten ihre Breite.",
            },
            {
              term: "Pausiert",
              detail:
                "Angehalten, wo du aufgehört hast. Drück Fortsetzen, um bei derselben Sekunde weiterzumachen.",
            },
            {
              term: "Beendet",
              detail:
                "Null, und sichtbar anders als bereit. Nichts startet von selbst neu — der nächste Durchlauf ist deine Entscheidung.",
            },
          ]}
        />
        <p>
          <b>Der Timer übersteht ein Neuladen, einen zugeklappten Deckel und einen
          Tab im Hintergrund.</b>{" "}
          Er zählt ab dem Startzeitpunkt und nicht anhand von Takten, für die er
          wach bleiben müsste. Wenn du zum Tab zurückkommst, siehst du also die
          richtige Restzeit und keine Uhr, die mit dem Bildschirm stehen geblieben
          ist. Ist ein Durchlauf abgelaufen, während du weg warst, findest du ihn
          beendet und stumm vor — der Ton gilt dem Moment, nicht Stunden später.
        </p>
      </>
    ),
  },
  {
    heading: "Tastaturkürzel",
    body: (
      <>
        <p>Wenn eine Tastatur angeschlossen ist:</p>
        <DataList
          items={[
            { term: "P", detail: "Pausieren oder einen pausierten Durchlauf fortsetzen." },
            { term: "S", detail: "Den aktuellen Durchlauf stoppen." },
            {
              term: "N",
              detail:
                "Alles Laufende abbrechen und einen neuen Durchlauf in der gewählten Länge starten.",
            },
            {
              term: "Strg + C",
              detail:
                "Stoppt ebenfalls — die Gewohnheit aus dem Terminal. Wenn Text markiert ist, wird stattdessen kopiert, genau wie erwartet.",
            },
          ]}
        />
        <p>
          Kürzel lösen nie aus, während du in ein Textfeld tippst, und eine
          gedrückt gehaltene Taste wiederholt die Aktion nicht. Stopp nennt sein
          Kürzel in einem Tooltip, und der erste Button tut das ebenfalls, sobald es
          etwas zu pausieren oder fortzusetzen gibt — von dieser Seite ist also
          nichts auswendig zu lernen.
        </p>
      </>
    ),
  },
  {
    heading: "Die Uhr ist eine Galerie",
    body: (
      <>
        <p>
          Es gibt{" "}
          <b>{CLOCK_COUNT} Uhrendesigns</b>, und das auf dem Bildschirm ist eine
          Wahl, kein Standard, an den du gebunden bist. <b>Wisch die Uhr zur
          Seite</b>, um dich durch sie zu bewegen; auf einem breiten Bildschirm gibt
          es außerdem Pfeile links und rechts der Uhr, die blass bleiben, bis du sie
          ansteuerst. Auf einem schmalen Bildschirm sagt ein einmaliger Hinweis das,
          und er kommt nach dem Wegtippen nicht zurück.
        </p>
        <p>
          Das neue Design gleitet aus der Richtung herein, in die du gewischt hast.
          Deine Wahl wird für das nächste Mal gemerkt.
        </p>
        <p>
          <b>Die aktive Uhr färbt die ganze Seite um.</b> Jedes Design bringt seine
          eigene Palette mit, also ändern sich Hintergrund und Akzente mit ihm — und
          jedes einzelne funktioniert hell wie dunkel. Zwischen Hell und Dunkel
          wechselst du in der Schublade unter <b>Darstellung</b>; bis du etwas
          anderes sagst, folgt GLU deiner Systemeinstellung.
        </p>
      </>
    ),
  },
  {
    heading: "Umgebungs-Chips",
    body: (
      <>
        <p>
          Sechs Chips — <b>Musik</b>, <b>Podcast</b>, <b>TV</b>, <b>Stille</b>,{" "}
          <b>Laut</b>, <b>Kopfhörer</b> — die beschreiben, unter welchen Bedingungen
          du arbeitest. Sie sind eine Aufzeichnung, keine Steuerung: an der App
          ändert sich nichts, wenn du einen drückst.
        </p>
        <ul>
          <li>
            <b>Stille löscht die anderen vier Klang-Chips</b>, denn du kannst nicht
            in Stille sitzen und den Fernseher laufen lassen.
          </li>
          <li>
            <b>Kopfhörer ist unabhängig</b> — das ist Ausrüstung auf deinem Kopf und
            keine Klangumgebung, kann also zusammen mit jedem anderen aktiv sein.
          </li>
        </ul>
        <p>
          Was beim Ende eines Durchlaufs leuchtet, wird mit dieser Sitzung
          gespeichert — und wenn du Todoist nutzt und die Einstellung für
          Zeitkommentare an lässt, wird es in dem Kommentar genannt, den GLU
          schreibt: <i>„[25m] Du hast 25 Minuten daran gearbeitet — mit Musik, über
          Kopfhörer“</i>.
        </p>
        <p>
          <b>Stille ist kein Stummschalter.</b> Sie sagt, wie du gearbeitet hast.
          Der Ton am Ende eines Durchlaufs hängt an der Lautstärke deines Geräts und
          an sonst nichts.
        </p>
      </>
    ),
  },
  {
    heading: "Sitzungen und „Neuer Tag“",
    body: (
      <>
        <p>
          Jeder abgeschlossene Durchlauf fügt unter dem Timer einen Punkt hinzu, mit
          einer Zahl daneben. Ab zwölf Punkten wird der Rest als <code>+N</code>
          {" "}zusammengefasst, damit ein heldenhafter Tag das Layout nicht
          auseinanderschiebt. Der Schalter <b>Sitzungen anzeigen</b> daneben
          bestimmt, ob die Zahl auch auf der Uhr selbst erscheint.
        </p>
        <p>
          <b>„Neuer Tag“ setzt die Zählung auf null</b> und fragt vorher nach. Das
          ist <b>manuell</b> — GLU springt um Mitternacht nicht um, denn ein Tag
          voller Fokus beginnt, wenn du dich hinsetzt, und nicht, wenn sich das
          Datum ändert. Arbeite über Mitternacht hinaus, und es bleibt dieselbe
          Sitzung, bis du etwas anderes sagst.
        </p>
        <p>
          Der Tag, den du abschließt, wird in einem Archiv von <b>höchstens den
          letzten 90 Tagen</b> aufbewahrt; ältere fallen automatisch heraus. Alles
          davon liegt nur in diesem Browser — es gibt keine Kopie auf einem Server,
          kein Konto und keine Synchronisierung mit einem anderen Gerät. Das Löschen
          der Websitedaten entfernt es vollständig, und das ist der einzige
          Löschknopf, den es braucht. Die{" "}
          <LegalLink href="/privacy">Datenschutzerklärung</LegalLink> listet genau
          auf, was darin steht.
        </p>
      </>
    ),
  },
  {
    heading: "Signale am Ende eines Durchlaufs",
    body: (
      <>
        <p>
          Wenn ein Durchlauf null erreicht, während GLU offen ist, spielt es einen
          Ton — im Browser erzeugt, es wird also nichts heruntergeladen. Seine
          Lautstärke ist die Lautstärke deines Geräts.
        </p>
        <p>
          Unter <b>Einstellungen → Signale</b> wählst du aus neun Tönen:
        </p>
        <DataList
          items={[
            {
              term: "Ton",
              detail:
                "Chime (der Standard), Bell, Wood, Rise, Settle, Pulse, Digital, Glass oder Deep. Ein Tippen spielt den Ton ab, du wählst also mit den Ohren; ein Tippen auf den gerade laufenden Ton stoppt ihn.",
            },
            {
              term: "Wie lange er spielt",
              detail:
                "Standardmäßig einmal — der Ton läuft ein einziges Mal durch. Wähl 3, 5, 10 oder 20 Sekunden, und er wiederholt sich, bis diese Zeit vorbei ist; die letzte Wiederholung spielt immer zu Ende, es kann also einen Moment länger dauern. Start, Pause, Fortsetzen oder Stopp — oder ihre Tasten — brechen ihn ab.",
            },
          ]}
        />
        <p>
          <b>Ist der Tab im Hintergrund, bekommst du zusätzlich eine
          Benachrichtigung</b>{" "}
          („GLU — die Zeit ist um“), die die App in den Vordergrund holt, wenn du sie
          anklickst. Eine sichtbare Seite wird nie benachrichtigt — du schaust ja
          schon hin. Der Ton funktioniert in beiden Fällen.
        </p>
        <p>
          <b>Einstellungen → Signale</b> beginnt mit einem Schalter dafür.
          Einschalten fragt deinen Browser um Erlaubnis, Ausschalten beendet die
          Benachrichtigungen, ohne den Ton anzurühren. GLU fragt außerdem beim
          Drücken von Start, höchstens dreimal — danach hört es endgültig auf zu
          fragen, und der Schalter ist der Weg hinein. Blockiert dein Browser
          Benachrichtigungen, sagt der Schalter das und nennt dir, wo du es änderst.
        </p>
        <p>
          <b>Wenn du selbst stoppst, bleibt es mit Absicht still</b>, ebenso bei
          einem Durchlauf, der ablief, während der Tab geschlossen war. Signale
          existieren, um dich zu unterbrechen, wenn du nicht hinschaust — nicht, um
          dir zum Drücken von Stopp zu gratulieren.
        </p>
        <p>
          Unter Android Chrome wird die Benachrichtigung von einem kleinen
          Hintergrundhelfer zugestellt, der nur zu diesem Zweck existiert — er
          speichert nichts, berührt nie das Netzwerk und ändert sonst nichts daran,
          wie GLU lädt. Auf dem iPad bietet Safari einem Browser-Tab keine
          Benachrichtigungen an, dort bleibt GLU also beim Ton allein — meist steht
          das Gerät ohnehin vor dir und der Bildschirm bleibt an.
        </p>
      </>
    ),
  },
  {
    heading: "Den Bildschirm wach halten",
    body: (
      <>
        <p>
          Ein Tablet, das mitten in der Sitzung einschläft, versteckt genau das,
          wofür du es aufgestellt hast. Unter <b>Einstellungen → Bildschirm</b> gibt
          es zwei Schalter:
        </p>
        <DataList
          items={[
            {
              term: "Auf der Website wach bleiben",
              detail:
                "Standardmäßig aus. Hält den Bildschirm an, solange GLU offen ist, ob mit Timer oder ohne — die Einstellung für ein Gerät, das auf deinem Schreibtisch lebt und die Uhr zeigt.",
            },
            {
              term: "Wach bleiben, während der Timer läuft",
              detail:
                "Standardmäßig an. Hält den Bildschirm während eines Durchlaufs an, und noch fünf Minuten danach, wenn er pausiert oder endet, damit du nicht auf einen schwarzen Bildschirm schaust, wenn der Ton kommt.",
            },
          ]}
        />
        <p>
          Manche Browser erlauben das nur, solange der Tab sichtbar ist; ein Wechsel
          gibt die Sperre also frei, und die Rückkehr nimmt sie wieder. Es wird
          nirgendwohin gemeldet — es ist eine Bitte an dein eigenes Gerät.
        </p>
      </>
    ),
  },
  {
    heading: "Die letzte Minute",
    body: (
      <>
        <p>
          Unter <b>60 verbleibenden Sekunden</b> flutet die Farbe der Uhr den ganzen
          Hintergrund und alles andere tritt zurück. Das soll quer durch den Raum und
          aus dem Augenwinkel sichtbar sein — der Punkt, an dem du deinen Satz zu
          Ende bringst, statt einen neuen anzufangen. Es bleibt über 00:00 hinaus als
          Beendet-Anzeige und verschwindet in dem Moment, in dem du stoppst oder
          pausierst.
        </p>
        <p>
          <b>Tipp irgendwohin — auch auf die Uhr — und alles kommt zurück</b>, für
          den Rest dieses Durchlaufs: die Buttons, die Chips, die Aufgabenliste. Es
          schiebt sich nicht nach ein paar Sekunden wieder darüber. Der nächste
          Durchlauf, den du startest, bekommt seine eigene letzte Minute.
        </p>
        <p>
          Auf einem schmalen Bildschirm gilt nichts davon. Dort füllt die Uhr ohnehin
          die erste Bildschirmhöhe und alles andere sitzt darunter, es gibt also
          nichts zu verstecken — du scrollst zu den Bedienelementen hinunter wie
          immer.
        </p>
      </>
    ),
  },
  {
    heading: "Todoist (optional)",
    body: (
      <>
        <p>
          GLU funktioniert für sich allein völlig gut. Wenn du{" "}
          <LegalLink href="https://todoist.com">Todoist</LegalLink> verbindest, kommt
          neben dem Timer eine Aufgabenliste dazu, damit das, was du misst, einen
          Namen hat.
        </p>
        <p>
          <b>Anmelden:</b> der Button <i>Mit Todoist anmelden</i> oben rechts, oder{" "}
          <b>Einstellungen → Todoist</b>. Du bestätigst die Verbindung auf Todoists
          eigenem Bildschirm. Abmelden kannst du dich in derselben
          Einstellungszeile, oder du entziehst GLU den Zugriff direkt in Todoist —
          eines von beiden reicht, und der Entzug funktioniert, ohne diese App
          überhaupt anzufassen.
        </p>
        <DataList
          items={[
            {
              term: "Auswählen, was angezeigt wird",
              detail:
                "Das Werkzeugsymbol öffnet die Quellenauswahl: ein Filter, ein Label oder ein Projekt. Ein Projekt gruppiert seine Aufgaben unter einer Überschrift je Abschnitt, in der richtigen Reihenfolge, mit den Aufgaben ohne Abschnitt zuerst. Ein Filter oder ein Label gruppiert ebenfalls jede Aufgabe nach Projekt — „Arbeit / Heute“, oder einfach „Arbeit“, wenn die Aufgabe keinen Abschnitt hat — denn eines der Ergebnisse könnte zu jedem Projekt gehören; sortiert wird so, wie Todoist es standardmäßig tut: erst Priorität, dann Datum, dann Deadline, dann die Position der Aufgabe in deinen Projekten, außer dass ein Filter rund um Daten hier weiterhin nach Priorität zuerst sortiert wird. Lange Listen zeigen die ersten 200 Aufgaben und sagen das auch.",
            },
            {
              term: "Einen langen Abschnitt kürzen",
              detail:
                "Einstellungen → Aufgaben begrenzt, wie viele Aufgaben jeder Abschnitt zeigt — 10, 20, 50, 100 oder alle, was der Standard ist. Alles über der Grenze steckt hinter einer Zeile „+N weitere“, die du antippen kannst, um den Rest dieses Abschnitts zu sehen; beim nächsten Besuch ist wieder gekappt.",
            },
            {
              term: "Die Liste aktualisieren",
              detail:
                "Die Liste wird neu geladen, wenn du eine Quelle wählst, und immer, wenn du zum Tab zurückkommst — sie fragt nie im Hintergrund nach. Um selbst danach zu fragen, zieh die Liste mit dem Finger nach unten, bis sich das Aktualisierungssymbol füllt, und lass dann los: es dreht sich, bis die neue Liste da ist, und gleitet weg. Das Aktualisierungssymbol oben rechts tut genau dasselbe.",
            },
            {
              term: "Eine Aufgabe abschließen",
              detail:
                "Tipp auf den Prioritätskreis links auf einer Karte — dieselbe Geste wie in Todoist. Sie wird sofort abgeschlossen und verlässt die Liste, und eine Leiste am unteren Rand gibt dir etwa zehn Sekunden, das rückgängig zu machen.",
            },
            {
              term: "Eine Aufgabe fokussieren",
              detail:
                "Der Fokus-Button heftet eine Aufgabe über die Liste. Das ist die Aufgabe, an die ein Zeitkommentar geschrieben wird, und ihre Karte trägt eine laufende Summe der Zeit, die GLU darauf verbucht hat.",
            },
            {
              term: "Aufgabendetails",
              detail:
                "Ein Tippen auf eine Karte öffnet ihre Beschreibung und ihre Kommentare — Bilder eingeschlossen — als Panel auf dem Tablet, bildschirmfüllend auf einer schmalen Anzeige. Es ist nur zum Lesen; nichts dort ändert deine Aufgabe.",
            },
          ]}
        />
        <p>
          <b>Zeitkommentare.</b> Endet ein Durchlauf mit einer fokussierten Aufgabe,
          schreibt GLU einen Kommentar dazu:{" "}
          <code>[25m] You spent 25 minutes on this</code>. Es wartet ein paar
          Sekunden vor dem Senden — die Rückgängig-Leiste kann ihn in diesem Fenster
          ganz abbrechen — und noch einige Sekunden, nachdem er angekommen ist,
          löscht Rückgängig ihn wieder. Durchläufe, die kürzer als dein Minimum
          sind, bekommen keinen; dieses Minimum ist eine Minute, sofern du es nicht
          unter <b>Einstellungen → Zeitkommentare</b> änderst, wo{" "}
          <b>Sagen, wie du gearbeitet hast</b> außerdem entscheidet, ob deine
          Umgebungs-Chips im Satz genannt werden. Beide Einstellungen zeigen dir den
          genauen Kommentar, den du bekommst.
        </p>
        <p>
          GLU schreibt immer nur diese zwei Dinge — einen Zeitkommentar sowie das
          Abschließen oder Wiedereröffnen einer Aufgabe — und nur, wenn du es
          verlangst. Beliebigen Text kann es nicht posten: Der Satz wird auf GLUs
          Server aus den Zahlen und den Chips zusammengesetzt und nie von der Seite
          getippt. Deine Todoist-Verbindung steckt in einem verschlüsselten Cookie,
          das dein Browser nicht lesen kann und das GLUs Server nicht speichert;
          aller Verkehr zu Todoist läuft über diesen Server, dein Konto-Token
          erreicht die Seite also nie. Den Rest hat die{" "}
          <LegalLink href="/privacy">Datenschutzerklärung</LegalLink>.
        </p>
      </>
    ),
  },
  {
    heading: "Zwei Layouts",
    body: (
      <>
        <p>
          <b>Auf einem Tablet</b> ist alles auf einem Bildschirm und die Seite
          scrollt nicht: Der Timer besitzt die linke Hälfte, Todoist oben rechts,
          die Umgebungs-Chips unten rechts.
        </p>
        <p>
          <b>Auf einem schmalen Bildschirm</b> — einem Telefon oder einem halben
          Tablet — nimmt die Uhr die gesamte erste Bildschirmhöhe ein und alles
          andere stapelt sich darunter, die Seite scrollt also. Die Uhr ist das, worauf
          du blickst; sie bekommt den Platz.
        </p>
      </>
    ),
  },
  {
    heading: "Wo alles liegt",
    body: (
      <>
        <p>
          Der <b>Pfeil in der oberen rechten Ecke</b> ist das einzige dauerhaft
          sichtbare Bedienelement. Er öffnet die Schublade mit:
        </p>
        <DataList
          items={[
            { term: "GitHub", detail: "Der Quellcode. GLU ist Open Source." },
            { term: "Darstellung", detail: "Dunkel oder hell, über Besuche hinweg gemerkt." },
            { term: "Docs", detail: "Diese Seite." },
            {
              term: "Einstellungen",
              detail:
                "Todoist (an- oder abmelden), Aufgaben (wie viele Einträge ein Abschnitt zeigt), Bildschirm (die zwei Wachbleiben-Schalter) und Zeitkommentare (was an Todoist geschrieben wird, und wann).",
            },
          ]}
        />
        <p>
          Darunter Links zur{" "}
          <LegalLink href="/privacy">Datenschutzerklärung</LegalLink> und zu den{" "}
          <LegalLink href="/terms">Nutzungsbedingungen</LegalLink>.
        </p>
      </>
    ),
  },
  {
    heading: "Grenzen, ehrlich gesagt",
    body: (
      <ul>
        <li>
          <b>Keine Synchronisierung.</b> Dein Verlauf liegt in einem Browser auf
          einem Gerät. Ein anderer Browser, ein anderes Gerät oder ein privates
          Fenster ist ein anderes, leeres GLU.
        </li>
        <li>
          <b>Kein Offline-Modus.</b> Ob installiert oder nicht, zum Starten braucht
          es eine Verbindung.
        </li>
        <li>
          <b>Neunzig Tage.</b> Das Archiv behält höchstens so viel, und das Löschen
          der Websitedaten löscht alles davon. Nimm GLU als Weg, die Arbeit von heute
          zu sehen, nicht als Buchführung — die{" "}
          <LegalLink href="/terms">Nutzungsbedingungen</LegalLink> sagen dasselbe in
          förmlicheren Worten.
        </li>
        <li>
          <b>Ein kleiner Server, geschützt.</b> Die Todoist-Verbindung läuft über
          einen Proxy mit Ratenbegrenzung. Bei normaler Nutzung merkst du nie etwas
          davon; wer ihn hämmert, bekommt kurze, vorübergehende Absagen.
        </li>
        <li>
          <b>Kein Rückgängig für „Neuer Tag“.</b> Deshalb fragt es vorher.
        </li>
      </ul>
    ),
  },
  {
    heading: "Datenschutz und Bedingungen",
    body: (
      <p>
        Die <LegalLink href="/privacy">Datenschutzerklärung</LegalLink> legt genau
        dar, was GLU verarbeitet, was auf deinem Gerät bleibt und was es an Todoist
        schreibt. Die <LegalLink href="/terms">Nutzungsbedingungen</LegalLink>{" "}
        behandeln die Nutzung der gehosteten App. Beide sind am Ende dieser Seite
        und in der Schublade verlinkt.
      </p>
    ),
  },
];

const content: DocumentContent = { updated, title, intro, sections };

export default content;

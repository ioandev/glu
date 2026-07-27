import { LegalLink, type LegalSection } from "@/components/legal/LegalPage";
import type { DocumentContent } from "@/components/docs/content/types";
import { CONTACT_EMAIL } from "../privacy/en";

/**
 * Die Nutzungsbedingungen auf Deutsch — eine Übersetzung des englischen
 * Originals (ADR 44), das maßgeblich bleibt.
 */
const UPDATED_DE = "25. Juli 2026";

const sections: LegalSection[] = [
  {
    heading: "1. Wer GLU betreibt",
    body: (
      <p>
        GLU (der „Dienst“) ist ein persönliches, nicht-kommerzielles Projekt,
        betrieben von Ioan Biticu („ich“, „mir“, „mich“) unter{" "}
        <code>ioan.dev/glu</code>. Es ist ein Pomodoro- und Fokus-Tracker, zuerst für
        Tablets gedacht, kostenlos angeboten und offen entwickelt. Du erreichst mich
        unter <LegalLink href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</LegalLink>.
      </p>
    ),
  },
  {
    heading: "2. Zustimmung",
    body: (
      <p>
        Indem du GLU nutzt, stimmst du diesen Bedingungen zu. Wenn du nicht
        zustimmst, nutz den Dienst bitte nicht. Sie gelten neben der{" "}
        <LegalLink href="/privacy">Datenschutzerklärung</LegalLink>, die beschreibt,
        welche Daten verarbeitet werden und wo sie liegen.
      </p>
    ),
  },
  {
    heading: "3. Was der Dienst ist",
    body: (
      <>
        <p>
          Ein Timer, eine Aufzeichnung der Fokus-Sitzungen, die du abschließt, und
          eine optionale Todoist-Integration, die deine Aufgaben anzeigt, dich diese
          abschließen lässt und einen Zeitkommentar hinzufügt, wenn du eine Sitzung
          an einer fokussierten Aufgabe beendest.
        </p>
        <p>
          Es ist ein persönliches Werkzeug, kein Produkt mit einem Support-Team.
          Funktionen können sich ändern, und der Dienst kann jederzeit ohne Ankündigung
          unterbrochen oder eingestellt werden.
        </p>
      </>
    ),
  },
  {
    heading: "4. Deine Daten liegen auf deinem Gerät",
    body: (
      <>
        <p>
          Dein Sitzungsverlauf liegt im lokalen Speicher deines Browsers — es gibt
          kein Konto, keine serverseitige Kopie und kein Backup. Das ist eine bewusste
          Entwurfsentscheidung, und sie hat eine Folge, die du als Bedingung lesen
          solltest und nicht als Fußnote:
        </p>
        <ul>
          <li>
            Wenn du die Websitedaten deines Browsers löschst, privat surfst oder Gerät
            oder Browser wechselst, ist der Verlauf weg oder nicht vorhanden. Weder
            ich noch sonst jemand kann ihn wiederherstellen.
          </li>
          <li>
            Das Archiv behält höchstens die letzten 90 Tage; ältere Tage fallen
            automatisch heraus.
          </li>
        </ul>
        <p>
          <b>Verlass dich bei GLU nicht auf eine Buchführung</b> für abrechenbare
          Stunden oder irgendetwas anderes, das im Nachhinein zählt.
        </p>
      </>
    ),
  },
  {
    heading: "5. Dein Todoist-Konto",
    body: (
      <>
        <p>
          Wenn du Todoist verbindest, handelt GLU auf deine Anweisung hin und mit
          deiner Erlaubnis. Du bist für das Konto verantwortlich, das du verbindest,
          und dafür, zu prüfen, was GLU damit tut — konkret: Aufgaben abschließen oder
          wieder öffnen, die du antippst, und einen einzelnen Zeitkommentar posten,
          wenn eine fokussierte Sitzung endet.
        </p>
        <p>
          Verbinde nur ein Konto, über das du verfügst. Du kannst den Zugriff
          jederzeit widerrufen, über Einstellungen → Todoist → Abmelden oder über
          Todoists eigene Kontoeinstellungen. Todoist ist ein eigenständiger Dienst,
          für den{" "}
          <LegalLink href="https://todoist.com/terms">
            dessen eigene Bedingungen
          </LegalLink>{" "}
          gelten; ich bin weder für ihn noch für seine Verfügbarkeit oder Änderungen
          an seiner API verantwortlich.
        </p>
      </>
    ),
  },
  {
    heading: "6. Zulässige Nutzung",
    body: (
      <>
        <p>Du stimmst zu, Folgendes zu unterlassen:</p>
        <ul>
          <li>
            den Dienst zu überfluten, auszulesen oder zu automatisieren oder die
            Anfragegrenzen zu umgehen, die er anwendet — sie existieren, damit ein
            kleiner Server für alle erreichbar bleibt, die ihn nutzen;
          </li>
          <li>
            seine Sicherheit zu sondieren, zu scannen oder zu umgehen zu versuchen
            oder zu versuchen, an Daten anderer zu gelangen;
          </li>
          <li>
            ein Todoist-Konto zu verbinden, über das du nicht verfügst, oder den
            Dienst zu nutzen, um in das Konto einer anderen Person einzugreifen;
          </li>
          <li>den Dienst für irgendetwas Rechtswidriges zu nutzen.</li>
        </ul>
        <p>
          Anfragen über der Grenze werden automatisch abgelehnt, und missbräuchlicher
          Verkehr kann ohne Ankündigung blockiert werden.
        </p>
      </>
    ),
  },
  {
    heading: "7. Verfügbarkeit",
    body: (
      <p>
        GLU läuft auf bescheidener persönlicher Infrastruktur. Es gibt keine Zusage
        zur Verfügbarkeit, kein Service-Level und keine Garantie, dass eine laufende
        Sitzung einen Neustart oder eine Auslieferung übersteht — obwohl dein
        Timer-Zustand lokal gespeichert wird und es normalerweise tut.
      </p>
    ),
  },
  {
    heading: "8. Geistiges Eigentum und Lizenzen",
    body: (
      <p>
        GLUs Quellcode ist auf{" "}
        <LegalLink href="https://github.com/ioandev/glu">GitHub</LegalLink> unter der
        Apache License 2.0 veröffentlicht, und die Lizenzen der Komponenten von
        Dritten, auf denen er aufbaut, sind im Repository aufgeführt. Diese
        Lizenzbedingungen gelten für den <i>Code</i>; diese Bedingungen gelten für
        deine Nutzung des <i>gehosteten Dienstes</i>. Der Name GLU, seine Texte und
        sein Design gehören mir; Name und Logo von Todoist gehören Doist und werden
        verwendet, um die Integration zu benennen.
      </p>
    ),
  },
  {
    heading: "9. Keine Gewährleistung",
    body: (
      <p>
        Der Dienst wird „wie besehen“ und „wie verfügbar“ bereitgestellt, ohne
        Gewährleistung jeder Art, ausdrücklich oder stillschweigend, einschließlich
        der Eignung für einen bestimmten Zweck. Ich sichere nicht zu, dass er genau,
        ununterbrochen, pünktlich oder fehlerfrei ist — auch nicht, dass ein Signal am
        Sitzungsende pünktlich ankommt, denn das hängt von deinem Browser und deinem
        Betriebssystem ab.
      </p>
    ),
  },
  {
    heading: "10. Haftungsbeschränkung",
    body: (
      <p>
        Soweit gesetzlich zulässig, hafte ich nicht für mittelbare, beiläufige oder
        Folgeschäden, die aus deiner Nutzung des Dienstes entstehen, und auch nicht
        für verlorenen Sitzungsverlauf, verpasste Signale oder Änderungen, die über
        den Dienst an deinem Todoist-Konto vorgenommen wurden. Nichts hiervon
        schließt eine Haftung aus, die rechtlich nicht ausgeschlossen werden kann.
      </p>
    ),
  },
  {
    heading: "11. Änderungen dieser Bedingungen",
    body: (
      <p>
        Diese Bedingungen können sich ändern; das Datum „Zuletzt aktualisiert“ oben
        gibt die aktuelle Fassung wieder, und die weitere Nutzung nach einer Änderung
        bedeutet, dass du sie annimmst.
      </p>
    ),
  },
  {
    heading: "12. Anwendbares Recht",
    body: (
      <p>
        Diese Bedingungen unterliegen dem Recht von England und Wales. Nichts hiervon
        beschränkt Rechte, die dir nach zwingendem Verbraucher- oder
        Datenschutzrecht an deinem Wohnort zustehen.
      </p>
    ),
  },
  {
    heading: "13. Kontakt",
    body: (
      <p>
        Fragen zu diesen Bedingungen? Schreib an{" "}
        <LegalLink href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</LegalLink>.
      </p>
    ),
  },
];

const content: DocumentContent = {
  updated: UPDATED_DE,
  title: "Nutzungsbedingungen",
  intro: (
    <>
      GLU ist ein kostenloser, persönlicher Fokus-Timer, bereitgestellt wie besehen.
      Deine Daten bleiben auf deinem Gerät und dein Todoist-Konto bleibt deins. Die{" "}
      <LegalLink href="/privacy">Datenschutzerklärung</LegalLink> deckt die Datenseite
      ab.
    </>
  ),
  sections,
};

export default content;

import { DataList, LegalLink, type LegalSection } from "@/components/legal/LegalPage";
import type { DocumentContent } from "@/components/docs/content/types";
import { CONTACT_EMAIL } from "./en";

/**
 * Die Datenschutzerklärung auf Deutsch — eine Übersetzung des englischen
 * Originals (ADR 44), das maßgeblich bleibt. Ändert sich dort eine Aussage,
 * ändert sich diese Datei in derselben Sitzung mit, `updated` eingeschlossen.
 */
const UPDATED_DE = "25. Juli 2026";

const sections: LegalSection[] = [
  {
    heading: "1. Die Kurzfassung",
    body: (
      <ul>
        <li>
          GLU hat keine Konten, keine Datenbank und keine Analyse. Es gibt keine
          serverseitige Aufzeichnung über dich.
        </li>
        <li>
          Dein Fokus-Verlauf — Sitzungen, Dauern, Umgebungs-Chips — wird in deinem
          eigenen Browser gespeichert und nie hochgeladen.
        </li>
        <li>
          Todoist ist optional. Wenn du es verbindest, liegen deine Tokens
          verschlüsselt in einem Cookie, das nur der Server öffnen kann, und der
          Server behält keine Kopie.
        </li>
        <li>
          Keine Werbe-Cookies, keine Tracker von Dritten, kein Einwilligungsbanner
          nötig.
        </li>
      </ul>
    ),
  },
  {
    heading: "2. Wer verantwortlich ist",
    body: (
      <p>
        GLU ist ein persönliches, nicht-kommerzielles Projekt, betrieben von Ioan
        Biticu, bereitgestellt unter <code>ioan.dev/glu</code>. Bei
        Datenschutzfragen oder -anliegen schreib an{" "}
        <LegalLink href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</LegalLink>.
      </p>
    ),
  },
  {
    heading: "3. Was auf deinem Gerät gespeichert wird",
    body: (
      <>
        <p>
          GLU hält seinen Zustand im <b>lokalen Speicher</b> deines Browsers, unter
          einem einzigen versionierten Schlüssel. Er wird nie hochgeladen, und es
          gibt auch nichts, wohin er hochgeladen werden könnte. Er enthält:
        </p>
        <DataList
          items={[
            {
              term: "Timer-Zustand",
              detail:
                "Der laufende oder pausierte Timer, seine Dauer und die zuletzt gewählte Voreinstellung — damit ein Neuladen oder ein zugeklappter Deckel deine Sitzung nicht verliert.",
            },
            {
              term: "Sitzungsverlauf",
              detail:
                "Jede abgeschlossene Sitzung: wann sie endete, wie lange sie lief und welche Umgebungs-Chips an waren. Der aktuelle Tag, dazu ein Archiv von höchstens den letzten 90 Tagen.",
            },
            {
              term: "Einstellungen",
              detail:
                "Uhrendesign, Chrome-Stil, Farbschema und die Wachbleiben-Schalter.",
            },
            {
              term: "Todoist-Auswahl",
              detail:
                "Falls du Todoist nutzt: die gewählte Aufgabenliste, die fokussierte Aufgabe und jeder Zeitkommentar, der noch auf den Versand wartet.",
            },
          ]}
        />
        <p>
          Wenn du die Websitedaten für <code>ioan.dev</code> in deinem Browser
          löschst, ist all das dauerhaft und vollständig weg. „Neuer Tag“ in der App
          räumt die sichtbare Zählung ins Archiv; das Archiv selbst ist auf 90 Tage
          begrenzt und lässt den ältesten Tag automatisch fallen.
        </p>
      </>
    ),
  },
  {
    heading: "4. Cookies",
    body: (
      <>
        <p>
          GLU setzt keine Werbe-, Analyse- oder seitenübergreifenden Cookies. Die
          einzigen Cookies, die es setzen kann, sind unbedingt erforderlich und
          existieren nur, wenn du Todoist verbindest:
        </p>
        <DataList
          items={[
            {
              term: "glu_todoist",
              detail:
                "Deine verschlüsselten (versiegelten) Todoist-Tokens. httpOnly, damit Skripte der Seite es nicht lesen können; Secure und SameSite=Lax in der Produktion; auf /glu beschränkt. Wird beim Abmelden gelöscht.",
            },
            {
              term: "glu_oauth_state",
              detail:
                "Ein kurzlebiger Wert zum Schutz gegen Fälschungen, der während der Anmeldung verwendet wird, zehn Minuten gültig ist und danach sofort verworfen wird.",
            },
          ]}
        />
        <p>
          Weil beide für eine Funktion unbedingt erforderlich sind, die du bewusst
          gestartet hast, gibt es kein Einwilligungsbanner. Ein Banner, das um
          Erlaubnis für genau das bittet, was du gerade angeklickt hast, ist Theater
          — und es erzieht Menschen dazu, die wichtigen wegzuklicken.
        </p>
        <p>
          Auch dein bevorzugtes Farbschema wird im Browserspeicher gemerkt. Das ist
          eine Einstellung, kein Tracking.
        </p>
      </>
    ),
  },
  {
    heading: "5. Todoist",
    body: (
      <>
        <p>
          Todoist zu verbinden ist völlig optional; alles andere in GLU funktioniert
          auch ohne. Wenn du es doch verbindest:
        </p>
        <ul>
          <li>
            Du autorisierst GLU über Todoists eigenen OAuth-Bildschirm. GLU fragt
            Lese- und Schreibzugriff an, weil es deine Aufgaben anzeigt und — nur auf
            dein Handeln hin — sie abschließt und einen Zeitkommentar hinzufügt.
          </li>
          <li>
            Die daraus entstehenden Tokens werden <b>versiegelt (verschlüsselt) in
            einem httpOnly-Cookie</b> abgelegt. Der Browser hält einen undurchsichtigen
            Block, den er nicht entschlüsseln kann; der Server kann ihn öffnen,
            speichert aber nichts. Es gibt keine Token-Datenbank, weil es keine
            Datenbank gibt.
          </li>
          <li>
            <b>Aller Todoist-Verkehr läuft über GLUs eigenen Server</b>, dein Token
            erreicht die Seite also nie und dein Browser kontaktiert Todoist nie
            direkt. Bilder und Dateianhänge von Aufgaben werden genauso geholt,
            weshalb dein Browser auch nie mit Todoists CDN spricht.
          </li>
        </ul>
        <p>
          Was GLU in dein Konto <b>schreibt</b>, und nur, wenn du es verlangst: eine
          Aufgabe abschließen oder wieder öffnen und einen einzelnen Zeitkommentar
          der Form <code>[25m] You spent 25 minutes on this</code> posten. Dieser
          Satz wird vom Server zusammengesetzt, nicht von der Seite — GLU kann
          keinen beliebigen Text an deine Aufgaben posten.
        </p>
        <p>
          Du kannst die Verbindung jederzeit trennen: <b>Einstellungen → Todoist →
          Abmelden</b> löscht das Cookie, und wenn du GLU in den Einstellungen deines
          Todoist-Kontos den Zugriff entziehst, endet er sofort und unabhängig von
          allem, was ich tue.
        </p>
      </>
    ),
  },
  {
    heading: "6. Was der Server sieht",
    body: (
      <>
        <p>
          Der Server ist ein zustandsloser Proxy. Er hat keine Datenbank, keinen
          Sitzungsspeicher und keine Nutzerdatensätze. Er sieht nur, was jeder
          Webserver beim Bearbeiten einer Anfrage sieht:
        </p>
        <ul>
          <li>
            <b>Zähler für die Ratenbegrenzung.</b> Damit ein kleiner Container
            erreichbar bleibt, werden Anfragen pro Client gezählt. Der Schlüssel des
            Zählers wird aus deiner IP-Adresse abgeleitet (IPv6 wird nach
            Netzwerkpräfix gruppiert, nie die einzelne Adresse), liegt{" "}
            <b>nur im Arbeitsspeicher</b>, wird nie auf die Festplatte geschrieben
            und geht beim Neustart des Prozesses vollständig verloren. Die Logzeile
            einer abgelehnten Anfrage enthält bewusst keine Adresse.
          </li>
          <li>
            <b>Gewöhnliche Betriebslogs</b> — Fehler und Diagnosen, die nötig sind,
            um die Seite am Laufen zu halten. Es gibt keine Analyse-Pipeline, kein
            Event-Tracking und kein Profiling.
          </li>
        </ul>
      </>
    ),
  },
  {
    heading: "7. Dritte",
    body: (
      <>
        <ul>
          <li>
            <b>Todoist</b> — nur wenn du es verbindest. Deine Nutzung von Todoist
            richtet sich nach{" "}
            <LegalLink href="https://todoist.com/privacy">
              deren Datenschutzerklärung
            </LegalLink>
            .
          </li>
          <li>
            <b>Hosting-Infrastruktur</b> — die Server, auf denen die Seite läuft und
            die Anfragen in meinem Auftrag verarbeiten.
          </li>
        </ul>
        <p>
          Das ist die ganze Liste. GLU lädt keine Schriften, Skripte oder Bilder vom
          Server eines Dritten: Seine Content-Security-Policy erlaubt nur seinen
          eigenen Ursprung, ein Tracker von Dritten könnte also nicht einmal laufen,
          wenn er versehentlich eingebaut würde.
        </p>
      </>
    ),
  },
  {
    heading: "8. Berechtigungen, um die die App bittet",
    body: (
      <>
        <p>
          Jede davon ist eine Browser-Berechtigung, die vollständig auf deinem Gerät
          behandelt wird. Nichts daran wird irgendwohin gemeldet, und wenn du eine
          ablehnst, bleibt der Timer vollständig nutzbar.
        </p>
        <DataList
          items={[
            {
              term: "Benachrichtigungen",
              detail:
                "Damit eine beendete Sitzung dich erreichen kann, wenn GLU in einem Hintergrund-Tab liegt. Wird einmal beim ersten Start gefragt; eine Ablehnung merkt sich dein Browser, und es wird nie wieder gefragt.",
            },
            {
              term: "Bildschirmsperre verhindern",
              detail:
                "Damit das Tablet nicht mitten in der Sitzung einschläft. Gesteuert über die zwei Schalter unter Einstellungen → Bildschirm.",
            },
            {
              term: "Ton",
              detail:
                "Jeder Ton am Sitzungsende wird im Browser erzeugt. Es wird keine Audiodatei heruntergeladen und nichts aufgenommen — GLU fragt nie nach Mikrofon- oder Kamerazugriff.",
            },
          ]}
        />
      </>
    ),
  },
  {
    heading: "9. Aufbewahrung",
    body: (
      <p>
        Auf deinem Gerät: so lange, wie du es behältst — das Sitzungsarchiv begrenzt
        sich selbst auf 90 Tage, und das Löschen der Websitedaten entfernt alles auf
        einmal. Auf dem Server: Es wird nichts aufbewahrt, weil nichts gespeichert
        wird. Das Todoist-Cookie lebt in deinem Browser, bis du dich abmeldest oder
        es abläuft; Zähler der Ratenbegrenzung verschwinden beim Neustart;
        Betriebslogs werden kurz für Sicherheit und Fehlersuche aufbewahrt.
      </p>
    ),
  },
  {
    heading: "10. Deine Rechte",
    body: (
      <p>
        Je nachdem, wo du lebst, hast du womöglich das Recht, über dich gespeicherte
        personenbezogene Daten einzusehen, zu berichtigen, zu exportieren oder
        löschen zu lassen und ihrer Verarbeitung zu widersprechen. GLU ist so gebaut,
        dass es fast nichts gibt, wogegen du sie ausüben könntest: kein Konto, kein
        serverseitiges Profil und ein lokaler Verlauf, den nur du lesen kannst. Wenn
        du glaubst, dass ich doch etwas habe, schreib an{" "}
        <LegalLink href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</LegalLink>, und
        ich kümmere mich darum.
      </p>
    ),
  },
  {
    heading: "11. Kinder",
    body: (
      <p>
        GLU richtet sich nicht an Kinder, und ich erhebe wissentlich keine Daten von
        Personen unter 16 Jahren.
      </p>
    ),
  },
  {
    heading: "12. Änderungen",
    body: (
      <p>
        Sollte GLU je anders mit Daten umgehen, ändert sich diese Seite mit, und das
        Datum „Zuletzt aktualisiert“ oben rückt vor. Das Projekt ist Open Source, die
        Änderung ist also nicht nur hier, sondern auch in seinem Verlauf sichtbar.
      </p>
    ),
  },
];

const content: DocumentContent = {
  updated: UPDATED_DE,
  title: "Datenschutzerklärung",
  intro: (
    <>
      GLU ist ein Pomodoro- und Fokus-Tracker, der deine Daten auf deinem eigenen
      Gerät behält. Diese Seite erklärt genau, was er verarbeitet, wohin es geht und
      was er niemals tut. Sie gilt neben den{" "}
      <LegalLink href="/terms">Nutzungsbedingungen</LegalLink>.
    </>
  ),
  sections,
};

export default content;

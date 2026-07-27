import { DataList, LegalLink, type LegalSection } from "@/components/legal/LegalPage";
import type { DocumentContent } from "@/components/docs/content/types";

/**
 * Every claim in this file is traceable to an ADR or a source file (ADR 26).
 * If one of them stops being true, the fix is the code — or this file plus
 * `UPDATED`, never one without the other.
 */
export const CONTACT_EMAIL = "ioanb7code@gmail.com";
export const UPDATED = "25 July 2026";

const sections: LegalSection[] = [
  {
    heading: "1. The short version",
    body: (
      <ul>
        <li>
          GLU has no accounts, no database, and no analytics. There is no server-side
          record of you.
        </li>
        <li>
          Your focus history — sessions, durations, environment toggles — is stored in
          your own browser and never uploaded.
        </li>
        <li>
          Todoist is optional. If you connect it, your tokens live encrypted in a cookie
          only the server can open, and the server keeps no copy.
        </li>
        <li>No advertising cookies, no third-party trackers, no consent banner needed.</li>
      </ul>
    ),
  },
  {
    heading: "2. Who is responsible",
    body: (
      <p>
        GLU is a personal, non-commercial project operated by Ioan Biticu, served at{" "}
        <code>ioan.dev/glu</code>. For any privacy question or request, email{" "}
        <LegalLink href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</LegalLink>.
      </p>
    ),
  },
  {
    heading: "3. What is stored on your device",
    body: (
      <>
        <p>
          GLU keeps its state in your browser&rsquo;s <b>local storage</b>, under a single
          versioned key. It is never uploaded, and there is nowhere for it to be uploaded
          to. It holds:
        </p>
        <DataList
          items={[
            {
              term: "Timer state",
              detail:
                "The running or paused timer, its duration and the preset you last chose — so a reload or a closed lid does not lose your session.",
            },
            {
              term: "Session history",
              detail:
                "Each completed session: when it ended, how long it ran, and which environment toggles were on. The current day, plus an archive of at most the last 90 days.",
            },
            {
              term: "Preferences",
              detail:
                "Clock design, chrome style, colour scheme, and the stay-awake switches.",
            },
            {
              term: "Todoist selections",
              detail:
                "If you use Todoist: the task list you picked, the task you focused, and any time-tracking comment still waiting to be sent.",
            },
          ]}
        />
        <p>
          Clearing site data for <code>ioan.dev</code> in your browser deletes all of it,
          permanently and completely. &ldquo;New day&rdquo; in the app clears the visible
          count into the archive; the archive itself is capped at 90 days and drops the
          oldest day automatically.
        </p>
      </>
    ),
  },
  {
    heading: "4. Cookies",
    body: (
      <>
        <p>
          GLU sets no advertising, analytics, or cross-site cookies. The only cookies it
          can set are strictly necessary and only exist if you connect Todoist:
        </p>
        <DataList
          items={[
            {
              term: "glu_todoist",
              detail:
                "Your encrypted (sealed) Todoist tokens. httpOnly, so page scripts cannot read it; Secure and SameSite=Lax in production; scoped to /glu. Cleared when you log out.",
            },
            {
              term: "glu_oauth_state",
              detail:
                "A short-lived anti-forgery value used during login, valid for ten minutes and discarded immediately after.",
            },
          ]}
        />
        <p>
          Because both are strictly necessary for a feature you deliberately started,
          there is no consent banner. A banner that asks permission for the thing you just
          clicked is theatre, and it trains people to dismiss the ones that matter.
        </p>
        <p>
          Your colour-scheme preference is also remembered in browser storage. That is a
          setting, not tracking.
        </p>
      </>
    ),
  },
  {
    heading: "5. Todoist",
    body: (
      <>
        <p>
          Connecting Todoist is entirely optional; everything else in GLU works without
          it. If you do connect it:
        </p>
        <ul>
          <li>
            You authorise GLU through Todoist&rsquo;s own OAuth screen. GLU requests
            read-and-write access, because it shows your tasks and — only on your action —
            completes them and adds a time comment.
          </li>
          <li>
            The resulting tokens are <b>sealed (encrypted) into an httpOnly cookie</b>.
            The browser holds an opaque blob it cannot decrypt; the server can open it but
            stores nothing. There is no token database because there is no database.
          </li>
          <li>
            <b>All Todoist traffic goes through GLU&rsquo;s own server</b>, so your token
            never reaches the page and your browser never contacts Todoist directly. Task
            images and file attachments are fetched the same way, which is why your
            browser never talks to Todoist&rsquo;s CDN either.
          </li>
        </ul>
        <p>
          What GLU <b>writes</b> to your account, and only when you ask it to: completing
          or un-completing a task, and posting a single time-tracking comment of the form{" "}
          <code>[25m] You spent 25 minutes on this</code>. That sentence is composed by
          the server, not by the page — GLU cannot post arbitrary text to your tasks.
        </p>
        <p>
          You can disconnect at any time: <b>Settings → Todoist → Log out</b> clears the
          cookie, and revoking GLU in your Todoist account settings stops the access
          immediately and independently of anything I do.
        </p>
      </>
    ),
  },
  {
    heading: "6. What the server sees",
    body: (
      <>
        <p>
          The server is a stateless proxy. It has no database, no session store, and no
          user records. It sees only what any web server sees while handling a request:
        </p>
        <ul>
          <li>
            <b>Rate-limiting counters.</b> To keep a small container available, requests
            are counted per client. The counter key is derived from your IP address (IPv6
            is grouped by network prefix, never the individual address), held{" "}
            <b>in memory only</b>, never written to disk, and lost entirely when the
            process restarts. The log line for a rejected request deliberately contains no
            address.
          </li>
          <li>
            <b>Ordinary operational logs</b> — errors and diagnostics needed to keep the
            site running. There is no analytics pipeline, no event tracking, and no
            profiling.
          </li>
        </ul>
      </>
    ),
  },
  {
    heading: "7. Third parties",
    body: (
      <>
        <ul>
          <li>
            <b>Todoist</b> — only if you connect it. Your use of Todoist is governed by{" "}
            <LegalLink href="https://todoist.com/privacy">their privacy policy</LegalLink>
            .
          </li>
          <li>
            <b>Hosting infrastructure</b> — the servers the site runs on, which process
            requests on my behalf.
          </li>
        </ul>
        <p>
          That is the whole list. GLU loads no fonts, scripts, or images from anyone
          else&rsquo;s server: its content security policy only permits its own origin, so
          a third-party tracker could not run even if one were added by accident.
        </p>
      </>
    ),
  },
  {
    heading: "8. Permissions the app asks for",
    body: (
      <>
        <p>
          Each of these is a browser permission, handled entirely on your device. Nothing
          about them is reported anywhere, and declining any of them leaves the timer fully
          usable.
        </p>
        <DataList
          items={[
            {
              term: "Notifications",
              detail:
                "So a finished session can reach you when GLU is in a background tab. Asked once, on your first Start; declining is remembered by your browser and never asked again.",
            },
            {
              term: "Screen wake lock",
              detail:
                "So the tablet does not sleep mid-session. Controlled by the two switches in Settings → Screen.",
            },
            {
              term: "Sound",
              detail:
                "Every end-of-session sound is generated in the browser. No audio file is downloaded and nothing is recorded — GLU never requests microphone or camera access.",
            },
          ]}
        />
      </>
    ),
  },
  {
    heading: "9. Retention",
    body: (
      <p>
        On your device: for as long as you keep it — the session archive self-limits to 90
        days, and clearing site data removes everything at once. On the server: nothing is
        retained, because nothing is stored. The Todoist cookie lives in your browser until
        you log out or it expires; rate-limiting counters vanish on restart; operational
        logs are kept briefly for security and debugging.
      </p>
    ),
  },
  {
    heading: "10. Your rights",
    body: (
      <p>
        Depending on where you live you may have rights to access, correct, export, or
        delete personal data held about you, and to object to its processing. GLU is built
        so that there is almost nothing to exercise them against: no account, no server-side
        profile, and a local history only you can read. For anything you believe I do hold,
        email <LegalLink href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</LegalLink> and I
        will action it.
      </p>
    ),
  },
  {
    heading: "11. Children",
    body: (
      <p>
        GLU is not directed at children and I do not knowingly collect data from anyone
        under 16.
      </p>
    ),
  },
  {
    heading: "12. Changes",
    body: (
      <p>
        If GLU ever starts handling data differently, this page changes with it and the
        &ldquo;Last updated&rdquo; date above moves. The project is open source, so the
        change is visible in its history as well as here.
      </p>
    ),
  },
];

/**
 * The Privacy Policy in English — the **authoritative** text (ADR 44). Every
 * other language carries a notice saying so; this one does not need one.
 */
const content: DocumentContent = {
  updated: UPDATED,
  title: "Privacy Policy",
  intro: (
    <>
      GLU is a pomodoro and focus tracker that keeps your data on your own device. This
      page explains exactly what it handles, where it goes, and what it never does. It
      applies alongside the <LegalLink href="/terms">Terms of Service</LegalLink>.
    </>
  ),
  sections,
};

export default content;

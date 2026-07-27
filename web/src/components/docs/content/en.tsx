import { DataList, LegalLink, type LegalSection } from "@/components/legal/LegalPage";
import type { DocumentContent } from "./types";
import { CLOCK_COUNT } from "@/clocks/registry";

/**
 * The GLU manual (ADR 29) — **one document, rendered by two surfaces**: the
 * `/glu/docs` route and the drawer's modal. Both import this array, so there
 * is exactly one copy of every sentence.
 *
 * Every statement here is a claim about the running app, traceable to a source
 * file. Change a default, a hotkey or an undo window and this file changes with
 * it, `UPDATED` included — a manual that has drifted is worse than no manual,
 * because the user has no way to tell which half is lying.
 *
 * House rules for edits: written for the person holding the tablet, not for a
 * reviewer of the architecture. Internals appear only where they change what
 * someone should *expect*. ADR numbers never appear in the copy.
 *
 * Kept free of Mantine and of store hooks on purpose: the route renders this on
 * the server with no client JavaScript, and the modal code-splits it.
 */
const updated = "26 July 2026";

const title = "How GLU works";

const intro = (
  <>
    GLU is a focus timer built for a tablet propped up next to you while you work.
    This page is everything it does — the timer, the clock gallery, the environment
    chips, the session record, and the optional Todoist connection. It is one page
    on purpose: use your browser&rsquo;s find-in-page to jump around.
  </>
);

const sections: LegalSection[] = [
  {
    heading: "What GLU is",
    body: (
      <>
        <p>
          A pomodoro and focus tracker. You pick a length, press Start, and work
          until the clock reaches zero. GLU records the run so you can see how many
          you have done today, and — if you connect Todoist — it can note the time
          on the task you were working on.
        </p>
        <p>
          There is <b>no account and no sign-up</b>. Everything GLU knows lives in
          the browser you are reading this in. It is one screen: no menus to get
          lost in, no dashboard, nothing to configure before it is useful.
        </p>
        <p>
          The very first time you open GLU it shows a short introduction instead of
          the timer, with a button that takes you in. You see it <b>once per
          browser</b> — after that GLU opens straight onto the clock. It stays
          readable at <LegalLink href="/welcome">the welcome page</LegalLink> if you
          ever want it again, or want to send it to somebody. Clearing your browser
          data resets that along with everything else, so GLU will greet you as a
          newcomer again.
        </p>
      </>
    ),
  },
  {
    heading: "Install it like an app",
    body: (
      <p>
        GLU can be installed to a home screen or desktop — &ldquo;Install
        app&rdquo; in the browser menu on Android, &ldquo;Add to Home Screen&rdquo;
        on an iPad, the install control in the address bar on a desktop browser —
        and it then opens without browser chrome, which is the right look for a
        timer on a stand. On Android, pick the <i>Install</i> wording where both
        appear: the plain shortcut keeps a browser bar at the top. <b>It is not an offline app</b>: it needs
        a connection every time it starts. Nothing else changes; it is the same app,
        with the same data, in a different window.
      </p>
    ),
  },
  {
    heading: "The timer",
    body: (
      <>
        <p>
          The row above the clock holds the presets — <b>5, 10, 15, 20, 30, 45 and
          60 minutes</b>. Twenty is selected when you first arrive. Tapping a preset
          sets the timer, and tapping one <i>during</i> a run retargets that run
          rather than waiting for it to finish.
        </p>
        <p>
          Below the clock, two buttons — the biggest targets on the screen, because
          they are the ones you reach for without looking. The first one always
          names what it is about to do: <b>Start</b> when nothing is running,{" "}
          <b>Pause</b> while it is, <b>Resume</b> once you have paused. The second
          is <b>Stop</b>. Under them, <b>+1 / +5 / −1 / −5</b>, which mean one of two
          things depending on what the timer is doing.
        </p>
        <p>
          <i>During</i> a run they nudge the run you are in, and only that run —
          stopping returns you to the length you picked. With nothing running,
          which includes sitting at 00:00 after a run has finished, they set how
          long the <b>next</b> run will be. A length that is not one of the seven
          presets appears in the preset row as an extra button of its own,
          selected, and it stays there through starting, stopping and restarting
          until you tap a preset again. One minute is the shortest run GLU will
          hold; subtracting past it on a clock that is already counting simply
          finishes the run.
        </p>
        <DataList
          items={[
            {
              term: "Idle",
              detail:
                "Nothing running. The clock shows the length you have selected, ready to start.",
            },
            {
              term: "Running",
              detail: "Counting down. The numbers do not jitter — the digits hold their width.",
            },
            {
              term: "Paused",
              detail:
                "Held where you left it. Press Resume to carry on from the same second.",
            },
            {
              term: "Finished",
              detail:
                "Zero, and visibly different from idle. Nothing restarts on its own — the next run is your decision.",
            },
          ]}
        />
        <p>
          <b>The timer survives a reload, a closed lid and a backgrounded tab.</b>{" "}
          It counts from the time it started rather than from ticks it has to stay
          awake to receive, so coming back to the tab shows the correct remaining
          time, not a clock that paused when the screen did. If a run expired while
          you were away, you will find it finished and silent — the sound is for the
          moment it happens, not for hours later.
        </p>
      </>
    ),
  },
  {
    heading: "Keyboard shortcuts",
    body: (
      <>
        <p>If you have a keyboard attached:</p>
        <DataList
          items={[
            { term: "P", detail: "Pause, or resume a paused run." },
            { term: "S", detail: "Stop the current run." },
            {
              term: "N",
              detail:
                "Abandon whatever is running and start a fresh run at the selected length.",
            },
            {
              term: "Ctrl + C",
              detail:
                "Also stops — the habit borrowed from a terminal. If you have text selected it copies instead, exactly as you would expect.",
            },
          ]}
        />
        <p>
          Shortcuts never fire while you are typing in a text field, and holding a
          key down does not repeat the action. Stop names its shortcut in a tooltip,
          and so does the first button once there is a run to pause or resume, so
          there is nothing to memorise from this page.
        </p>
      </>
    ),
  },
  {
    heading: "The clock is a gallery",
    body: (
      <>
        <p>
          There are{" "}
          <b>{CLOCK_COUNT} clock designs</b>, and the one on screen is a choice, not
          a default you are stuck with. <b>Swipe the clock sideways</b> to move
          through them; on a wide screen there are also chevrons either side of the
          clock, resting faint until you hover or focus them. On a narrow screen a
          one-time hint says so, and does not come back once dismissed.
        </p>
        <p>
          The new design slides in from the direction you swiped. Your choice is
          remembered for next time.
        </p>
        <p>
          <b>The active clock recolours the whole page.</b> Each design brings its
          own palette, so the background and accents change with it — and every one
          of them works in both dark and light. Switch between dark and light from
          the drawer, under <b>Appearance</b>; it follows your system setting until
          you tell it otherwise.
        </p>
      </>
    ),
  },
  {
    heading: "Environment toggles",
    body: (
      <>
        <p>
          Six chips — <b>Music</b>, <b>Podcast</b>, <b>TV</b>, <b>Silence</b>,{" "}
          <b>Noisy</b>, <b>Headphones</b> — describing the conditions you are
          working in. They are a record, not a control: nothing about the app
          changes when you press one.
        </p>
        <ul>
          <li>
            <b>Silence clears the other four sound chips</b>, because you cannot be
            in silence and have the TV on.
          </li>
          <li>
            <b>Headphones is independent</b> — it is equipment on your head, not a
            sound environment, so it can be on alongside any of the others.
          </li>
        </ul>
        <p>
          Whatever is lit when a run finishes is stored with that session, and — if
          you use Todoist and leave the time-comment setting on — it is named in the
          comment GLU posts: <i>&ldquo;[25m] You spent 25 minutes on this — with
          music, on headphones&rdquo;</i>.
        </p>
        <p>
          <b>Silence is not a mute button.</b> It says how you worked. The
          end-of-run sound is controlled by your device&rsquo;s volume, and nothing
          else.
        </p>
      </>
    ),
  },
  {
    heading: "Sessions and “New day”",
    body: (
      <>
        <p>
          Every completed run adds a dot under the timer, with a count beside them.
          After twelve dots the rest are summarised as <code>+N</code> so a heroic
          day cannot push the layout around. The <b>Show sessions</b> switch next to
          them controls whether the count also appears on the clock itself.
        </p>
        <p>
          <b>&ldquo;New day&rdquo; resets the count to zero</b>, and asks you to
          confirm first. It is <b>manual</b> — GLU does not roll over at midnight,
          because a day of focus starts when you sit down, not when the date
          changes. Work past midnight and it is still the same seating until you say
          otherwise.
        </p>
        <p>
          The day you close is kept in an archive of <b>at most the last 90 days</b>;
          older ones drop off automatically. All of it is stored in this browser
          only — there is no server copy, no account, and no sync to another device.
          Clearing site data deletes it completely, and that is the only delete
          button there needs to be. The{" "}
          <LegalLink href="/privacy">Privacy Policy</LegalLink> lists exactly what is
          in there.
        </p>
      </>
    ),
  },
  {
    heading: "Alerts at the end of a run",
    body: (
      <>
        <p>
          When a run reaches zero while GLU is open, it plays a sound — generated in
          the browser, so nothing is downloaded. Its volume is your
          device&rsquo;s volume.
        </p>
        <p>
          Under <b>Settings → Alerts</b> you pick which one, from nine:
        </p>
        <DataList
          items={[
            {
              term: "Sound",
              detail:
                "Chime (the default), Bell, Wood, Rise, Settle, Pulse, Digital, Glass or Deep. Tapping one plays it, so you choose with your ears; tapping the one that is playing stops it.",
            },
            {
              term: "How long it plays",
              detail:
                "Once by default — the sound plays through a single time. Pick 3, 5, 10 or 20 seconds and it repeats until that much time has passed; the last repeat always finishes, so it can run a moment longer. Pressing Start, Pause, Resume or Stop — or their keys — cuts it short.",
            },
          ]}
        />
        <p>
          <b>If the tab is in the background, you also get one notification</b>{" "}
          (&ldquo;GLU — time&rsquo;s up&rdquo;), which focuses the app when you click
          it. A visible page is never notified — you are already looking at it.
          The sound works either way.
        </p>
        <p>
          <b>Settings → Alerts</b> leads with a switch for this. Turning it on asks
          your browser for permission, and turning it off stops the notifications
          without touching the sound. GLU also asks when you press Start, at most
          three times — after that it stops asking for good, and the switch is the
          way in. If your browser is blocking notifications the switch will say so,
          and tell you where to change it.
        </p>
        <p>
          <b>Stopping a run yourself is deliberately silent</b>, as is a run that
          expired while the tab was closed. Alerts exist to interrupt you when you
          are not watching — not to congratulate you for pressing Stop.
        </p>
        <p>
          On Android Chrome the notification is delivered by a small background
          helper that exists only for this purpose — it stores nothing, never
          touches the network, and changes nothing else about how GLU loads. On
          iPad, Safari does not offer notifications to a browser tab, so GLU
          falls back to the sound alone there — usually the device propped up in
          front of you with the screen kept on anyway.
        </p>
      </>
    ),
  },
  {
    heading: "Keeping the screen awake",
    body: (
      <>
        <p>
          A tablet that sleeps mid-session hides the thing you propped it up for.
          Under <b>Settings → Screen</b> there are two switches:
        </p>
        <DataList
          items={[
            {
              term: "Stay awake on the website",
              detail:
                "Off by default. Keeps the screen on for as long as GLU is open, timer or no timer — the setting for a device that lives on your desk showing the clock.",
            },
            {
              term: "Stay awake when the timer is running",
              detail:
                "On by default. Keeps the screen on during a run, and for five minutes after it pauses or ends, so you are not looking at a black screen when the sound goes.",
            },
          ]}
        />
        <p>
          Some browsers only allow this while the tab is visible, so switching away
          releases it and coming back takes it again. Nothing is reported anywhere —
          it is a request to your own device.
        </p>
      </>
    ),
  },
  {
    heading: "The last minute",
    body: (
      <>
        <p>
          Under <b>60 seconds remaining</b>, the clock&rsquo;s colour floods the whole
          background and everything else recedes. It is meant to be visible from
          across a room and out of the corner of your eye — the point where you start
          finishing your sentence rather than starting a new one. It stays through
          00:00 as the finished display, and it lifts the moment you stop or pause.
        </p>
        <p>
          <b>Tap anywhere — including the clock — and everything comes back</b>, for
          the rest of that run: the buttons, the chips, the task list. It will not
          creep back over them a few seconds later. The next run you start gets its
          own last minute.
        </p>
        <p>
          On a narrow screen none of this applies. There the clock already fills the
          first screenful and everything else sits below it, so there is nothing to
          hide — you scroll down to the controls exactly as you always would.
        </p>
      </>
    ),
  },
  {
    heading: "Todoist (optional)",
    body: (
      <>
        <p>
          GLU works perfectly well on its own. Connecting{" "}
          <LegalLink href="https://todoist.com">Todoist</LegalLink> adds a task list
          beside the timer, so the thing you are timing has a name.
        </p>
        <p>
          <b>Logging in:</b> the <i>Log in with Todoist</i> button in the top-right
          area, or <b>Settings → Todoist</b>. You approve the connection on
          Todoist&rsquo;s own screen. Log out again from the same settings row, or
          revoke GLU from inside Todoist — either one is enough, and revoking works
          without touching this app at all.
        </p>
        <DataList
          items={[
            {
              term: "Choosing what to show",
              detail:
                "The tools icon opens the source picker: a filter, a label, or a project. A project groups its tasks under a header for each section, in order, with unsectioned tasks first. A filter or a label groups every task by project too — \"Work / Today\", or just \"Work\" when the task has no section — since one of its results could belong to any project, and is ordered the way Todoist orders one by default: priority first, then date, then deadline, then where the task sits in your projects, except that a filter built around dates is still ordered priority-first here. Long lists show the first 200 tasks and say so.",
            },
            {
              term: "Shortening a long section",
              detail:
                "Settings → Tasks limits how many tasks each section shows — 10, 20, 50, 100, or all of them, which is the default. Anything over the limit sits behind a \"+N more\" line you can tap to see the rest of that section; the next visit starts capped again.",
            },
            {
              term: "Refreshing the list",
              detail:
                "The list refetches when you pick a source and whenever you come back to the tab — it never polls in the background. To ask for it yourself, pull the list down with a finger until the refresh icon fills in, then let go: it spins until the new list arrives and then slides away. The refresh icon in the top-right corner does exactly the same thing.",
            },
            {
              term: "Completing a task",
              detail:
                "Tap the priority circle on the left of a card — the same gesture as Todoist. It completes immediately and leaves the list, and a bar at the bottom gives you about ten seconds to undo it.",
            },
            {
              term: "Focusing a task",
              detail:
                "The focus button pins one task above the list. That is the task a time comment is posted to, and its card carries a running total of the time GLU has logged against it.",
            },
            {
              term: "Task details",
              detail:
                "Tapping a card opens its description and comments — images included — as a panel on tablet, full screen on a narrow display. It is read-only; nothing there changes your task.",
            },
          ]}
        />
        <p>
          <b>Time comments.</b> When a run ends with a task focused, GLU posts one
          comment to it: <code>[25m] You spent 25 minutes on this</code>. It waits a
          couple of seconds before sending — the undo bar can cancel it outright in
          that window — and for a few seconds after it lands, undo deletes it again.
          Runs shorter than your minimum do not get one; that minimum is a minute
          unless you change it under <b>Settings → Time comments</b>, where{" "}
          <b>Say how you worked</b> also decides whether your environment chips are
          named in the sentence. Both settings show you the exact comment you will
          get.
        </p>
        <p>
          GLU only ever writes those two things — a time comment, and completing or
          reopening a task — and only when you ask it to. It cannot post arbitrary
          text: the sentence is composed on GLU&rsquo;s server from the numbers and
          the chips, never typed by the page. Your Todoist connection is held in an
          encrypted cookie your browser cannot read and GLU&rsquo;s server does not
          store; all traffic to Todoist goes through that server, so your account
          token never reaches the page. The{" "}
          <LegalLink href="/privacy">Privacy Policy</LegalLink> has the rest.
        </p>
      </>
    ),
  },
  {
    heading: "Two layouts",
    body: (
      <>
        <p>
          <b>On a tablet</b>, everything is on one screen and the page does not
          scroll: the timer owns the left half, Todoist the top right, the
          environment chips the bottom right.
        </p>
        <p>
          <b>On a narrow screen</b> — a phone, or half a tablet — the clock takes
          the entire first screenful and everything else stacks underneath it, so
          the page scrolls. The clock is the thing you glance at; it gets the space.
        </p>
      </>
    ),
  },
  {
    heading: "Where everything lives",
    body: (
      <>
        <p>
          The <b>chevron in the top-right corner</b> is the only permanent piece of
          chrome. It opens the drawer holding:
        </p>
        <DataList
          items={[
            { term: "GitHub", detail: "The source code. GLU is open source." },
            { term: "Appearance", detail: "Dark or light, remembered across visits." },
            { term: "Docs", detail: "This page." },
            {
              term: "Settings",
              detail:
                "Todoist (log in or out), Tasks (how many items a section shows), Screen (the two stay-awake switches), and Time comments (what gets posted to Todoist, and when).",
            },
          ]}
        />
        <p>
          Below those, links to the{" "}
          <LegalLink href="/privacy">Privacy Policy</LegalLink> and the{" "}
          <LegalLink href="/terms">Terms of Service</LegalLink>.
        </p>
      </>
    ),
  },
  {
    heading: "Limits, honestly",
    body: (
      <ul>
        <li>
          <b>No sync.</b> Your history lives in one browser on one device. Another
          browser, another device, or a private window is a different, empty GLU.
        </li>
        <li>
          <b>No offline mode.</b> Installed or not, it needs a connection to start.
        </li>
        <li>
          <b>Ninety days.</b> The archive keeps at most that, and clearing site data
          clears all of it. Treat GLU as a way to see today&rsquo;s work, not as a
          system of record — the{" "}
          <LegalLink href="/terms">Terms of Service</LegalLink> say the same thing in
          more formal words.
        </li>
        <li>
          <b>A small server, protected.</b> The Todoist connection runs through a
          rate-limited proxy. Ordinary use will never notice it; hammering it will
          get short, temporary refusals.
        </li>
        <li>
          <b>No undo for &ldquo;New day&rdquo;.</b> That is why it asks first.
        </li>
      </ul>
    ),
  },
  {
    heading: "Privacy and terms",
    body: (
      <p>
        The <LegalLink href="/privacy">Privacy Policy</LegalLink> sets out exactly
        what GLU handles, what stays on your device, and what it writes to Todoist.
        The <LegalLink href="/terms">Terms of Service</LegalLink> cover using the
        hosted app. Both are linked at the end of this page, and from the drawer.
      </p>
    ),
  },
];

/**
 * The manual, in English — the language it is authored in, and the one every
 * translation is made from (ADR 44). No `notice`: the manual describes the app
 * rather than binding anyone, so a translated one is simply the manual.
 */
const content: DocumentContent = { updated, title, intro, sections };

export default content;

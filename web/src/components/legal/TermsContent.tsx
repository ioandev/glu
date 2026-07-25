import { LegalLink, LegalPage, type LegalSection } from "./LegalPage";
import { CONTACT_EMAIL, UPDATED } from "./PrivacyContent";

const sections: LegalSection[] = [
  {
    heading: "1. Who runs GLU",
    body: (
      <p>
        GLU (the &ldquo;Service&rdquo;) is a personal, non-commercial project operated by
        Ioan Biticu (&ldquo;I&rdquo;, &ldquo;me&rdquo;) at <code>ioan.dev/glu</code>. It is
        a tablet-first pomodoro and focus tracker, offered free of charge and built in the
        open. You can reach me at{" "}
        <LegalLink href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</LegalLink>.
      </p>
    ),
  },
  {
    heading: "2. Acceptance",
    body: (
      <p>
        By using GLU you agree to these Terms. If you do not agree, please do not use the
        Service. They apply alongside the{" "}
        <LegalLink href="/privacy">Privacy Policy</LegalLink>, which describes what data is
        handled and where it lives.
      </p>
    ),
  },
  {
    heading: "3. What the Service is",
    body: (
      <>
        <p>
          A timer, a record of the focus sessions you complete, and an optional Todoist
          integration that shows your tasks, lets you complete them, and adds a
          time-tracking comment when you finish a session on a task you focused.
        </p>
        <p>
          It is a personal appliance, not a product with a support desk. Features may
          change, and the Service may be interrupted or discontinued at any time without
          notice.
        </p>
      </>
    ),
  },
  {
    heading: "4. Your data is on your device",
    body: (
      <>
        <p>
          Your session history lives in your browser&rsquo;s local storage — there is no
          account, no server-side copy, and no backup. That is a deliberate design choice,
          and it has a consequence you should read as a term rather than a footnote:
        </p>
        <ul>
          <li>
            Clearing your browser&rsquo;s site data, using private browsing, or switching
            device or browser means the history is gone or absent. It cannot be recovered
            by me or by anyone.
          </li>
          <li>
            The archive keeps at most the last 90 days; older days are dropped
            automatically.
          </li>
        </ul>
        <p>
          <b>Do not rely on GLU as a system of record</b> for billable hours or anything
          else that matters after the fact.
        </p>
      </>
    ),
  },
  {
    heading: "5. Your Todoist account",
    body: (
      <>
        <p>
          If you connect Todoist, GLU acts on your instruction and with your authorisation.
          You are responsible for the account you connect and for reviewing what GLU does
          to it — specifically: completing or un-completing tasks you tap, and posting a
          single time-tracking comment when a focused session ends.
        </p>
        <p>
          Only connect an account you control. You can revoke access at any time from
          Settings → Todoist → Log out, or from Todoist&rsquo;s own account settings.
          Todoist is a separate service governed by{" "}
          <LegalLink href="https://todoist.com/terms">its own terms</LegalLink>; I am not
          responsible for it, its availability, or changes to its API.
        </p>
      </>
    ),
  },
  {
    heading: "6. Acceptable use",
    body: (
      <>
        <p>You agree not to:</p>
        <ul>
          <li>
            flood, scrape, or automate against the Service, or work around the request
            limits it applies — they exist so a small server stays available to everyone
            using it;
          </li>
          <li>
            probe, scan, or attempt to circumvent its security, or attempt to reach data
            belonging to anyone else;
          </li>
          <li>
            connect a Todoist account you do not control, or use the Service to interfere
            with someone else&rsquo;s account;
          </li>
          <li>use the Service for anything unlawful.</li>
        </ul>
        <p>
          Requests over the limit are refused automatically, and abusive traffic may be
          blocked without notice.
        </p>
      </>
    ),
  },
  {
    heading: "7. Availability",
    body: (
      <p>
        GLU runs on modest personal infrastructure. There is no uptime commitment, no
        service level, and no guarantee that a session in progress will survive a restart
        or a deployment — although your timer state is stored locally and normally does.
      </p>
    ),
  },
  {
    heading: "8. Intellectual property and licensing",
    body: (
      <p>
        GLU&rsquo;s source code is published on{" "}
        <LegalLink href="https://github.com/ioandev/glu">GitHub</LegalLink> under the
        Apache License 2.0, and the licences of the third-party components it depends on
        are listed in the repository. Those licence terms govern the <i>code</i>; these
        Terms govern your use of the <i>hosted service</i>. The GLU name, its written
        content, and its design are mine; Todoist&rsquo;s name and logo belong to Doist and
        are used to identify the integration.
      </p>
    ),
  },
  {
    heading: "9. No warranty",
    body: (
      <p>
        The Service is provided &ldquo;as is&rdquo; and &ldquo;as available&rdquo;, without
        warranties of any kind, express or implied, including fitness for a particular
        purpose. I do not warrant that it will be accurate, uninterrupted, timely, or
        error-free — including that a session-end alert will arrive punctually, which
        depends on your browser and operating system.
      </p>
    ),
  },
  {
    heading: "10. Limitation of liability",
    body: (
      <p>
        To the fullest extent permitted by law, I am not liable for any indirect,
        incidental, or consequential loss arising from your use of the Service, nor for
        lost session history, missed alerts, or changes made to your Todoist account
        through the Service. Nothing here excludes liability that cannot lawfully be
        excluded.
      </p>
    ),
  },
  {
    heading: "11. Changes to these Terms",
    body: (
      <p>
        These Terms may change; the &ldquo;Last updated&rdquo; date above reflects the
        current version, and continued use after a change means you accept it.
      </p>
    ),
  },
  {
    heading: "12. Governing law",
    body: (
      <p>
        These Terms are governed by the laws of England and Wales. Nothing here limits
        rights you have under mandatory consumer or data-protection law where you live.
      </p>
    ),
  },
  {
    heading: "13. Contact",
    body: (
      <p>
        Questions about these Terms? Email{" "}
        <LegalLink href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</LegalLink>.
      </p>
    ),
  },
];

export function TermsContent() {
  return (
    <LegalPage
      title="Terms of Service"
      updated={UPDATED}
      intro={
        <>
          These Terms govern your use of GLU, a free personal focus timer. The short
          version: it is a hobby project, provided as-is, your data stays on your device,
          and your Todoist account remains yours. The{" "}
          <LegalLink href="/privacy">Privacy Policy</LegalLink> covers the data side.
        </>
      }
      sections={sections}
    />
  );
}

# ADR 27: Environment in time comments — how you worked

- Status: Implemented (deviations noted)
- Date: 2026-07-25
- Amended: 2026-07-25b — **with nothing toggled, the preview borrows a sample
  instead of repeating the plain sentence** (owner: "it should pretend it has
  at least some, it's not very UX friendly"). This reverses the original
  "with no toggles on, the two previews are identical, and the section says so"
  rule, and the owner is right about why: identical previews are *honest* and
  *useless*. The one moment the switch most needs to explain itself is before
  the user has ever pressed an environment chip — and that was exactly the
  moment it demonstrated nothing. The sample is `music + headphones`, chosen
  because it shows both shapes the grammar has (a sound clause and the
  orthogonal equipment clause); one key would teach half the format. **The
  borrowing is labelled**: the row reads `On · Example` rather than `On · Now`,
  and the dimmed line underneath says which toggles the example is imagining.
  Standing rule this leaves behind: a preview may invent its input, but it may
  never claim invented input is the user's own.

- Deviation (2026-07-25, implementation): outline step 7 said the existing E2E
  body assertion would need updating. It did not — no environment toggle is on
  in those fixtures, so `{taskId, minutes}` is still exactly what the drain
  sends. Two new E2E tests were added instead: one that toggles Music +
  Headphones and asserts the decorated body, and one that turns the setting off
  through the real Settings surface and asserts ADR 14's plain body comes back.
- Deviation (2026-07-25, implementation): the inactive preview was first dimmed
  with `opacity: 0.55`. The a11y gate (ADR 02, `test: "error"`) failed it at
  2.39:1 — `opacity` blends the ink into the surface. Quietness is now carried
  by fill and border only; both sample sentences stay at full contrast.
- Deviation (2026-07-25, implementation): the entry stores the environment only
  when at least one toggle is on, and the drain omits the field when the array
  is empty. "On with nothing toggled" and "off" produce the same sentence, so
  one shape on the wire beats two.

## Context

Owner brief (2026-07-25): the time comment should **say how the user worked**,
based on the environment toggles — with a **toggle in Settings, defaulting to
on**, and **previews in Settings so the user knows** what lands in Todoist.

Today ADR 14 posts exactly `[5m] You spent 5 minutes on this`. GLU already
knows more than that: ADR 02's six environment chips (Music, Podcast, TV,
Silence, Noisy, Headphones) are the app's second-oldest piece of state, and
ADR 05 already snapshots them onto every completed session — where they are
**local-only forever** (the history UI was cancelled 2026-07-24, so nothing
displays them). The comment ledger is the one artifact of GLU that leaves the
browser. Putting the environment in it is the only way that fact ever reaches
a place the user actually reads.

Two prior decisions constrain the shape of this hard, and both are load-bearing:

- **The server composes the comment text; the client sends `{taskId, minutes}`
  and nothing else** (ADR 14). That is a security property, not a style
  choice — it is what keeps a hijacked frontend from writing arbitrary text
  into someone's task manager. This ADR must add vocabulary to the comment
  **without** adding a text channel.
- **The `[Nm]` prefix is a parse contract with two readers** (ADR 14): the
  totals route sums it, and the DELETE guard uses it to decide whether an id
  is one of *our own* comments before issuing a destructive verb. Anything
  that touches the front of the string touches a security check.

**Prerequisites: ADRs 02, 14, 19 Implemented.** ADR 14 owns the comment and
the write verb; ADR 19 owns the Settings section list, whose whole design
premise is that a new setting costs one row plus an amendment. This ADR
amends both.

## Decision

### What the comment says

- **The environment goes in a suffix, after the existing sentence, behind an
  em dash**: `[5m] You spent 5 minutes on this — with music, on headphones`.
  The prefix, the sentence, and the singular/plural rule are **byte-identical**
  to what ADR 14 ships. Every existing comment stays valid, `parseTimeComment`
  keeps matching, the totals route keeps summing and the DELETE guard keeps
  recognising our own comments — because none of them read past the anchor.
- **No toggles on → no suffix.** The comment is exactly ADR 14's sentence. An
  empty environment means the user didn't say, and inventing "in an
  unspecified environment" would be noise in every Todoist client they own.
  Silence is a *chosen* toggle and reads as "in silence"; absence is not
  silence.
- **The vocabulary is a fixed table**, in `ENVIRONMENT_KEYS` order, grouped so
  the sentence reads like English rather than like a struct:

  | Toggle | Renders as |
  | --- | --- |
  | Music | `with music` |
  | Podcast | `with a podcast` |
  | TV | `with the TV on` |
  | Noisy | `with background noise` |
  | Silence | `in silence` |
  | Headphones | `on headphones` |

  The four sound toggles share one `with …` clause and are listed
  (`with a podcast, the TV on and background noise`); Silence is its own
  clause; Headphones is its own clause, because it is orthogonal equipment
  (ADR 02's rule, honoured in the grammar). Clauses join with commas:
  `— with music and the TV on, on headphones`.

### The wire format keeps the write verb narrow

- **`POST /glu/api/todoist/comment` grows one optional field:
  `environment: EnvironmentKey[]`** — an array of **enumerated keys**, never
  prose. The server filters to keys it knows, **dedupes**, and emits them in
  **its own fixed order**, ignoring the caller's. So the set of comments a
  hijacked frontend can produce grows from 40 320 (one per minute value) to
  40 320 × 64, and every one of them is still a sentence this repo wrote. The
  suffix has a hard maximum length by construction; there is no input that
  makes it longer.
- **The server also enforces ADR 02's exclusivity**: if any sound key is
  present, `silence` is dropped. The reducer already guarantees this
  client-side; the server repeating it is what keeps "in silence, with the TV
  on" out of the ledger even when the caller is not our UI.
- **Unknown keys are ignored, never rejected.** A 400 here would strand a
  queued comment in the outbox's permanent-failure path (ADR 14 amendment) and
  lose tracked time over a vocabulary mismatch — the exact thing the outbox
  exists to prevent.

### When the environment is captured

- **At run end, into the outbox entry** (`OutboxEntry.environment`, additive
  and optional) — not at drain time. The outbox retries on a backoff and may
  send hours later, from another room; reading the live toggles at POST time
  would file that room against the run that happened in this one. This is
  ADR 05's completion snapshot applied to the same six booleans, and it is why
  the field rides in the entry rather than being looked up by the sender.
- **The setting is read at the same instant.** Off at run end → the entry
  carries no environment, and turning the setting on later does not decorate a
  comment that already describes a run it wasn't recorded for.
- **Entries persisted before this ADR carry no field and post undecorated** —
  the additive-blob pattern, no version bump (ADR 19).

### The setting, and the previews

- **A new Settings section, "Time comments"** — the third section, after
  Todoist and Screen. Not a row inside the Todoist section: that section is
  about *the account*, and this setting applies whether or not anyone is
  logged in, exactly like Screen. One switch, **"Say how you worked"**,
  **default on**, persisted as `commentEnvironment` in the blob.
- **Two previews, always visible, showing the real sentence both ways** —
  the decorated one and the plain one, composed from the **live environment
  toggles** so the preview is literally what the user's next comment will say.
  The one the current setting selects is marked as active (`Now`) and carries
  the accent border; the other is quieter, **never dimmer** — `opacity` on text
  is a contrast failure waiting to happen (see the deviation). This is the
  brief's "so the user knows": a description would describe the feature, a
  preview shows the artifact.
- **With no toggles on, the decorated preview borrows a sample** (`music +
  headphones`) and labels the row `On · Example`, with a dimmed line naming the
  toggles it is imagining (amendment b — this replaced showing the same
  sentence twice, which was honest and useless). Two rules fall out and are
  recorded: the sample must show **both shapes the grammar has**, so one key is
  not enough; and a preview may invent its input but must **never claim
  invented input is the user's own** — `Example` and `Now` are different
  words on purpose.
- **The preview's phrase table is a second copy, deliberately** — ADR 22
  forbids sharing code between `web/` and `backend/`, and the server must stay
  the only writer. The copy is a *preview of* the contract, not the contract.
  Drift is caught by pinning the **same expected strings as literals in both
  test suites** (the ADR 24 precedent for duplicated-on-purpose constants);
  changing one package's wording fails the other package's tests.

## Options considered

- **Let the client send the composed suffix as text** — one line of work, and
  it hands the write verb the free-text channel ADR 14 spent its design budget
  refusing. Rejected on sight.
- **Put the environment inside the bracket** (`[5m 🎧] …`) — breaks
  `^\[(\d+)m\] ` for every existing comment, silently zeroes every total, and
  turns the DELETE guard's authorship check into a refusal to delete our own
  comments. Rejected; the anchor is untouchable.
- **A second comment describing the environment** — doubles the writes, and
  the totals parser would have to learn to ignore its own sibling. Rejected.
- **Todoist labels or the native duration field** — ADR 14 already settled
  that the comment ledger is the artifact; labels are shared, mutable task
  metadata and would rewrite the user's own taxonomy. Not pursued.
- **Read the setting and the environment at POST time** — simpler code, wrong
  answer: a retried entry describes the room the user is in now. Rejected
  (ADR 05's snapshot reasoning).
- **Reject unknown environment keys with a 400** — strands the entry as a
  permanent failure and loses tracked time. Rejected; ignore instead.
- **Emoji instead of words** (`🎧 🎵`) — unreadable in a notification digest,
  unsearchable in Todoist, and a format the totals parser would eventually be
  asked to understand. Rejected; plain words.
- **Ship the switch with a description and no preview** — the brief asked for
  previews, and a sentence about a sentence is worse than the sentence.
  Rejected.
- **Default off** — the brief says default on, and it is the right default:
  the data already exists, it is the user's own, and it goes to the user's own
  task. Recorded as the owner's call, not a discovery.

## Scope

### In scope

- `composeTimeComment(minutes, environment)` on the proxy: the phrase table,
  the grouping grammar, key filtering/dedupe/ordering, the silence rule.
- `POST …/comment` accepting the optional `environment` array; unchanged
  response shape.
- `OutboxEntry.environment` (additive, optional), snapshotted at run end
  together with the `commentEnvironment` setting; sent by the drain.
- `commentEnvironment: boolean` in the blob (default `true`) + its action.
- The Settings "Time comments" section: one switch + the two previews + the
  no-toggles line; ADR 19's row/token/44 px rules.
- The web-side preview composer, and the pinned-literal tests in both packages
  that keep it in step with the server.
- Tests: backend compose/round-trip/parse-still-anchors, POST validation
  (unknown keys ignored, dedupe, order not caller-controlled, silence rule),
  DELETE guard still recognises a decorated comment; store default + snapshot
  timing (setting off at run end, on at drain → still undecorated); settings
  story with the previews; E2E body assertion updated.
- UI.md, CLAUDE.md index and pencil list, ADR 14 and ADR 19 amendments.

### Out of scope

- **Any other data in the comment** (clock design, session number, task
  priority, time of day) → future amendment here if briefed. The suffix is a
  vocabulary, not an extension point to fill.
- **Per-toggle wording customisation** — the server owns the words; a wording
  setting is a text channel with extra steps.
- **Retro-decorating comments already posted** — GLU's one delete verb is
  aimed at the comment you just made (ADR 14), and this ADR does not widen it.
- **Displaying the environment back in the app** (on the focused card, in the
  totals badge) — the totals route keeps returning `{minutes, counted,
  ignored, clamped}` and learns nothing about environments.
- **The remaining penciled settings sections** (chrome direction · 15, archive
  export · 05, alert volume · 18, takeover threshold · 21) — unchanged, still
  penciled.

## Implementation outline

1. **Backend first, because it owns the contract**: the phrase table,
   `environmentSuffix(keys)` (filter → dedupe → fixed order → silence rule →
   grouped clauses), and `composeTimeComment(minutes, keys)`. **Gotcha:** the
   list conjunction is the fiddly part — one fragment, two joined by "and",
   three-plus with commas and a final "and"; write the table-driven test
   before the function.
2. **The route**: read `environment` defensively (missing, not an array, and
   arrays of junk all mean "no environment"). **Gotcha:** order must come from
   the server's own key list, not from `Array.prototype.sort` on caller input
   and not from iteration order of the request body — otherwise the caller
   still controls the sentence.
3. **Re-verify the two readers** with a decorated comment as the fixture:
   `parseTimeComment` returns the minutes, and the DELETE route still accepts
   it as ours-and-time-shaped. **Gotcha:** this is a security check, not a
   formatting one — assert the upstream delete call count, the way ADR 14's
   tests do.
4. **Store**: `commentEnvironment` (default `true`) + setter; `OutboxEntry`
   grows the optional field. **Gotcha:** the additive-blob pattern means an
   existing `glu:v2` blob has no such key — the default must come from
   `initialPersistedState()` through `migrate`, which it does, so there is no
   version bump and **no migration to write**; add the test that proves it
   rather than the migration that doesn't exist.
5. **Snapshot at run end** in `useTimeComments`' run-end listener: read the
   setting and the live environment there, store the *keys that are on* on the
   entry, and send `entry.environment` from the drain. **Gotcha:** the drain
   must never fall back to reading live state when the field is absent —
   absent means "posted before this ADR, or the user said no", and both mean
   undecorated.
6. **Settings section**: switch + two preview lines composed from live
   toggles. **Gotcha:** Mantine's `<label>` wraps the description, so set
   `aria-label` explicitly (the ADR 19 amendment's own footgun). **Gotcha:**
   the previews are long strings in a narrow modal — they wrap, they do not
   ellipsize, and they must not push the section past the modal at 590 px.
7. **Tests, stories, E2E**: the existing E2E assertion
   `{taskId: "t1", minutes: 4}` becomes an environment-carrying body — update
   it in both places it appears rather than loosening it to a partial match.
8. **Docs in the same session**: ADR 14 amendment (the format grew a suffix;
   the write verb grew an enumerated field), ADR 19 amendment (third section),
   UI.md's overlay description, CLAUDE.md's index and pencil list.

Honest sizing: **half a day.** The grammar is an hour, the route and its tests
are an hour, the store plumbing is an hour, and the previews plus the doc
amendments are the rest. The only place this can go wrong is step 3 — a format
change that quietly weakens a security check is the whole risk of this ADR, and
it costs two fixtures to close.

## Acceptance criteria

- [x] With Music and Headphones on, a qualifying run posts exactly `[5m] You spent 5 minutes on this — with music, on headphones` (stubbed upstream asserts the composed body).
- [x] With no environment toggles on, the comment is byte-identical to what ADR 14 shipped: `[5m] You spent 5 minutes on this`.
- [x] With Podcast, TV and Noisy on: `— with a podcast, the TV on and background noise`; with Silence and Headphones: `— in silence, on headphones`.
- [x] `parseTimeComment` returns the right minutes for every decorated comment the composer can produce, and still returns null for a decorated comment quoted inside a reply.
- [x] The DELETE guard accepts a decorated comment of ours (delete issued) and still refuses one whose `posted_uid` is somebody else's (403, upstream delete never called — asserted by call count).
- [x] `POST …/comment` ignores unknown environment keys, dedupes repeats, emits the server's fixed order regardless of the order sent, and drops `silence` when a sound key is present — none of these return an error.
- [x] `POST …/comment` still refuses caller-supplied `content`, and still rejects `minutes: 0` and `minutes: 40321`.
- [x] The Settings modal shows a third section, "Time comments", with one ≥44 px switch, "Say how you worked", on by default; toggling it writes `commentEnvironment` into the `glu:v2` blob and survives a reload with no version bump.
- [x] The section shows both previews composed from the live environment toggles, the active one marked; flipping a chip changes the decorated preview.
- [x] **(amendment b)** With no chips on, the decorated preview shows the `music + headphones` sample — not a duplicate of the plain sentence — labelled `On · Example` rather than `On · Now`, with a dimmed line naming the imagined toggles. Press a chip and the label goes back to `Now` and the note disappears.
- [x] Turning the setting off and ending a qualifying run posts the undecorated comment; turning it on *after* the run ended but before the entry drains still posts undecorated (snapshot at run end, asserted).
- [x] An outbox entry persisted without the field posts undecorated rather than picking up the live environment.
- [x] The accessible name of the switch is its visible label alone; the section renders in both schemes and all three chrome directions, and does not overflow the modal at 590 px.
- [x] The same expected strings are pinned as literals in `backend/` and `web/` tests, so changing the wording in one package fails the other.
- [x] `npm test` (both packages), `npm run build`, `npm run build-storybook` green; the ADR 09 E2E block is active and green with the updated body assertion.

## Consequences

- **The ledger gets more honest and stays as narrow.** The comment now records
  both facts GLU knows about a run — how long, and how it was spent — and the
  proxy's write surface is still four named verbs with server-composed bodies.
  The blast radius grew by a factor of 64 in *sentences* and by zero in
  *capability*.
- **The comment format now has two authors and one owner.** `web/` can write
  the sentence for a preview; only `backend/` can write it to Todoist. The
  pinned literals are the seam, and any future wording change is a two-package
  change by construction — that is a cost, and it is the price ADR 22 already
  set for not sharing code.
- **ADR 05's environment snapshot stops being write-only data.** The same six
  booleans that no UI displays now reach a surface the user reads, which
  weakens the case for ever building a local history view — recorded, since
  the history UI is cancelled and this is quietly part of why.
- **`[Nm] … — with music` is a public, forgeable string in shared projects**,
  same as the prefix always was; the defenses are unchanged (authorship filter,
  bounds, anchored parse) because the suffix is never parsed by anything.
- **Settings is now a three-section list with its first non-boolean content.**
  The previews are the first thing in that modal that renders app data rather
  than app state — the "richer treatment" UI.md parks as optional now has one
  more row and one real reason to happen.

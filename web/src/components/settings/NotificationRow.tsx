"use client";

import { useState } from "react";
import { Switch, Text } from "@mantine/core";
import { useTranslations } from "next-intl";
import {
  readNotificationPermission,
  useNotificationPermission,
} from "@/hooks/useNotificationPermission";
import { requestAlertPermissionFromSettings } from "@/hooks/useSessionAlerts";
import { useGluStore } from "@/store/gluStore";
import classes from "./settings.module.css";

/**
 * The Alerts section's first row (ADR 41, amended): whether a finish that
 * happens while you are looking elsewhere reaches you.
 *
 * **It is a switch, and both directions are real.** Off is GLU's own
 * `notifyOnSessionEnd`, so turning it off silences notifications whatever the
 * browser has granted — a toggle that could only ever be turned on is not a
 * toggle. On requires the browser's permission, which is the one thing here GLU
 * cannot grant itself: switching on asks for it, and if the answer is no the
 * switch goes back off and says what to do about it. The error is the feature —
 * "blocked" without instructions is where this row was a dead end.
 */
export function NotificationRow() {
  const t = useTranslations("alerts");
  const [permission, refresh] = useNotificationPermission();
  const notifyOnSessionEnd = useGluStore((s) => s.notifyOnSessionEnd);
  const setNotifyOnSessionEnd = useGluStore((s) => s.setNotifyOnSessionEnd);
  const [error, setError] = useState<string | null>(null);

  // What to do about a permission GLU cannot change (ADR 41 amendment): the
  // blocked case is the one the owner hit, and a sentence that does not point
  // at the browser's own settings is a dead end.
  const blockedHelp = t("notifyDenied");
  const dismissedHelp = t("notifyDismissed");

  const unsupported = permission === "unsupported";
  // Both have to be true for a notification to arrive, so both have to be true
  // for the switch to read as on — anything else is a switch that lies.
  const checked = permission === "granted" && notifyOnSessionEnd;

  const turnOn = async () => {
    // Read live rather than trusting the render's snapshot: on an engine
    // without `permissions.query`, a permission the user just changed in their
    // browser's site settings — which is precisely what the blocked message
    // tells them to go and do — is still stale here until the modal remounts.
    const live = readNotificationPermission();
    refresh();
    if (live === "granted") {
      setError(null);
      setNotifyOnSessionEnd(true);
      return;
    }
    if (live === "denied") {
      // Asking again would resolve instantly, show nothing, and look like the
      // switch simply refused to move.
      setError(blockedHelp);
      return;
    }
    // Inside the tap's own turn of the loop: browsers want a user gesture here.
    const answer = await requestAlertPermissionFromSettings();
    refresh();
    if (answer === "granted") {
      setError(null);
      setNotifyOnSessionEnd(true);
      return;
    }
    setError(answer === "denied" ? blockedHelp : dismissedHelp);
  };

  const onChange = (next: boolean) => {
    if (!next) {
      setError(null);
      setNotifyOnSessionEnd(false);
      return;
    }
    void turnOn();
  };

  // A granted permission answers every error this row can raise, however it
  // arrived — including from the browser's own settings, which is where the
  // blocked message sends people.
  const message = unsupported ? t("notifyUnsupported") : permission === "granted" ? null : error;

  return (
    <div className={classes.field} data-testid="setting-notifications">
      <Switch
        className={classes.switch}
        size="md"
        label={t("notifyLabel")}
        description={t("notifyDescription")}
        /* Mantine's `<label>` wraps the description too, so without this the
           accessible name swallows it (the ADR 19 rule). */
        aria-label={t("notifyLabel")}
        aria-describedby={message ? "alert-notifications-message" : undefined}
        checked={checked}
        disabled={unsupported}
        onChange={(event) => onChange(event.currentTarget.checked)}
        data-testid="setting-notify-on-end"
      />

      {/* `alert`, not `status`: this only ever appears in answer to a tap that
          did not do what the user asked for. */}
      {message && (
        <Text
          component="span"
          id="alert-notifications-message"
          className={error ? classes.fieldError : classes.fieldDescription}
          role={error ? "alert" : undefined}
          data-testid="notifications-message"
        >
          {message}
        </Text>
      )}
    </div>
  );
}

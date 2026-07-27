"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useMediaQuery } from "@mantine/hooks";
import {
  ActionIcon,
  Anchor,
  Drawer,
  Group,
  Modal,
  Stack,
  Text,
  UnstyledButton,
} from "@mantine/core";
import {
  IconBook,
  IconBrandGithub,
  IconChevronLeft,
  IconExternalLink,
  IconMoon,
  IconSettings,
  IconSun,
} from "@tabler/icons-react";
import { useTranslations } from "next-intl";
import { SettingsContent } from "@/components/settings/SettingsContent";
import { useResolvedScheme } from "@/hooks/useResolvedScheme";
import classes from "./headerDrawer.module.css";

export const GITHUB_URL = "https://github.com/ioandev/glu";

/**
 * ADR 29: the manual is the largest block of copy in the app and the least
 * often opened, so it rides its own chunk rather than the timer's first paint.
 * `ssr: false` because the only thing that renders it is a modal that cannot be
 * open on first render anyway.
 */
/**
 * Its own component because `loading` is evaluated at module scope, where
 * `useTranslations` cannot be called — the hook has to run inside something
 * React renders (ADR 44).
 */
function DocsLoading() {
  const t = useTranslations("chrome");
  return (
    <Text size="sm" c="dimmed">
      {t("loading")}
    </Text>
  );
}

const DocsModalBody = dynamic(() => import("@/components/docs/DocsModalBody"), {
  ssr: false,
  loading: () => <DocsLoading />,
});

/**
 * The app's only permanently visible chrome: a corner chevron that slides a
 * panel in from the right (ADR 10).
 *
 * A `Drawer` overlays through a portal, so it consumes zero layout height and
 * the `100dvh` no-scroll contract is untouched — and it brings focus trap,
 * Escape and overlay-dismiss with it. Open state is **ephemeral React state**:
 * "hidden by default" means every load, and the `glu:v2` blob stays free of UI
 * chrome state.
 */
export function HeaderDrawer() {
  const t = useTranslations("chrome");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [docsOpen, setDocsOpen] = useState(false);
  const { isDark, mounted, setColorScheme } = useResolvedScheme();
  // Full-screen below `sm`, the ADR 13 responsive precedent.
  const fullScreenModal = useMediaQuery("(max-width: 48em)") ?? false;

  return (
    <>
      <ActionIcon
        className={classes.arrow}
        variant="subtle"
        size={44}
        aria-label={t("openHeader")}
        aria-expanded={drawerOpen}
        onClick={() => setDrawerOpen(true)}
      >
        <IconChevronLeft size={22} />
      </ActionIcon>

      <Drawer
        opened={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        position="right"
        size={320}
        title={t("drawerTitle")}
        classNames={{ content: classes.panel, header: classes.panelHeader }}
        closeButtonProps={{ "aria-label": t("closeHeader") }}
        transitionProps={{ duration: 0 }}
      >
        <Stack gap="xs">
          <Anchor
            className={classes.row}
            href={GITHUB_URL}
            target="_blank"
            // Without this, a new tab can reach back through `window.opener` —
            // tab-nabbing, even on a personal app.
            rel="noopener noreferrer"
            underline="never"
          >
            <IconBrandGithub size={20} />
            <span className={classes.rowLabel}>{t("github")}</span>
            <IconExternalLink size={16} className={classes.rowTrailing} />
          </Anchor>

          <UnstyledButton
            className={classes.row}
            onClick={() => setColorScheme(isDark ? "light" : "dark")}
            aria-label={
              mounted
                ? isDark
                  ? t("switchToLight")
                  : t("switchToDark")
                : t("toggleScheme")
            }
          >
            {mounted && isDark ? <IconSun size={20} /> : <IconMoon size={20} />}
            <span className={classes.rowLabel}>{t("appearance")}</span>
            <Text component="span" className={classes.rowTrailing} size="sm">
              {mounted ? (isDark ? t("dark") : t("light")) : ""}
            </Text>
          </UnstyledButton>

          {/* ADR 29: a modal, not a link to `/glu/docs`. Documentation is looked
              up mid-session, and leaving the tab tears down the wake lock, the
              primed AudioContext and the notification gesture — while a same-tab
              navigation would also hide a running timer. Read, then adjust: it
              sits above Settings. */}
          <UnstyledButton className={classes.row} onClick={() => setDocsOpen(true)}>
            <IconBook size={20} />
            <span className={classes.rowLabel}>{t("docs")}</span>
            <span className={classes.rowTrailing}>›</span>
          </UnstyledButton>

          <UnstyledButton className={classes.row} onClick={() => setSettingsOpen(true)}>
            <IconSettings size={20} />
            <span className={classes.rowLabel}>{t("settings")}</span>
            <span className={classes.rowTrailing}>›</span>
          </UnstyledButton>
        </Stack>

        {/* References, not actions — so a footer nav rather than two more rows
            (ADR 26; ADR 10's "exactly three entries" amended). New tab because
            leaving the app tears down the wake lock, the primed AudioContext
            and the notification gesture; `next/link` because a hand-written
            `/privacy` would land on the *sibling site's* policy. */}
        <nav className={classes.legal} aria-label={t("legalAriaLabel")}>
          <Anchor
            component={Link}
            href="/privacy"
            className={classes.legalLink}
            target="_blank"
            rel="noopener noreferrer"
            underline="never"
          >
            {t("privacy")}
          </Anchor>
          <Anchor
            component={Link}
            href="/terms"
            className={classes.legalLink}
            target="_blank"
            rel="noopener noreferrer"
            underline="never"
          >
            {t("terms")}
          </Anchor>
        </nav>
      </Drawer>

      {/* Settings' twin, deliberately: two overlay treatments for two rows in
          one drawer would be a design defect (ADR 29). The body is mounted only
          while open, or the dynamic chunk would load on first render and the
          split would buy nothing. */}
      <Modal
        opened={docsOpen}
        onClose={() => setDocsOpen(false)}
        title={t("docsTitle")}
        size="90%"
        fullScreen={fullScreenModal}
        classNames={{ content: classes.panel, header: classes.panelHeader }}
        closeButtonProps={{ "aria-label": t("closeDocs") }}
        transitionProps={{ duration: 0 }}
      >
        {docsOpen && <DocsModalBody />}
      </Modal>

      <Modal
        opened={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        title={t("settingsTitle")}
        // Large by design (ADR 19): the four penciled settings each arrive as
        // one more section row, not a layout renegotiation.
        size="90%"
        fullScreen={fullScreenModal}
        classNames={{ content: classes.panel, header: classes.panelHeader }}
        closeButtonProps={{ "aria-label": t("closeSettings") }}
        transitionProps={{ duration: 0 }}
      >
        <SettingsContent />
      </Modal>
    </>
  );
}

/** Kept for stories that need the row treatment without the drawer. */
export function DrawerRowGroup({ children }: { children: React.ReactNode }) {
  return <Group gap="xs">{children}</Group>;
}

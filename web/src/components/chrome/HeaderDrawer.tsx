"use client";

import { useState } from "react";
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
  IconBrandGithub,
  IconChevronLeft,
  IconExternalLink,
  IconMoon,
  IconSettings,
  IconSun,
} from "@tabler/icons-react";
import { SettingsContent } from "@/components/settings/SettingsContent";
import { useResolvedScheme } from "@/hooks/useResolvedScheme";
import classes from "./headerDrawer.module.css";

export const GITHUB_URL = "https://github.com/ioandev/glu";

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
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const { isDark, mounted, setColorScheme } = useResolvedScheme();
  // Full-screen below `sm`, the ADR 13 responsive precedent.
  const fullScreenModal = useMediaQuery("(max-width: 48em)") ?? false;

  return (
    <>
      <ActionIcon
        className={classes.arrow}
        variant="subtle"
        size={44}
        aria-label="Open header"
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
        title="GLU"
        classNames={{ content: classes.panel, header: classes.panelHeader }}
        closeButtonProps={{ "aria-label": "Close header" }}
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
            <span className={classes.rowLabel}>GitHub</span>
            <IconExternalLink size={16} className={classes.rowTrailing} />
          </Anchor>

          <UnstyledButton
            className={classes.row}
            onClick={() => setColorScheme(isDark ? "light" : "dark")}
            aria-label={
              mounted
                ? isDark
                  ? "Switch to light theme"
                  : "Switch to dark theme"
                : "Toggle colour scheme"
            }
          >
            {mounted && isDark ? <IconSun size={20} /> : <IconMoon size={20} />}
            <span className={classes.rowLabel}>Appearance</span>
            <Text component="span" className={classes.rowTrailing} size="sm">
              {mounted ? (isDark ? "Dark" : "Light") : ""}
            </Text>
          </UnstyledButton>

          <UnstyledButton className={classes.row} onClick={() => setSettingsOpen(true)}>
            <IconSettings size={20} />
            <span className={classes.rowLabel}>Settings</span>
            <span className={classes.rowTrailing}>›</span>
          </UnstyledButton>
        </Stack>
      </Drawer>

      <Modal
        opened={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        title="Settings"
        // Large by design (ADR 19): the four penciled settings each arrive as
        // one more section row, not a layout renegotiation.
        size="90%"
        fullScreen={fullScreenModal}
        classNames={{ content: classes.panel, header: classes.panelHeader }}
        closeButtonProps={{ "aria-label": "Close settings" }}
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

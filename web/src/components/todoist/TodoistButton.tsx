"use client";

import { Popover, Skeleton, UnstyledButton } from "@mantine/core";
import { useTranslations } from "next-intl";
import { useTodoistAuth } from "@/store/todoistAuth";
import { TodoistLogin } from "./TodoistLogin";
import { TodoistMark } from "./TodoistMark";
import classes from "./todoist.module.css";

/**
 * The reserved top-right area's first tenant (ADR 11).
 *
 * Logged out it is a single Todoist-branded button; logged in, a compact
 * account chip whose menu offers Log out. The slot keeps a fixed height so the
 * region never shifts as `/status` resolves.
 */
export function TodoistButton() {
  const status = useTodoistAuth((s) => s.status);
  const name = useTodoistAuth((s) => s.name);
  const logout = useTodoistAuth((s) => s.logout);
  const t = useTranslations("todoist");

  if (status === "unknown") {
    return (
      <div className={classes.slot} data-testid="todoist-loading">
        <Skeleton height={44} width={168} radius="var(--glu-control-radius)" />
      </div>
    );
  }

  if (status === "out") {
    return (
      <div className={classes.slot}>
        <TodoistLogin />
      </div>
    );
  }

  const label = name ?? t("accountFallback");
  return (
    <div className={classes.slot}>
      {/* A Popover rather than a Mantine `Menu`: the Menu's focus-trap anchor
          renders a `role="presentation"` div as a direct child of
          `role="menu"`, which trips axe's aria-required-children rule. With a
          single action, a labelled popover holding one button is both simpler
          and correct (ADR 11 deviation). */}
      <Popover
        position="bottom-start"
        withinPortal={false}
        transitionProps={{ duration: 0 }}
        shadow="md"
      >
        <Popover.Target>
          <button
            type="button"
            className={classes.chip}
            aria-label={t("accountAriaLabel", { label })}
          >
            {/* The mark rather than an initial: a 12px letter on brand red is
                below the contrast gate, and the logo says "Todoist" better. */}
            <span className={classes.avatar} aria-hidden="true">
              <TodoistMark size={22} />
            </span>
            {label}
          </button>
        </Popover.Target>
        <Popover.Dropdown className={classes.accountMenu}>
          <UnstyledButton className={classes.menuItem} onClick={() => void logout()}>
            {t("logOut")}
          </UnstyledButton>
        </Popover.Dropdown>
      </Popover>
    </div>
  );
}

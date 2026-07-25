import { test } from "./fixtures";

/**
 * The console tripwire, proving itself. This test deliberately provokes a
 * `console.error` and is marked expected-to-fail: if the fixture ever stopped
 * failing tests on console errors, this would start *passing* and Playwright
 * would report it as an unexpected pass (ADR 09).
 */
test.describe("the console tripwire", () => {
  test.fail();

  test("fails a test that logs a console error", async ({ page, open, consoleErrors }) => {
    void consoleErrors;
    await open();
    await page.evaluate(() => console.error("deliberate tripwire probe"));
    // Nothing else to assert — the fixture's teardown is the assertion.
  });
});

import { expect, test, type Page } from "@playwright/test";
import { WHATS_NEW } from "../src/lib/whatsNew";

// Sign up in local mode (no Supabase in CI), then walk the main screens:
// each must render without a crash and without anything wider than the phone.

async function signUp(page: Page) {
  await page.goto("/auth");
  // Skip the first-run tour and the "Yang baru" sheet: both cover the page.
  await page.evaluate((id) => {
    localStorage.setItem("bareng:onboarded:v1", "1");
    localStorage.setItem("twogether:whats-new", id);
  }, WHATS_NEW.id);
  await page.getByText("Daftar", { exact: true }).first().click();
  await page.fill('input[placeholder="nama@gmail.com"]', `e2e${Date.now()}@x.id`);
  await page.fill('input[placeholder="Min. 6 karakter"]', "secret123");
  await page.fill('input[placeholder="Nama lengkap"]', "Uji Coba");
  await page.click('button[type="submit"]');
  await page.waitForURL(/\/home/);
}

async function overflowing(page: Page) {
  return page.evaluate(() => {
    const w = document.documentElement.clientWidth;
    return [...document.querySelectorAll("main *, header *")]
      .filter((el) => {
        const r = el.getBoundingClientRect();
        if (!r.width || r.right <= w + 1) return false;
        // Sideways scrollers (chips, tabs) may run past the edge on purpose.
        for (let p = el.parentElement; p; p = p.parentElement) {
          const o = getComputedStyle(p).overflowX;
          if (o === "auto" || o === "scroll" || o === "hidden") return false;
        }
        return true;
      })
      .slice(0, 3)
      .map((el) => `${el.tagName.toLowerCase()}.${String(el.className).slice(0, 60)}`);
  });
}

const ROUTES = ["/home", "/tracker", "/kita", "/fitur", "/moments", "/catatan", "/calendar", "/shalat", "/jadwal", "/settings"];

test("main screens open without errors or overflow", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await signUp(page);
  for (const r of ROUTES) {
    await page.goto(r);
    await expect(page.locator("header h1").first()).toBeVisible();
    expect(await overflowing(page), `${r} wider than the screen`).toEqual([]);
  }
  expect(errors).toEqual([]);
});

test("pull-to-refresh does not fire mid-page in the installed app", async ({ page, context }) => {
  await signUp(page);
  // Scroll like the installed PWA (html.is-native: body > div scrolls).
  await page.waitForTimeout(2500); // let Beranda finish loading its cards
  const scrolled = await page.evaluate(() => {
    document.documentElement.classList.add("is-native");
    const shell = [...document.body.children].find(
      (el): el is HTMLElement => el instanceof HTMLDivElement && !el.hidden && el.scrollHeight > el.clientHeight,
    );
    if (!shell) return 0;
    shell.scrollTop = 600;
    return shell.scrollTop;
  });
  expect(scrolled).toBeGreaterThan(0);
  const cdp = await context.newCDPSession(page);
  const touch = (type: "touchStart" | "touchMove" | "touchEnd", y: number) =>
    cdp.send("Input.dispatchTouchEvent", { type, touchPoints: type === "touchEnd" ? [] : [{ x: 200, y }] });
  await touch("touchStart", 300);
  for (let i = 1; i <= 12; i++) {
    await touch("touchMove", 300 + i * 25);
    await page.waitForTimeout(16);
  }
  // Pulling slides the whole page down (up to 120px); mid-page it must not.
  const pulled = await page.evaluate(() =>
    [...document.querySelectorAll<HTMLElement>(".relative > div")]
      .map((d) => new DOMMatrix(getComputedStyle(d).transform).f)
      .filter((y) => y > 10),
  );
  await touch("touchEnd", 0);
  expect(pulled).toEqual([]);
});

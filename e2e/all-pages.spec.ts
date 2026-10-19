import { expect, test, type Page } from "@playwright/test";
import { WHATS_NEW } from "../src/lib/whatsNew";

// Every page, on a small (iPhone SE 1st gen, 320px) and a normal (375px)
// screen, in dark and light: no crash, no console error, nothing wider than
// the screen, and each "add" sheet opens without overflowing either.

const ROUTES = [
  "/home", "/tracker", "/kita", "/fitur", "/settings",
  "/aset", "/belajar", "/belanja", "/calendar", "/catatan", "/digest", "/dompet", "/fokus", "/goals",
  "/grafik", "/habits", "/hijriah", "/impor", "/insights", "/jadwal", "/kabar", "/laporan", "/list",
  "/moments", "/moments/tempat", "/nikah", "/patungan", "/pencapaian", "/privasi", "/ramadhan",
  "/reflection", "/rumah", "/sehat", "/shalat", "/siklus", "/skripsi", "/tagihan", "/tantangan",
  "/target", "/tilawah", "/travel", "/uang", "/wrapped", "/zakat",
  "/settings/dashboard", "/settings/finance", "/settings/pengingat", "/settings/privacy",
  "/settings/profile", "/settings/security", "/settings/theme", "/settings/trash", "/settings/workspace",
];

// Network to a backend that CI doesn't have is expected; anything else is a bug.
const IGNORED = [/Failed to load resource/i, /net::ERR_/i, /favicon/i, /Download the React DevTools/i];

async function signUp(page: Page) {
  await page.goto("/auth");
  await page.evaluate((id) => {
    localStorage.setItem("bareng:onboarded:v1", "1");
    localStorage.setItem("twogether:whats-new", id);
  }, WHATS_NEW.id);
  await page.getByText("Daftar", { exact: true }).first().click();
  await page.fill('input[placeholder="nama@gmail.com"]', `all${Date.now()}@x.id`);
  await page.fill('input[placeholder="Min. 6 karakter"]', "secret123");
  await page.fill('input[placeholder="Nama lengkap"]', "Ridwan Alamsyah");
  await page.click('button[type="submit"]');
  await page.waitForURL(/\/home/);
}

/** Elements sticking out past the right edge (ignoring sideways scrollers). */
function overflowing(page: Page, scope: string) {
  return page.evaluate((scope) => {
    const w = document.documentElement.clientWidth;
    return [...document.querySelectorAll(`${scope} *`)]
      .filter((el) => {
        const r = el.getBoundingClientRect();
        if (!r.width || !r.height || r.right <= w + 1) return false;
        if (getComputedStyle(el).position === "fixed") return false;
        for (let p = el.parentElement; p; p = p.parentElement) {
          const o = getComputedStyle(p).overflowX;
          if (o === "auto" || o === "scroll" || o === "hidden" || o === "clip") return false;
        }
        return true;
      })
      .slice(0, 3)
      .map((el) => `<${el.tagName.toLowerCase()} class="${String(el.className).slice(0, 50)}"> "${(el.textContent ?? "").trim().slice(0, 30)}"`);
  }, scope);
}

for (const [width, scheme] of [
  [375, "dark"],
  [320, "light"],
] as const) {
  test(`all pages at ${width}px ${scheme}`, async ({ browser }) => {
    test.setTimeout(240_000);
    const ctx = await browser.newContext({
      viewport: { width, height: 740 },
      isMobile: true,
      hasTouch: true,
      colorScheme: scheme,
      timezoneId: "Asia/Jakarta",
      locale: "id-ID",
    });
    const page = await ctx.newPage();
    const problems: string[] = [];
    let current = "";
    page.on("pageerror", (e) => problems.push(`${current}: crash: ${e.message}`));
    page.on("console", (m) => {
      if (m.type() === "error" && !IGNORED.some((r) => r.test(m.text()))) problems.push(`${current}: console: ${m.text().slice(0, 200)}`);
    });
    await signUp(page);

    for (const r of ROUTES) {
      current = r;
      await page.goto(r);
      await expect(page.locator("h1").first(), `${r} has a title`).toBeVisible();
      await page.waitForTimeout(300);
      for (const o of await overflowing(page, "body")) problems.push(`${r}: wider than screen: ${o}`);

      // Open the page's main "add" button, if it has one, and check the sheet.
      const add = page
        .locator("header button:not([disabled]):not([type=submit]), main button:not([disabled]):not([type=submit])")
        .filter({ hasText: /^\s*(\+|Tambah|Tulis|Catat|Baru|Isi|Buat)/ })
        .first();
      if (await add.isVisible().catch(() => false)) {
        await add.click({ timeout: 3000 });
        const sheet = page.locator("[role=dialog]").last();
        if (await sheet.isVisible({ timeout: 1500 }).catch(() => false)) {
          await page.waitForTimeout(350);
          for (const o of await overflowing(page, "[role=dialog]")) problems.push(`${r} (sheet): wider than screen: ${o}`);
          await page.keyboard.press("Escape");
          await expect(sheet).toBeHidden();
        }
      }
    }
    await ctx.close();
    expect(problems, problems.join("\n")).toEqual([]);
  });
}

test("tabs, back button and edge cases of navigation", async ({ page }) => {
  await signUp(page);
  const nav = page.locator("nav").last();
  for (const [label, url] of [
    ["Uang", /\/tracker/],
    ["Kita", /\/kita/],
    ["Jelajah", /\/fitur/],
    ["Beranda", /\/home/],
  ] as const) {
    await nav.getByText(label, { exact: true }).click();
    await page.waitForURL(url);
    // Exactly one tab is marked as the current page.
    await expect(nav.locator('[aria-current="page"]')).toHaveCount(1);
  }
  // Sub-page → back button returns to where we came from.
  await page.goto("/fitur");
  await page.goto("/shalat");
  await page.getByRole("button", { name: "Kembali" }).click();
  await page.waitForURL(/\/fitur/);
  // Opened directly (no history): back still lands somewhere sensible.
  await page.goto("/zakat");
  await page.evaluate(() => sessionStorage.clear());
  await page.reload();
  await page.getByRole("button", { name: "Kembali" }).click();
  await expect(page).not.toHaveURL(/\/zakat/);
});

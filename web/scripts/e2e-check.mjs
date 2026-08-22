import { chromium } from "playwright";

const BASE = "http://localhost:3100";
const shots = "/tmp/claude-0/-home-user-senecai-governance-hub/6daf80fe-d29b-518b-ab73-774746ff08d1/scratchpad";

const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });
const page = await browser.newPage();
page.on("console", (msg) => console.log("[console]", msg.type(), msg.text()));
page.on("pageerror", (err) => console.log("[pageerror]", err.message));
page.on("requestfailed", (req) => console.log("[requestfailed]", req.url(), req.failure()?.errorText));

async function shot(name) {
  await page.screenshot({ path: `${shots}/${name}.png`, fullPage: true });
}

process.on("unhandledRejection", async (err) => {
  console.error("UNHANDLED:", err);
  await shot("zz-failure");
  await browser.close();
  process.exit(1);
});

// 1. Login as consultant
await page.goto(`${BASE}/login`);
await page.fill("#email", "consultant@senecai.dev");
await page.fill("#password", "changeme123");
await page.click('button[type="submit"]');
await page.waitForURL((url) => url.pathname === "/inventory");
await shot("01-inventory-empty");

// 2. Create a new AI system for Demo Client SRL
await page.click('a[href="/inventory/new"]');
await page.waitForURL((url) => url.pathname === "/inventory/new");
await page.fill("#name", "Resume Screening Assistant");
await page.fill("#description", "Ranks incoming CVs against a job description using an LLM.");
await page.selectOption("#useCaseType", "INTERNAL_OPS");
await page.fill("#businessProcess", "Recruitment screening");
await shot("02-new-system-form");
await page.click('button[type="submit"]');
await page.waitForURL(
  (url) => /\/inventory\/[a-z0-9]+$/.test(url.pathname) && !url.pathname.endsWith("/new"),
);
await shot("03-system-detail");
console.log("System URL:", page.url());

// 3. Run role classification -> tick provider-integration signal only
const classifyButtons = page.locator('button:has-text("classification")');
await classifyButtons.nth(0).click();
await page.waitForSelector("text=Tick every statement");
const roleCheckboxes = page.locator('input[type="checkbox"]');
await roleCheckboxes.nth(5).check(); // provider-integration is the 6th option
await shot("04-role-wizard");
await page.getByRole("button", { name: "Continue" }).click();
await page.waitForSelector("text=Preliminary result");
await shot("05-role-result");
await page.getByRole("button", { name: "Close" }).click();

// 4. Run risk classification -> Annex I (medical devices) -> HIGH_RISK
await classifyButtons.nth(1).click();
await page.waitForSelector("text=Step 0");
await page.getByRole("button", { name: "Continue" }).click(); // no exclusions ticked
await page.waitForSelector("text=Step 1");
await page.locator('input[type="checkbox"]').nth(0).check(); // medical-devices
await page.getByRole("button", { name: "Continue" }).click();
await page.waitForSelector("text=Preliminary result");
await shot("06-risk-result");

await page.reload();
await page.waitForLoadState("networkidle");
await shot("07-system-detail-after-classification");

// 5. Mark both reviewed (consultant can) — re-query each time since
// router.refresh() re-renders the panels and invalidates old handles.
for (let i = 0; i < 2; i++) {
  const btn = page.getByText("Mark reviewed by consultant").first();
  if (await btn.count()) {
    await btn.click();
    await page.waitForTimeout(900);
  }
}
await shot("08-system-detail-reviewed");

// 6. Back to inventory list
await page.goto(`${BASE}/inventory`);
await shot("09-inventory-list-with-system");

await browser.close();
console.log("Done.");

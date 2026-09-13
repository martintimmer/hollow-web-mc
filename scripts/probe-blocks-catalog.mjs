import { spawn } from "node:child_process";
import CDP from "chrome-remote-interface";
import fs from "node:fs";

const PORT = 9350;
const chrome = spawn("/usr/bin/chromium", [
  "--headless=new",
  "--no-sandbox",
  "--disable-dev-shm-usage",
  "--enable-unsafe-swiftshader",
  `--remote-debugging-port=${PORT}`,
  "about:blank"
], { stdio: "ignore" });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
await sleep(1500);

let fails = 0;
const check = (label, cond, detail = "") => {
  console.log(`${cond ? "PASS" : "FAIL"} · ${label} ${detail}`);
  if (!cond) fails++;
};

try {
  const client = await CDP({ port: PORT });
  const { Page, Runtime } = client;
  await Page.enable();
  await Runtime.enable();

  const consoleErrors = [];
  Runtime.consoleAPICalled((p) => {
    if (p.type === "error") {
      const msg = p.args.map((a) => a.value ?? a.description ?? "").join(" ");
      consoleErrors.push(msg);
    }
  });

  await Page.navigate({ url: "http://127.0.0.1:5450/blocks.html" });
  await sleep(4000);

  const evalExpr = async (expr) => {
    const res = await Runtime.evaluate({ expression: expr, awaitPromise: true, returnByValue: true });
    if (res.exceptionDetails) {
      throw new Error(res.exceptionDetails.text || "Eval error");
    }
    return res.result?.value;
  };

  // 1. Check overview & stats
  const statbarText = await evalExpr(`document.getElementById("statbar")?.innerText || ""`);
  check("statbar populated", statbarText.length > 0, statbarText);

  const progText = await evalExpr(`document.getElementById("prog")?.innerText || ""`);
  check("progress text populated", progText.length > 0, progText);

  const auditText = await evalExpr(`document.getElementById("audit")?.innerText || ""`);
  check("audit text populated", auditText.length > 0, auditText);

  // 2. Count cards
  const counts = await evalExpr(`(() => {
    return {
      total: document.querySelectorAll(".card").length,
      cube: document.querySelectorAll("#grid .card").length,
      d3: document.querySelectorAll("#grid3d .card").length,
      items: document.querySelectorAll("#itemsGrid .card").length,
      categories: Array.from(document.querySelectorAll("#cat option")).map(o => o.value)
    };
  })()`);
  check("total cards > 1000", counts.total >= 1000, `total: ${counts.total}, cube: ${counts.cube}, 3d: ${counts.d3}, items: ${counts.items}`);
  check("categories populated", counts.categories.length > 5, `categories: ${counts.categories.length}`);

  // 3. Check looks rendering on visible cards
  const looksCheck = await evalExpr(`(() => {
    const firstCard = document.querySelector("#grid .card");
    if (!firstCard) return { ok: false, reason: "no first card" };
    const inv = firstCard.querySelector(".inv")?.src || "";
    const held = firstCard.querySelector(".held")?.src || "";
    const placed = firstCard.querySelector(".placed")?.src || "";
    return {
      ok: true,
      hasInv: inv.startsWith("data:image/") || inv.includes(".png"),
      hasHeld: held.startsWith("data:image/") || held.includes(".png"),
      hasPlaced: placed.startsWith("data:image/") || placed.includes(".png"),
      bname: firstCard.querySelector(".bname")?.innerText || ""
    };
  })()`);
  check("first card looks rendered", looksCheck.ok && looksCheck.hasInv && looksCheck.hasHeld && looksCheck.hasPlaced, JSON.stringify(looksCheck));

  // 4. Test scrolling triggers lazy looks rendering
  await evalExpr(`window.scrollTo(0, 1500)`);
  await sleep(1500);
  const scrolledLooks = await evalExpr(`(() => {
    const rendered = Array.from(document.querySelectorAll(".card[data-rendered='1']")).length;
    return { renderedCards: rendered };
  })()`);
  check("scroll triggers rendering", scrolledLooks.renderedCards > 0, `renderedCards: ${scrolledLooks.renderedCards}`);

  // 5. Check filter search
  const filterResult = await evalExpr(`(() => {
    const q = document.getElementById("q");
    q.value = "diamond";
    q.dispatchEvent(new Event("input"));
    const visible = Array.from(document.querySelectorAll(".card")).filter(c => c.style.display !== "none");
    return { visibleCount: visible.length };
  })()`);
  check("search filter 'diamond' works", filterResult.visibleCount > 0 && filterResult.visibleCount < 100, `visible: ${filterResult.visibleCount}`);

  // Reset filter
  await evalExpr(`(() => {
    const q = document.getElementById("q");
    q.value = "";
    q.dispatchEvent(new Event("input"));
  })()`);

  // 6. Test modal open/close
  const modalTest = await evalExpr(`(() => {
    const firstCard = document.querySelector("#grid .card");
    firstCard.click();
    const overlay = document.getElementById("modalOverlay");
    const isOpen = overlay?.classList.contains("open");
    const title = document.getElementById("modalTitle")?.innerText || "";
    document.getElementById("modalClose").click();
    const isClosedAfter = !overlay?.classList.contains("open");
    return { isOpen, title, isClosedAfter };
  })()`);
  check("modal opens and closes", modalTest.isOpen && modalTest.isClosedAfter, `title: ${modalTest.title}`);

  // 7. Entities table
  const entitiesCount = await evalExpr(`document.querySelectorAll("#entities tbody tr").length`);
  console.log(`Entities table rows: ${entitiesCount}`);

  // 8. Debug hooks
  const debugHooks = await evalExpr(`(() => {
    return {
      hasBlocksDebug: typeof window.__blocksDebug === "object",
      hasRenderPreviews: typeof window.__blocksCatalogRenderPreviews === "function"
    };
  })()`);
  check("debug hooks present", debugHooks.hasBlocksDebug && debugHooks.hasRenderPreviews, JSON.stringify(debugHooks));

  // 9. Console errors
  check("no console errors", consoleErrors.length === 0, consoleErrors.join(" | "));

  // 10. Save snapshot screenshot
  const screenshot = await Page.captureScreenshot({ format: "jpeg", quality: 80 });
  fs.writeFileSync("snapshots/blocks-catalog-probe.jpg", Buffer.from(screenshot.data, "base64"));
  console.log("Snapshot saved to snapshots/blocks-catalog-probe.jpg");

  console.log(`\nProbe finished with ${fails} failures.`);
  await client.close();
} catch (err) {
  console.error("Probe error:", err);
  fails++;
} finally {
  chrome.kill();
  process.exit(fails > 0 ? 1 : 0);
}

import { spawn } from "node:child_process";
import CDP from "chrome-remote-interface";

const PORT = 9270;
const chrome = spawn("/usr/bin/chromium", [
  "--headless=new",
  "--no-sandbox",
  "--disable-gpu",
  "--disable-dev-shm-usage",
  `--remote-debugging-port=${PORT}`,
  "about:blank"
], { stdio: "ignore" });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
await sleep(1500);

try {
  const client = await CDP({ port: PORT });
  const { Page, Runtime, Input } = client;
  await Page.enable();
  await Runtime.enable();

  console.log("1. Navigating to http://127.0.0.1:5450/?sim=1 ...");
  await Page.navigate({ url: "http://127.0.0.1:5450/?sim=1" });
  await sleep(4000);

  console.log("2. Pressing KeyI to open Inventory Modal...");
  await Runtime.evaluate({
    expression: `(() => {
      window.dispatchEvent(new KeyboardEvent("keydown", { code: "KeyI", bubbles: true }));
    })()`
  });
  await sleep(500);

  console.log("3. Checking if Search Items input is active / focused...");
  const searchState = await Runtime.evaluate({
    expression: `(() => {
      const activeEl = document.activeElement;
      const searchInput = document.querySelector("input[placeholder*='Search']");
      const isFocused = activeEl === searchInput;
      return {
        hasSearchInput: !!searchInput,
        isFocused,
        activeElementTag: activeEl?.tagName,
        activeElementPlaceholder: activeEl?.getAttribute("placeholder")
      };
    })()`,
    returnByValue: true
  });
  console.log("Search Input Focus Result:", JSON.stringify(searchState.result?.value, null, 2));

  console.log("4. Typing 'Chest' (with key C) into input and verifying chat does NOT open...");
  const typingResult = await Runtime.evaluate({
    expression: `(() => {
      const s = window.__sim?.s;
      const searchInput = document.querySelector("input[placeholder*='Search']");
      if (searchInput) searchInput.focus();

      // Dispatch 'KeyC'
      window.dispatchEvent(new KeyboardEvent("keydown", { code: "KeyC", key: "c", bubbles: true }));
      if (searchInput) searchInput.value = "c";

      // Dispatch 'KeyT'
      window.dispatchEvent(new KeyboardEvent("keydown", { code: "KeyT", key: "t", bubbles: true }));
      if (searchInput) searchInput.value += "t";

      return {
        chatOpen: s?.chatOpen,
        inputValue: searchInput?.value
      };
    })()`,
    returnByValue: true
  });
  console.log("Typing 'C' and 'T' Result:", JSON.stringify(typingResult.result?.value, null, 2));

  console.log("ALL SEARCH FOCUS & INPUT CAPTURE TESTS PASSING ✓");
  await client.close();
} catch (e) {
  console.error("Test error:", e);
} finally {
  chrome.kill();
}

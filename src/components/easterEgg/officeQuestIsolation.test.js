// A static regression guard: changes to the game must not quietly introduce
// imports of Interview Buddy's production services or persistence APIs.
import fs from "fs";
import path from "path";

const files = ["officeQuestLogic.js", "OfficeQuestLauncher.js", "OfficeQuest.js"];

it.each(files)("%s uses only local game modules and React", (file) => {
  const source = fs.readFileSync(path.join(__dirname, file), "utf8");
  const imports = Array.from(source.matchAll(/\bfrom\s+["']([^"']+)["']/g), (m) => m[1]);
  // The CSS import in OfficeQuest is a side-effect import; it is private to
  // the lazy-loaded game component and CSS selectors are namespaced.
  expect(imports.every((specifier) => specifier === "react" || specifier.startsWith("./"))).toBe(true);
  expect(source).not.toMatch(/\b(fetch\s*\(|XMLHttpRequest|sendBeacon|localStorage\b|sessionStorage\b|getFirestore\b|firebase\/|\.\.\/services\/|\.\.\/repositories\/)/);
});

it("loads the full game only via a lazy import after unlocking", () => {
  const launcher = fs.readFileSync(path.join(__dirname, "OfficeQuestLauncher.js"), "utf8");
  expect(launcher).toMatch(/React\.lazy\(\(\) => import\("\.\/OfficeQuest"\)\)/);
  expect(launcher).toMatch(/return open \?/);
});

it("does not register global unscoped styles", () => {
  const css = fs.readFileSync(path.join(__dirname, "officeQuest.css"), "utf8");
  // No bare global element or CSS root selectors; styles are confined to the
  // backdrop and descendants. This guard is in addition to normal visual QA.
  expect(css).not.toMatch(/(^|\})\s*(html|body|:root|button|canvas|input|h1|h2)\s*\{/m);
  expect(css).toMatch(/\.officeQuestBackdrop\s*\{/);
});

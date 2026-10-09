import assert from "node:assert/strict";
import { readFile, stat } from "node:fs/promises";
import test from "node:test";

const root = new URL("./", import.meta.url);
const index = await readFile(new URL("index.html", root), "utf8");
const library = await readFile(new URL("library.html", root), "utf8");
const book = await readFile(new URL("book.html", root), "utf8");
const script = await readFile(new URL("flipbook.js", root), "utf8");
const bookScript = await readFile(new URL("book.mjs", root), "utf8");
const styles = await readFile(new URL("styles.css", root), "utf8");

test("template includes a persistent bookshelf", () => {
  assert.doesNotMatch(`${index}\n${library}\n${book}\n${bookScript}\n${styles}`, /react|jsx|vite/i);
  assert.match(index, /id="shelf"/);
  assert.match(index, /id="create-book"/);
  assert.match(index, /id="delete-dialog"/);
  assert.match(index, /id="book-search"/);
  assert.match(index, /id="export-books"/);
  assert.match(index, /id="import-books"/);
  assert.match(library, /library\.mjs/);
  assert.match(book, /book\.mjs/);
  assert.match(bookScript, /savePages/);
  assert.match(bookScript, /edit-page/);
  assert.match(bookScript, /formatDate/);
});

test("book reader retains the page-flip contract", () => {
  assert.match(book, /id="book"/);
  assert.match(book, /data-page-width="\d+"/);
  assert.match(book, /data-page-height="\d+"/);
  assert.match(book, /vendor\/page-flip\.browser\.js/);
  assert.match(script, /new St\.PageFlip/);
  assert.match(script, /loadFromHTML\(pages\)/);
  assert.match(script, /bookElement\.dataset\.pageWidth/);
  assert.match(script, /bookElement\.dataset\.pageHeight/);
  assert.match(styles, /\.book-page\.\--left::before/);
  assert.match(styles, /\.book-page\.\--right::before/);
  assert.match(styles, /z-index:\s*3/);
  assert.match(styles, /linear-gradient\(to (?:left|right)/);
  assert.doesNotMatch(styles, /box-shadow:\s*inset/);
  assert.doesNotMatch(styles, /book-gutter|data-orientation="landscape"/);
});

test("default page size stays inside the UI envelope", () => {
  const width = Number(book.match(/data-page-width="(\d+)"/)?.[1]);
  const height = Number(book.match(/data-page-height="(\d+)"/)?.[1]);
  assert.ok(Math.max(width, height) <= 640);
});

test("vendored runtime and photo directory exist", async () => {
  assert.equal((await stat(new URL("vendor/page-flip.browser.js", root))).isFile(), true);
  assert.equal((await stat(new URL("assets/photos/", root))).isDirectory(), true);
});

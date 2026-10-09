# Built-in 2D book UI

The reusable runtime is in `assets/html/`. It includes the [default style](default-style.md), fonts, textures, a persistent bookshelf, and an editable book reader. Copy the whole directory into the output book directory. `index.html` is the shelf, `book.html?book=<id>` is the reader, and the generated records are kept in the browser's IndexedDB database `photo-flipbook-library`.

Runtime contract:

- Pages are `.book-page` elements inside `#book`; only the first and last leaves have `data-density="hard"`.
- Page dimensions follow the artwork ratio, with the longer UI edge at most `640`. `contain` preserves whole images when source ratios differ.
- Full-spread artwork can be split at its gutter for display as paired leaves. Preserve the accepted artwork in the displayed pages.
- Keep the bundled responsive layout, mouse/touch/keyboard controls, turn lock, and page-bound spine shadows.
- Keep book IDs stable when updating a page. Store title, `createdAt`, `updatedAt`, photos, and pages through `library-store.mjs`; the shelf uses the creation time and title from these fields.
- Give editable regions a `page.texts` object. The reader exposes those keys in a dialog and persists edits with `savePage`. A cover can set `titleKey: "title"` so its edited title updates the shelf.
- Delete only through the shelf confirmation dialog; `deleteBook` removes the complete book record while leaving source photo files untouched.

The default page layer uses `.art-page` with `paper`, `endpaper`, or `cloth`. A `.plate` can be `small`, `medium`, `large`, or `portrait`, optionally positioned `high`, `low`, or `aside`. Blank pages, title text, colophon, and cover markup are demonstrated in the starter. `style/book-style.css` owns the reusable visual settings; `styles.css` owns the reader. A different requested style can replace the page layer.

Validation: `node --test html-contract.test.mjs` in the book directory, plus checks for asset paths, shelf actions, leaf order, and spread pairing. In a browser, create a book, reload the shelf, edit text on two pages, reopen it, then delete it and confirm the shelf is empty.

Local preview from the output directory, using an available port:

```bash
python3 -m http.server 4173 --bind 127.0.0.1
```

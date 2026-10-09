---
name: create-photo-flipbook-ui
description: Create photobooks by understanding input photos, defining the book's style and design, and building a local 2D flipbook bookshelf with titled, dated books and editable page text. Use for photobooks and artist books from photos, image folders, or visual references.
---

# Photobook Art Direction

Create a photobook through the stages below. Choose the process and tools as needed to reach each outcome; honor the user's scope and keep source files intact. Tool references are optional. `SKILL_DIR` is the directory containing this file.

## 1. Understand the photos

Goal: develop a basic understanding of the input photos' form, content, and themes.

Available tools: [semantic photo search](references/photo-library.md) and [contact sheets](scripts/make_contact_sheet.py).

## 2. Define the book's style and design

Goal: finalize a coherent, aesthetically strong, high-quality style and design that fulfills the user's request.

Without a preferred style, preserve the original photos and use the [default photobook style](references/default-style.md), with its bundled design assets. For a requested style or supplied reference, choose appropriate tools to realize it; artistic treatments often require image generation for each spread.

Available tools: [Pinterest](references/pinterest-style-research.md), the [photo-skill catalogue](references/photo-skill-catalog.md), and image generation with [spread guidance](references/spread-generation.md).

## 3. Build the book UI

Goal: deliver the designed books as a working local 2D flipbook and bookshelf, with its URL and output directory.

Use the built-in [HTML runtime](assets/html/index.html). The runtime opens with a persistent bookshelf: each generated book has a title, creation time, photos, delete action, and an editable reader. [Runtime notes](references/book-editing.md) cover integration, the IndexedDB data model, and validation.

When creating a book, put each editable text region in `page.texts` and give the cover title a `titleKey`. Keep image data in the book's `photos` and page records so the user can reopen it from the shelf. Never overwrite an existing book ID when updating a page; use the provided `library-store.mjs` transaction helpers.

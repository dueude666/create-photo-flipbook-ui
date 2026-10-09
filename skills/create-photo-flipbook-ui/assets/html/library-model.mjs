export const BOOK_COLORS = ['#69745c', '#a36c51', '#616e79', '#a18a56', '#7a6373'];

export function newBook({ title, pages, photos = [], readerUrl, id = crypto.randomUUID(), now = new Date() }) {
  title = title.trim();
  if (!title || title.length > 80) throw new Error('请填写 1–80 字的相册标题。');
  if (!Array.isArray(pages) || pages.length < 2) throw new Error('相册至少需要封面和封底。');
  return { id, title, createdAt: now.toISOString(), updatedAt: now.toISOString(), color: BOOK_COLORS[pages.length % BOOK_COLORS.length], readerUrl, pages, photos };
}

export function editPage(book, pageIndex, edits, now = new Date()) {
  if (!Number.isInteger(pageIndex) || !book.pages[pageIndex]) throw new Error('找不到这一页。');
  if (!edits || Object.values(edits).some(text => typeof text !== 'string' || text.length > 2000)) throw new Error('每段文字最多 2000 字。');
  const pages = book.pages.map((page, index) => index === pageIndex ? { ...page, edits: { ...page.edits, ...edits } } : page);
  // Only the explicitly marked cover heading changes the book's shelf title.
  const titleKey = pages[pageIndex].titleKey;
  const title = titleKey && Object.hasOwn(edits, titleKey) ? edits[titleKey].trim() : book.title;
  if (!title || title.length > 80) throw new Error('封面标题需要保留 1–80 字。');
  return { ...book, title, pages, updatedAt: now.toISOString() };
}

export function sortedBooks(books) {
  return [...books].sort((a, b) => b.createdAt.localeCompare(a.createdAt) || a.id.localeCompare(b.id));
}

export function formatDate(value) {
  return new Intl.DateTimeFormat('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date(value));
}

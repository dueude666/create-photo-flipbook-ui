import { getBook, savePages } from './library-store.mjs';
import { formatDate } from './library-model.mjs';

const bookId = new URLSearchParams(location.search).get('book');
const bookElement = document.querySelector('#book');
const previousButton = document.querySelector('#previous');
const nextButton = document.querySelector('#next');
const editButton = document.querySelector('#edit-page');
const editDialog = document.querySelector('#edit-dialog');
const pageSelect = document.querySelector('#edit-page-select');
const editFields = document.querySelector('#edit-fields');
const editError = document.querySelector('#edit-error');
const saveStatus = document.querySelector('#save-status');
const saveButton = document.querySelector('#save-text');
let book;
let pageFlip;
let currentPage = 0;
let editingPage = 0;
let saving = false;
const drafts = new Map();
const safe = value => String(value ?? '').replace(/[&<>'"]/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[char]));
const pageLabel = index => index === 0 ? '封面' : index === book.pages.length - 1 ? '封底' : `第 ${index} 页`;

function pageHtml(page, index) {
  const values = { ...(page.texts || {}), ...(page.edits || {}) };
  const cover = index === 0;
  const last = index === book.pages.length - 1;
  const classes = `book-page art-page ${cover || last ? 'cloth' : 'paper'} ${index % 2 ? 'verso' : 'recto'}`;
  let content;
  if (cover) {
    content = `<h2 class="cover-title">${safe(values.title ?? book.title)}</h2><p class="cover-subtitle">${safe(values.subtitle ?? '摄影与记忆')}</p><span class="cover-foot">${safe(formatDate(book.createdAt).slice(0, 10))}</span>`;
  } else if (page.kind === 'photo' && page.photo) {
    content = `<figure class="plate medium"><img src="${safe(page.photo.src)}" alt="${safe(page.photo.name)}" decoding="async"></figure><p class="editable-caption">${safe(values.caption)}</p>`;
  } else if (last) {
    content = `<div class="colophon"><p>${safe(values.body ?? '记录此刻，留给未来。')}</p></div>`;
  } else {
    content = `<div class="text-page-body"><p>${safe(values.body ?? values.caption ?? '')}</p></div>`;
  }
  return `<article class="${classes}" ${cover || last ? 'data-density="hard"' : ''} aria-label="${pageLabel(index)}">${content}</article>`;
}

function makePages() {
  const fragment = document.createElement('template');
  fragment.innerHTML = book.pages.map(pageHtml).join('');
  return fragment.content.querySelectorAll('.book-page');
}
function updateHeading() {
  document.title = `${book.title} · 时光书柜`;
  document.querySelector('#book-title').textContent = book.title;
  document.querySelector('#book-meta').textContent = `创建于 ${formatDate(book.createdAt)} · ${book.photos?.length || 0} 张照片`;
}
function updateOrientation(mode) {
  bookElement.dataset.layout = mode;
  document.querySelector('#orientation').textContent = mode === 'portrait' ? '单页阅读' : '跨页阅读';
}
function updateControls() {
  if (!pageFlip) return;
  const turning = pageFlip.getState() !== 'read';
  const last = book.pages.length - 1;
  previousButton.disabled = currentPage === 0 || turning;
  nextButton.disabled = currentPage === last || turning;
  editButton.disabled = saving || turning;
  bookElement.dataset.edge = currentPage === 0 ? 'front' : currentPage === last ? 'back' : 'inside';
  document.querySelector('#page-status').textContent = pageLabel(currentPage);
  try { localStorage.setItem(`photo-flipbook-page:${book.id}`, String(currentPage)); } catch { /* Optional preference. */ }
}
function rememberDraft() {
  if (!editFields.querySelector('textarea')) return;
  drafts.set(editingPage, Object.fromEntries([...editFields.querySelectorAll('textarea')].map(input => [input.name, input.value])));
}
function buildEditor() {
  editFields.replaceChildren();
  const page = book.pages[editingPage];
  const values = { ...(page.texts || {}), ...(page.edits || {}), ...(drafts.get(editingPage) || {}) };
  if (!Object.keys(values).length) values[page.kind === 'photo' ? 'caption' : 'body'] = '';
  const names = { title: '封面标题', subtitle: '副标题', caption: '照片说明', body: '页面文字' };
  for (const [key, value] of Object.entries(values)) {
    const label = document.createElement('label');
    const input = document.createElement('textarea');
    const counter = document.createElement('small');
    input.id = `page-text-${editFields.childElementCount}`;
    input.name = key;
    input.value = String(value);
    input.rows = key === 'title' ? 2 : 5;
    input.maxLength = key === 'title' ? 80 : key === 'caption' ? 600 : 2000;
    label.htmlFor = input.id;
    label.textContent = names[key] || key;
    const updateCount = () => { counter.textContent = `${input.value.length} / ${input.maxLength} 字`; };
    input.addEventListener('input', updateCount);
    counter.className = 'field-counter'; updateCount();
    editFields.append(label, input, counter);
  }
}
function openEditor() {
  if (!pageFlip || saving) return;
  drafts.clear(); editingPage = currentPage;
  pageSelect.replaceChildren(...book.pages.map((page, index) => { const option = document.createElement('option'); option.value = index; option.textContent = pageLabel(index); return option; }));
  pageSelect.value = editingPage; buildEditor(); editError.textContent = '';
  editDialog.showModal(); editFields.querySelector('textarea')?.focus();
}

pageSelect.addEventListener('change', () => { rememberDraft(); editingPage = Number(pageSelect.value); buildEditor(); });
editButton.addEventListener('click', openEditor);
document.querySelectorAll('#cancel-edit, #cancel-edit-bottom').forEach(button => button.addEventListener('click', () => { if (!saving) editDialog.close(); }));
editDialog.addEventListener('cancel', event => { if (saving) event.preventDefault(); });
document.querySelector('#edit-form').addEventListener('submit', async event => {
  event.preventDefault(); if (saving) return;
  rememberDraft(); editError.textContent = ''; saving = true;
  saveButton.disabled = true; pageSelect.disabled = true; saveButton.textContent = '正在保存…';
  try {
    book = await savePages(book.id, [...drafts.entries()]);
    updateHeading();
    pageFlip.updateFromHtml(makePages());
    pageFlip.turnToPage(editingPage);
    editDialog.close(); saveStatus.textContent = '文字已保存';
    setTimeout(() => { saveStatus.textContent = ''; }, 3000);
  } catch (error) { editError.textContent = error.message; }
  finally { saving = false; saveButton.disabled = false; pageSelect.disabled = false; saveButton.textContent = '保存文字'; updateControls(); }
});
previousButton.addEventListener('click', () => { if (pageFlip) pageFlip.flipPrev('bottom'); });
nextButton.addEventListener('click', () => { if (pageFlip) pageFlip.flipNext('bottom'); });
window.addEventListener('keydown', event => {
  if (!pageFlip || editDialog.open || saving || event.altKey || event.ctrlKey || event.metaKey || event.target.closest('input, textarea, select, button')) return;
  if (pageFlip.getState() !== 'read') return;
  if (event.key === 'ArrowLeft') { event.preventDefault(); pageFlip.flipPrev('bottom'); }
  if (event.key === 'ArrowRight' || event.key === ' ') { event.preventDefault(); pageFlip.flipNext('bottom'); }
  if (event.key.toLowerCase() === 'e') openEditor();
});

async function start() {
  if (!bookId) { location.replace('library.html'); return; }
  try {
    book = await getBook(bookId);
    if (!book) throw new Error('这本相册已被移除。请返回书柜选择其他相册。');
    updateHeading();
    const pageWidth = Number(bookElement.dataset.pageWidth), pageHeight = Number(bookElement.dataset.pageHeight);
    let position = 0;
    try { const saved = Number(localStorage.getItem(`photo-flipbook-page:${book.id}`)); if (Number.isInteger(saved) && saved >= 0 && saved < book.pages.length) position = saved; } catch { /* Default to the cover. */ }
    pageFlip = new St.PageFlip(bookElement, { width: pageWidth, height: pageHeight, size: 'stretch', minWidth: 160, maxWidth: 512, minHeight: 200, maxHeight: 640, drawShadow: true, flippingTime: 650, startPage: position, usePortrait: true, autoSize: true, startZIndex: 10, maxShadowOpacity: .35, showCover: true, mobileScrollSupport: false, clickEventForward: true, useMouseEvents: true, swipeDistance: 24, showPageCorners: true });
    pageFlip.on('flip', event => { currentPage = Number(event.data); updateControls(); });
    pageFlip.on('changeState', updateControls);
    pageFlip.on('init', event => { currentPage = pageFlip.getCurrentPageIndex(); updateOrientation(event.data.mode); updateControls(); });
    pageFlip.on('changeOrientation', event => { updateOrientation(event.data); updateControls(); });
    pageFlip.loadFromHTML(makePages()); currentPage = pageFlip.getCurrentPageIndex(); updateOrientation(pageFlip.getOrientation()); updateControls();
  } catch (error) {
    document.querySelector('.book-rig').hidden = true;
    const notice = document.querySelector('#reader-error'); notice.hidden = false; notice.textContent = error.message;
    document.querySelector('#book-title').textContent = '无法打开相册'; previousButton.disabled = nextButton.disabled = editButton.disabled = true;
  }
}
start();

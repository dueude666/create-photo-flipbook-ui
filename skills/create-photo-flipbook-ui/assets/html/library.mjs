import { newBook, formatDate } from './library-model.mjs';
import { deleteBook, getBooks, putBook, onLibraryChange } from './library-store.mjs';

const shelf = document.querySelector('#shelf');
const loading = document.querySelector('#library-loading');
const emptyShelf = document.querySelector('#empty-shelf');
const count = document.querySelector('#book-count');
const message = document.querySelector('#library-message');
const searchInput = document.querySelector('#book-search');
const sortSelect = document.querySelector('#book-sort');
const filterStatus = document.querySelector('#filter-status');
const exportButton = document.querySelector('#export-books');
const importButton = document.querySelector('#import-books');
const importFile = document.querySelector('#import-file');
const createDialog = document.querySelector('#create-dialog');
const createForm = document.querySelector('#create-form');
const deleteDialog = document.querySelector('#delete-dialog');
const deleteForm = document.querySelector('#delete-form');
const titleInput = document.querySelector('#album-title');
const fileInput = document.querySelector('#album-photos');
const selection = document.querySelector('#photo-selection');
const createError = document.querySelector('#create-error');
const deleteError = document.querySelector('#delete-error');
let books = [];
let pendingDelete;
let query = '';
let sort = 'newest';

const escapeHtml = value => String(value).replace(/[&<>'"]/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[char]));
function showMessage(value, isError = false) { message.textContent = value; message.classList.toggle('error', isError); }
function visibleBooks() {
  const filtered = books.filter(book => book.title.toLocaleLowerCase().includes(query.toLocaleLowerCase()));
  return filtered.sort((a, b) => sort === 'title' ? a.title.localeCompare(b.title, 'zh-CN') : sort === 'oldest' ? a.createdAt.localeCompare(b.createdAt) : b.createdAt.localeCompare(a.createdAt));
}
function render() {
  const visible = visibleBooks();
  loading.hidden = true;
  emptyShelf.hidden = books.length !== 0;
  shelf.hidden = visible.length === 0;
  count.textContent = `${books.length} 本`;
  filterStatus.textContent = query && visible.length === 0 ? `没有找到“${query}”` : query ? `显示 ${visible.length} 本相册` : '';
  shelf.replaceChildren(...visible.map(book => {
    const item = document.createElement('li');
    item.className = 'shelf-item';
    item.innerHTML = `<a class="book-cover" style="--cover-color:${escapeHtml(book.color)}" href="book.html?book=${encodeURIComponent(book.id)}" aria-label="打开《${escapeHtml(book.title)}》"><span class="cover-label">PHOTOBOOK</span><strong class="cover-title">${escapeHtml(book.title)}</strong><span class="cover-date">${escapeHtml(formatDate(book.createdAt).slice(0, 10))}</span></a><div class="book-meta"><h3>${escapeHtml(book.title)}</h3><time datetime="${escapeHtml(book.createdAt)}">创建于 ${escapeHtml(formatDate(book.createdAt))}</time><p>${book.photos.length ? `${book.photos.length} 张照片 · ` : ''}${book.pages.length} 页</p><div class="book-actions"><a href="book.html?book=${encodeURIComponent(book.id)}">打开相册 →</a><button class="delete-book" type="button" data-book-id="${escapeHtml(book.id)}">删除</button></div></div>`;
    item.querySelector('.delete-book').addEventListener('click', () => openDelete(book));
    return item;
  }));
}
async function refresh() { try { books = await getBooks(); render(); } catch (error) { loading.textContent = error.message; showMessage(error.message, true); } }
function openDelete(book) { pendingDelete = book; document.querySelector('#delete-description').textContent = `《${book.title}》创建于 ${formatDate(book.createdAt)}。`; deleteError.textContent = ''; deleteDialog.showModal(); }
function showCreate() { createForm.reset(); createError.textContent = ''; selection.textContent = '尚未选择照片'; createDialog.showModal(); titleInput.focus(); }
document.querySelectorAll('#create-book, #create-first').forEach(button => button.addEventListener('click', showCreate));
document.querySelector('#cancel-create').addEventListener('click', () => createDialog.close());
document.querySelector('#cancel-create-bottom').addEventListener('click', () => createDialog.close());
document.querySelector('#cancel-delete').addEventListener('click', () => deleteDialog.close());
searchInput.addEventListener('input', () => { query = searchInput.value.trim(); render(); });
sortSelect.addEventListener('change', () => { sort = sortSelect.value; render(); });
exportButton.addEventListener('click', async () => {
  try {
    const data = JSON.stringify({ version: 1, exportedAt: new Date().toISOString(), books }, null, 2);
    const url = URL.createObjectURL(new Blob([data], { type: 'application/json' }));
    const anchor = document.createElement('a'); anchor.href = url; anchor.download = `photo-flipbook-library-${new Date().toISOString().slice(0, 10)}.json`; anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000); showMessage(`已导出 ${books.length} 本相册。`);
  } catch (error) { showMessage(`导出失败：${error.message}`, true); }
});
importButton.addEventListener('click', () => importFile.click());
importFile.addEventListener('change', async () => {
  const file = importFile.files?.[0]; if (!file) return;
  try {
    const payload = JSON.parse(await file.text()); const imported = Array.isArray(payload) ? payload : payload.books;
    if (!Array.isArray(imported) || imported.length > 100) throw new Error('文件格式不正确，最多导入 100 本相册。');
    for (const record of imported) {
      if (!record || typeof record.id !== 'string' || typeof record.title !== 'string' || !Array.isArray(record.pages) || record.pages.length < 2) throw new Error('文件中包含无法识别的相册。');
      if (record.title.length > 80 || record.pages.length > 202) throw new Error('相册内容超出允许范围。');
      await putBook({ ...record, photos: Array.isArray(record.photos) ? record.photos : [], updatedAt: record.updatedAt || record.createdAt || new Date().toISOString() });
    }
    await refresh(); showMessage(`已导入 ${imported.length} 本相册。`);
  } catch (error) { showMessage(`导入失败：${error.message}`, true); } finally { importFile.value = ''; }
});
fileInput.addEventListener('change', () => { const files = [...fileInput.files]; selection.textContent = files.length ? `已选择 ${files.length} 张照片` : '尚未选择照片'; });
createForm.addEventListener('submit', async event => {
  event.preventDefault(); createError.textContent = '';
  const files = [...fileInput.files];
  if (files.length > 100) { createError.textContent = '一次最多添加 100 张照片。'; return; }
  try {
    const photos = await Promise.all(files.map(file => new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve({ name: file.name, src: reader.result, type: file.type }); reader.onerror = () => reject(new Error(`无法读取 ${file.name}`)); reader.readAsDataURL(file); })));
    const title = titleInput.value.trim();
    const pages = [{ kind: 'cover', texts: { title, subtitle: 'Photographs' }, titleKey: 'title' }, ...photos.map(photo => ({ kind: 'photo', photo, texts: { caption: '' } })), { kind: 'end', texts: { body: 'Photographs and credits' } }];
    const book = newBook({ title, pages, photos });
    await putBook(book); createDialog.close(); await refresh(); showMessage(`《${book.title}》已放入书柜。`); location.href = `book.html?book=${encodeURIComponent(book.id)}`;
  } catch (error) { createError.textContent = error.message; }
});
deleteForm.addEventListener('submit', async event => { event.preventDefault(); if (!pendingDelete) return; try { await deleteBook(pendingDelete.id); deleteDialog.close(); showMessage(`《${pendingDelete.title}》已从书柜移除。`); pendingDelete = undefined; await refresh(); } catch (error) { deleteError.textContent = error.message; } });
onLibraryChange(refresh);
refresh();

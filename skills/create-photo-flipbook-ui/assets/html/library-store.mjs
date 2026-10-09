import { editPage, sortedBooks } from './library-model.mjs';

let database;
function openDatabase() {
  if (!database) database = new Promise((resolve, reject) => {
    const request = indexedDB.open('photo-flipbook-library', 1);
    request.onupgradeneeded = () => request.result.createObjectStore('books', { keyPath: 'id' });
    request.onsuccess = () => { const db = request.result; db.onversionchange = () => { db.close(); database = undefined; }; resolve(db); };
    request.onerror = () => { database = undefined; reject(new Error('无法打开本地书柜，请允许浏览器保存网站数据。')); };
    request.onblocked = () => reject(new Error('请关闭其他相册标签页后重试。'));
  });
  return database;
}

async function transaction(mode, action) {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('books', mode);
    let result;
    tx.oncomplete = () => { if (mode === 'readwrite') announceChange(); resolve(result); };
    tx.onerror = tx.onabort = () => reject(tx.error || new Error('保存失败，浏览器空间可能不足。请重试。'));
    action(tx.objectStore('books'), value => { result = value; }, tx);
  });
}

const channel = typeof BroadcastChannel === 'function' ? new BroadcastChannel('photo-flipbook-library') : null;
function announceChange() { channel?.postMessage('changed'); }
export function onLibraryChange(callback) {
  channel?.addEventListener('message', callback);
  return () => channel?.removeEventListener('message', callback);
}
export const getBook = id => transaction('readonly', (store, done) => { const req = store.get(id); req.onsuccess = () => done(req.result); });
export const getBooks = () => transaction('readonly', (store, done) => { const req = store.getAll(); req.onsuccess = () => done(sortedBooks(req.result)); });
export const putBook = book => transaction('readwrite', (store, done) => { store.put(book); done(book); });
export const deleteBook = id => transaction('readwrite', store => store.delete(id));

// Read and write in one transaction: edits cannot resurrect a deleted album or
// overwrite edits to other pages made in another tab.
export function savePage(id, index, edits) {
  let validationError;
  return transaction('readwrite', (store, done, tx) => {
    const req = store.get(id);
    req.onsuccess = () => {
      try {
        if (!req.result) throw new Error('这本相册已被删除，请返回书柜。');
        const updated = editPage(req.result, index, edits);
        store.put(updated);
        done(updated);
      } catch (error) { validationError = error; tx.abort(); }
    };
  }).catch(error => { throw validationError || error; });
}

export function savePages(id, editsByPage) {
  let validationError;
  return transaction('readwrite', (store, done, tx) => {
    const req = store.get(id);
    req.onsuccess = () => {
      try {
        if (!req.result) throw new Error('这本相册已被删除，请返回书柜。');
        let updated = req.result;
        for (const [index, edits] of editsByPage) updated = editPage(updated, Number(index), edits);
        store.put(updated); done(updated);
      } catch (error) { validationError = error; tx.abort(); }
    };
  }).catch(error => { throw validationError || error; });
}

// A stable source ID keeps opening a generated book from creating duplicates.
export function registerBook(book) {
  return transaction('readwrite', (store, done) => {
    const req = store.get(book.id);
    req.onsuccess = () => { if (!req.result) store.add(book); done(req.result || book); };
  });
}

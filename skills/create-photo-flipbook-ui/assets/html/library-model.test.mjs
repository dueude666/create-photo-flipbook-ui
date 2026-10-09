import assert from 'node:assert/strict';
import test from 'node:test';
import { editPage, newBook, sortedBooks } from './library-model.mjs';

const pages = [{ kind: 'cover', titleKey: 'title', texts: { title: '原题', subtitle: '副题' } }, { kind: 'end', texts: { body: '尾页' } }];

test('new books contain stable metadata and page content', () => {
  const book = newBook({ title: '旅行', pages, now: new Date('2026-10-08T00:00:00Z') });
  assert.equal(book.title, '旅行');
  assert.equal(book.createdAt, '2026-10-08T00:00:00.000Z');
  assert.equal(book.pages.length, 2);
});

test('page edits update the cover title and timestamp', () => {
  const book = newBook({ title: '旅行', pages, now: new Date('2026-10-08T00:00:00Z') });
  const updated = editPage(book, 0, { title: '秋日旅行', subtitle: '山与风' }, new Date('2026-10-09T00:00:00Z'));
  assert.equal(updated.title, '秋日旅行');
  assert.deepEqual(updated.pages[0].edits, { title: '秋日旅行', subtitle: '山与风' });
  assert.equal(updated.updatedAt, '2026-10-09T00:00:00.000Z');
});

test('books are listed newest first without mutating the stored array', () => {
  const oldBook = newBook({ title: '旧', pages, id: 'b', now: new Date('2026-10-08T00:00:00Z') });
  const newBookRecord = newBook({ title: '新', pages, id: 'a', now: new Date('2026-10-09T00:00:00Z') });
  const books = [oldBook, newBookRecord];
  assert.deepEqual(sortedBooks(books).map(book => book.id), ['a', 'b']);
  assert.deepEqual(books.map(book => book.id), ['b', 'a']);
});

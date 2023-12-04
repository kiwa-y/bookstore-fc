import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import { like, eq, lt, gt, and, sql } from "drizzle-orm";
import postgres from "postgres";
import { books } from "./schema";

type ISBN = string;
type Book = {
  isbn: ISBN;
  title: string;
  author: string;
  owned: number;
  available: number;
};

const connection = postgres("postgres://0.0.0.0:5432/bookstore_db");
const db = drizzle(connection);

const teardown = async () => {
  await db.execute(sql`TRUNCATE TABLE books;`);
  await connection.end();
};

const addBook = async (
  isbn: string,
  title: string,
  author: string,
  owned: number,
  avail: number
): Promise<void> => {
  await db.insert(books).values({
    isbn: isbn,
    title: title,
    author: author,
    owned: owned,
    available: avail,
  });
};

const addCopy = async (isbn: string): Promise<void> => {
  const updated = await db
    .update(books)
    .set({
      owned: sql`books.owned + 1`,
      available: sql`books.available + 1`,
    })
    .where(eq(books.isbn, isbn))
    .returning({ isbn: books.isbn });
  if (updated.length === 0) {
    throw new Error(`Not Found: ${isbn}`);
  }
};

const borrowCopy = async (isbn: string): Promise<void> => {
  const copy = await db.select().from(books).where(eq(books.isbn, isbn));
  if (copy.length === 0) {
    throw new Error(`Not Found: ${isbn}`);
  } else if (copy[0].available === 0) {
    throw new Error(`Unavailable: ${isbn}`);
  }
  const updated = await db
    .update(books)
    .set({
      available: sql`books.available - 1`,
    })
    .where(eq(books.isbn, isbn))
    .returning({ isbn: books.isbn });
};

const returnCopy = async (isbn: string): Promise<void> => {
  const updated = await db
    .update(books)
    .set({
      available: sql`books.available + 1`,
    })
    .where(and(eq(books.isbn, isbn), lt(books.available, books.owned)))
    .returning({ isbn: books.isbn });
  if (updated.length === 0) {
    throw new Error(`Not Found: ${isbn}`);
  }
};

const findBookByIsbn = async (isbn: string): Promise<Book | null> => {
  const res = await db.select().from(books).where(eq(books.isbn, isbn));
  if (res.length === 0) {
    return null;
  }
  return res[0];
};

const findBookByTitle = async (title: string): Promise<Book[]> => {
  return await db
    .select()
    .from(books)
    .where(like(books.title, `%${title}%`));
};

const findBookByAuthor = async (author: string): Promise<Book[]> => {
  return await db
    .select()
    .from(books)
    .where(like(books.author, `%${author}%`));
};

export {
  ISBN,
  Book,
  addBook,
  addCopy,
  borrowCopy,
  returnCopy,
  findBookByIsbn,
  findBookByTitle,
  findBookByAuthor,
  teardown,
};

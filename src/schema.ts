import {varchar, smallint, pgTable } from "drizzle-orm/pg-core";
export const books = pgTable('books', {
  isbn: varchar("isbn", {length: 20}).primaryKey(),
  title: varchar("title", {length: 256}).notNull(),
  author: varchar("author", {length: 256}).notNull(),
  owned: smallint("owned").default(0).notNull(),
  available: smallint("available").default(0).notNull(),
});

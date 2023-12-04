import fc, { GeneratorValue } from "fast-check";
import {
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
} from "../src/db";

import {
  Model,
  AddBookNewCommand,
  AddCopyNewCommand,
  BorrowCopyUnknownCommand,
  ReturnCopyUnknownCommand,
  FindByISBNUnknownCommand,
  FindByTitleUnknownCommand,
  FindByAuthorUnknownCommand,
  AddBookExistingCommand,
  AddCopyExistingCommand,
  BorrowCopyAvailableCommand,
  BorrowCopyUnavailableCommand,
  ReturnCopyExistingCommand,
  ReturnCopyFullCommand,
  FindByISBNExistsCommand,
  FindByTitleMatchingCommand,
  FindByAuthorMatchingCommand,
} from "./bookCommands";

// generators
const title = () => {
  return friendry_unicode();
};

const author = () => {
  return friendry_unicode();
};

const friendry_unicode = () => {
  const badchars = ["\\", "\x00", "_", "%"];
  return fc.string({ maxLength: 255 }).filter((s) => {
    for (let t of badchars) {
      if (s.includes(t)) return false;
    }
    return true;
  });
};

const isbn = () => {
  return fc.stringMatching(
    /^(978|979)-[1-9][0-9]{0,3}-[1-9][0-9]{0,3}-[1-9][0-9]{0,2}-([1-9]|X)$/
  );
};

const book = () => {
  return fc.record({
    isbn: isbn(),
    title: title(),
    author: author(),
    owned: fc.constant(1),
    available: fc.constant(1),
  });
};

const bookInState = (gen: GeneratorValue) => {
  if (state.size === 0) return gen(book);
  return gen(fc.constantFrom, ...Array.from(state.values()));
};

const isbnInState = (gen: GeneratorValue) => {
  if (state.size === 0) return gen(isbn);
  return gen(fc.constantFrom, ...Array.from(state.keys()));
};

const titleInState = (gen: GeneratorValue) => {
  if (state.size === 0) return gen(title);
  return gen(
    fc.constantFrom,
    ...Array.from(state.values()).map((v) => v.title)
  );
};

const authorInState = (gen: GeneratorValue) => {
  if (state.size === 0) return gen(author);
  return gen(
    fc.constantFrom,
    ...Array.from(state.values()).map((v) => v.author)
  );
};

// Model for property
const state: Model = new Map<ISBN, Book>();

// Implementation of BookRepository
const bookRepository = {
  addBook: addBook,
  addCopy: addCopy,
  borrowCopy: borrowCopy,
  returnCopy: returnCopy,
  findBookByIsbn: findBookByIsbn,
  findBookByTitle: findBookByTitle,
  findBookByAuthor: findBookByAuthor,
};

// define the possible commands and their inputs
const allCommands = [
  // always possible
  book().map((v) => new AddBookNewCommand(v)),
  isbn().map((v) => new AddCopyNewCommand(v)),
  isbn().map((v) => new BorrowCopyUnknownCommand(v)),
  isbn().map((v) => new ReturnCopyUnknownCommand(v)),
  isbn().map((v) => new FindByISBNUnknownCommand(v)),
  title().map((v) => new FindByTitleUnknownCommand(v)),
  author().map((v) => new FindByAuthorUnknownCommand(v)),
  // relies on state
  fc.gen().map((gen) => {
    return new AddBookExistingCommand(bookInState(gen));
  }),
  fc.gen().map((gen) => new AddCopyExistingCommand(isbnInState(gen))),
  fc.gen().map((gen) => new BorrowCopyAvailableCommand(isbnInState(gen))),
  fc.gen().map((gen) => new BorrowCopyUnavailableCommand(isbnInState(gen))),
  fc.gen().map((gen) => new ReturnCopyExistingCommand(isbnInState(gen))),
  fc.gen().map((gen) => new ReturnCopyFullCommand(isbnInState(gen))),
  fc.gen().map((gen) => new FindByISBNExistsCommand(isbnInState(gen))),
  fc.gen().map((gen) => new FindByTitleMatchingCommand(titleInState(gen))),
  fc.gen().map((gen) => new FindByAuthorMatchingCommand(authorInState(gen))),
];

describe("property based test example", () => {
  afterAll(async () => {
    await teardown();
  });
  test("model based test for book repository", async () => {
    // run everything
    await fc.assert(
      fc.asyncProperty(fc.commands(allCommands), async (cmds) => {
        const s = () => {
          return {
            model: state,
            real: bookRepository,
          };
        };
        await fc.asyncModelRun(s, cmds);
      }),
      { verbose: true }
    );
  });
});

import fc from "fast-check";
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
} from "../src/db";
type Model = Map<ISBN, Book>;

type BookRepository = {
  addBook: typeof addBook;
  addCopy: typeof addCopy;
  borrowCopy: typeof borrowCopy;
  returnCopy: typeof returnCopy;
  findBookByIsbn: typeof findBookByIsbn;
  findBookByTitle: typeof findBookByTitle;
  findBookByAuthor: typeof findBookByAuthor;
};

// heplers
const likeTitle = (state: Model, title: string): boolean => {
  for (let it of state.values()) {
    if (it.title.indexOf(title) > -1) {
      return true;
    }
  }
  return false;
};

const likeAuthor = (state: Model, author: string): boolean => {
  for (let it of state.values()) {
    if (it.author.indexOf(author) > -1) {
      return true;
    }
  }
  return false;
};

const hasIsbn = (state: Model, isbn: ISBN): boolean => {
  return state.has(isbn);
};

// commands
class AddBookNewCommand implements fc.Command<Model, BookRepository> {
  constructor(readonly value: Book) {}
  check = (m: Readonly<Model>) => {
    return !hasIsbn(m, this.value.isbn);
  };
  async run(m: Model, r: BookRepository): Promise<void> {
    await r.addBook(
      this.value.isbn,
      this.value.title,
      this.value.author,
      this.value.owned,
      this.value.available
    );
    m.set(this.value.isbn, this.value);
  }
  toString = () => `AddBookNew (${this.value.isbn})`;
}

class AddCopyNewCommand implements fc.Command<Model, BookRepository> {
  constructor(readonly value: ISBN) {}
  check = (m: Readonly<Model>) => {
    return !hasIsbn(m, this.value);
  };
  async run(m: Model, r: BookRepository): Promise<void> {
    await expect(r.addCopy(this.value)).rejects.toThrow(
      `Not Found: ${this.value}`
    );
  }
  toString = () => `AddCopyNew (${this.value})`;
}

class BorrowCopyUnknownCommand implements fc.Command<Model, BookRepository> {
  constructor(readonly value: ISBN) {}
  check = (m: Readonly<Model>) => {
    return !hasIsbn(m, this.value);
  };
  async run(m: Model, r: BookRepository): Promise<void> {
    await expect(r.borrowCopy(this.value)).rejects.toThrow(
      `Not Found: ${this.value}`
    );
  }
  toString = () => `BorrowCopyUnknown (${this.value})`;
}

class ReturnCopyUnknownCommand implements fc.Command<Model, BookRepository> {
  constructor(readonly value: ISBN) {}
  check = (m: Readonly<Model>) => {
    return !hasIsbn(m, this.value);
  };
  async run(m: Model, r: BookRepository): Promise<void> {
    await expect(r.returnCopy(this.value)).rejects.toThrow(
      `Not Found: ${this.value}`
    );
  }
  toString = () => `ReturnCopyUnknown (${this.value})`;
}

class FindByISBNUnknownCommand implements fc.Command<Model, BookRepository> {
  constructor(readonly value: ISBN) {}
  check = (m: Readonly<Model>) => {
    return !hasIsbn(m, this.value);
  };
  async run(m: Model, r: BookRepository): Promise<void> {
    const book = await r.findBookByIsbn(this.value);
    expect(book).toBeNull();
  }
  toString = () => `FindBookByIsbnUnknown (${this.value})`;
}

class FindByTitleUnknownCommand implements fc.Command<Model, BookRepository> {
  constructor(readonly value: string) {}
  check = (m: Readonly<Model>) => {
    return !likeTitle(m, this.value);
  };
  async run(m: Model, r: BookRepository): Promise<void> {
    const books = await r.findBookByTitle(this.value);
    expect(books.length).toBe(0);
  }
  toString = () => `FindBookByTitleUnknown (${this.value})`;
}

class FindByAuthorUnknownCommand implements fc.Command<Model, BookRepository> {
  constructor(readonly value: string) {}
  check = (m: Readonly<Model>) => {
    return !likeAuthor(m, this.value);
  };
  async run(m: Model, r: BookRepository): Promise<void> {
    const books = await r.findBookByAuthor(this.value);
    expect(books.length).toBe(0);
  }
  toString = () => `FindBookByAuthorUnknown (${this.value})`;
}

class AddBookExistingCommand implements fc.Command<Model, BookRepository> {
  constructor(readonly value: Book) {}
  check = (m: Readonly<Model>) => {
    return hasIsbn(m, this.value.isbn);
  };
  async run(m: Model, r: BookRepository): Promise<void> {
    await expect(
      r.addBook(
        this.value.isbn,
        this.value.title,
        this.value.author,
        this.value.owned,
        this.value.available
      )
    ).rejects.toThrowError();
  }
  toString = () => `AddBookExisting (${this.value})`;
}

class AddCopyExistingCommand implements fc.Command<Model, BookRepository> {
  constructor(readonly value: ISBN) {}
  check = (m: Readonly<Model>) => {
    return hasIsbn(m, this.value);
  };
  async run(m: Model, r: BookRepository): Promise<void> {
    await r.addCopy(this.value);
    const book = m.get(this.value);
    if (book == null) {
      throw new Error("事前条件を満してない");
    }
    book.owned++;
    book.available++;
    m.set(this.value, book);
  }
  toString = () => `AddCopyExisting (${this.value})`;
}

class BorrowCopyAvailableCommand implements fc.Command<Model, BookRepository> {
  constructor(readonly value: ISBN) {}
  check = (m: Readonly<Model>) => {
    const book = m.get(this.value);
    if (book == null) {
      return false;
    }
    return book.available > 0;
  };
  async run(m: Model, r: BookRepository): Promise<void> {
    await r.borrowCopy(this.value);
    const book = m.get(this.value);
    if (book == null) {
      throw new Error("事前条件を満してない");
    }
    book.available--;
    m.set(this.value, book);
  }
  toString = () => `BorrowCopyAvail (${this.value})`;
}

class BorrowCopyUnavailableCommand
  implements fc.Command<Model, BookRepository>
{
  constructor(readonly value: ISBN) {}
  check = (m: Readonly<Model>) => {
    const book = m.get(this.value);
    if (book == null) {
      return false;
    }
    return book.available === 0;
  };
  async run(m: Model, r: BookRepository): Promise<void> {
    await expect(r.borrowCopy(this.value)).rejects.toThrow(
      `Unavailable: ${this.value}`
    );
  }
  toString = () => `BorrowCopyUnavailable (${this.value})`;
}

class ReturnCopyExistingCommand implements fc.Command<Model, BookRepository> {
  constructor(readonly value: ISBN) {}
  check = (m: Readonly<Model>) => {
    const book = m.get(this.value);
    if (book == null) {
      return false;
    }
    return book.owned !== book.available && book.owned !== 0;
  };
  async run(m: Model, r: BookRepository): Promise<void> {
    await r.returnCopy(this.value);
    const book = m.get(this.value);
    if (book == null) {
      throw new Error("事前条件を満してない");
    }
    book.available++;
    m.set(this.value, book);
  }
  toString = () => `ReturnCopyExisting (${this.value})`;
}

class ReturnCopyFullCommand implements fc.Command<Model, BookRepository> {
  constructor(readonly value: ISBN) {}
  check = (m: Readonly<Model>) => {
    const book = m.get(this.value);
    if (book == null) {
      return false;
    }
    return book.owned === book.available;
  };
  async run(m: Model, r: BookRepository): Promise<void> {
    await expect(r.returnCopy(this.value)).rejects.toThrowError();
  }
  toString = () => `ReturnCopyFull (${this.value})`;
}

class FindByISBNExistsCommand implements fc.Command<Model, BookRepository> {
  constructor(readonly value: ISBN) {}
  check = (m: Readonly<Model>) => {
    return hasIsbn(m, this.value);
  };
  async run(m: Model, r: BookRepository): Promise<void> {
    const book = await r.findBookByIsbn(this.value);
    expect(book).not.toBeNull();
  }
  toString = () => `FindBookByIsbnExists (${this.value})`;
}

class FindByTitleMatchingCommand implements fc.Command<Model, BookRepository> {
  constructor(readonly value: string) {}
  check = (m: Readonly<Model>) => {
    return likeTitle(m, this.value);
  };
  async run(m: Model, r: BookRepository): Promise<void> {
    const books = await r.findBookByTitle(this.value);
    expect(books.length).toBeGreaterThan(0);
  }
  toString = () => `FindBookByTitleMatching (${this.value})`;
}

class FindByAuthorMatchingCommand implements fc.Command<Model, BookRepository> {
  constructor(readonly value: string) {}
  check = (m: Readonly<Model>) => {
    return likeAuthor(m, this.value);
  };
  async run(m: Model, r: BookRepository): Promise<void> {
    const books = await r.findBookByAuthor(this.value);
    expect(books.length).toBeGreaterThan(0);
  }
  toString = () => `FindBookByAuthorMatching (${this.value})`;
}

export {
  Model,
  BookRepository,
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
};

export interface Book {
  title: string;
  author: string;
  isbn: string;
  year: number;
  genre: string;
  available: boolean;
}

export interface User {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  loanCount: number;
}

export interface Loan {
  userId: string;
  isbn: string;
  borrowDate: Date;
  dueDate: Date;
}

// LibrarySystem.ts
import { Book, User, Loan } from "./types";

export class LibrarySystem {
  private books: Book[] = [];
  private users: User[] = [];
  private loans: Loan[] = [];
  private static userCounter = 0;

  // Book management
  addBook(
    title: string,
    author: string,
    isbn: string,
    year: number,
    genre: string,
  ): void {
    const book: Book = {
      title,
      author,
      isbn,
      year,
      genre,
      available: true,
    };
    this.books.push(book);
    console.log(`Book added: ${title}`);
    this.saveToFile("books.txt", JSON.stringify(book));
  }

  removeBook(isbn: string): void {
    this.books = this.books.filter((b) => b.isbn !== isbn);
    console.log(`Book removed: ${isbn}`);
    this.saveToFile("removed_books.txt", isbn);
  }

  searchBooks(query: string, searchType: string): Book[] {
    const results: Book[] = [];
    const lowerQuery = query.toLowerCase();

    if (searchType === "title") {
      for (const b of this.books) {
        if (b.title.toLowerCase().includes(lowerQuery)) {
          results.push(b);
        }
      }
    } else if (searchType === "author") {
      for (const b of this.books) {
        if (b.author.toLowerCase().includes(lowerQuery)) {
          results.push(b);
        }
      }
    } else if (searchType === "genre") {
      for (const b of this.books) {
        if (b.genre.toLowerCase().includes(lowerQuery)) {
          results.push(b);
        }
      }
    }
    return results;
  }

  // User management
  registerUser(name: string, email: string | null, phone: string | null): void {
    LibrarySystem.userCounter++;
    const user: User = {
      id: `U${LibrarySystem.userCounter}`,
      name,
      email,
      phone,
      loanCount: 0,
    };
    this.users.push(user);
    console.log(`User registered: ${name}`);

    if (email) {
      this.sendWelcomeEmail(email, name);
    }
  }

  private sendWelcomeEmail(email: string, name: string): void {
    // SMTP logic
    console.log(`Sending email to ${email} welcome ${name}`);
  }

  // Loan management
  borrowBook(userId: string, isbn: string): void {
    const user = this.findUserById(userId);
    const book = this.findBookByIsbn(isbn);

    if (!user) {
      console.log("User not found");
      return;
    }
    if (!book) {
      console.log("Book not found");
      return;
    }
    if (!book.available) {
      console.log("Book not available");
      return;
    }
    if (user.loanCount >= 5) {
      console.log("User has reached maximum loans");
      return;
    }

    book.available = false;
    const loan: Loan = {
      userId,
      isbn,
      borrowDate: new Date(),
      dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
    };
    this.loans.push(loan);
    user.loanCount++;

    console.log(`Book borrowed: ${book.title} by ${user.name}`);

    // Send notification
    if (user.email) {
      console.log(`Sending email to ${user.email}: you borrowed ${book.title}`);
    } else if (user.phone) {
      console.log(`Sending SMS to ${user.phone}: you borrowed ${book.title}`);
    }
  }

  returnBook(userId: string, isbn: string): void {
    const loan = this.findLoan(userId, isbn);
    if (!loan) {
      console.log("Loan not found");
      return;
    }

    const book = this.findBookByIsbn(isbn);
    const user = this.findUserById(userId);

    if (book) book.available = true;
    this.loans = this.loans.filter(
      (l) => !(l.userId === userId && l.isbn === isbn),
    );
    if (user) user.loanCount--;

    // Calculate fine
    const today = new Date();
    const daysLate = Math.floor(
      (today.getTime() - loan.dueDate.getTime()) / (1000 * 60 * 60 * 24),
    );

    if (daysLate > 0) {
      const fine = daysLate * 10;
      console.log(`Fine: ${fine}`);
      this.saveFine(userId, fine);
    }

    console.log(`Book returned: ${book?.title}`);
  }

  private saveFine(userId: string, amount: number): void {
    console.log(`Saving fine to file: user=${userId} amount=${amount}`);
  }

  // Reports
  generateReport(reportType: string): void {
    if (reportType === "books") {
      console.log("=== Books Report ===");
      for (const b of this.books) {
        console.log(`${b.title} - ${b.available ? "Available" : "Borrowed"}`);
      }
    } else if (reportType === "users") {
      console.log("=== Users Report ===");
      for (const u of this.users) {
        console.log(`${u.name} - ${u.loanCount} loans`);
      }
    } else if (reportType === "loans") {
      console.log("=== Loans Report ===");
      for (const l of this.loans) {
        console.log(`User: ${l.userId} Book: ${l.isbn}`);
      }
    } else if (reportType === "overdue") {
      console.log("=== Overdue Books ===");
      const today = new Date();
      for (const l of this.loans) {
        if (today > l.dueDate) {
          console.log(`User: ${l.userId} Book: ${l.isbn}`);
        }
      }
    }
  }

  // Helper methods
  private findUserById(id: string): User | undefined {
    return this.users.find((u) => u.id === id);
  }

  private findBookByIsbn(isbn: string): Book | undefined {
    return this.books.find((b) => b.isbn === isbn);
  }

  private findLoan(userId: string, isbn: string): Loan | undefined {
    return this.loans.find((l) => l.userId === userId && l.isbn === isbn);
  }

  private saveToFile(filename: string, data: string): void {
    // File writing logic
    console.log(`[DEBUG] Would save to ${filename}: ${data}`);
  }
}

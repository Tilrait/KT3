## S — Принцип единой ответственности (SRP)
`LibrarySystem` делает слишком много разных ролей: управление книгами, пользователями, выдачами и возвратами, уведомления и т.д.

Ну вот `addBook` например создает одновременно сущности книг, что-то с консолью делает, вызывает сохранение данных за пределами оперативной памяти.
```ts
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
```

Уведомления в `borrowBook` делают две разные по смыслу задачи одновременно: доменная логика выдачи (“правила библиотеки”) и уведомления.

```ts
borrowBook(userId: string, isbn: string): void {
  ...
  this.loans.push(loan);
  user.loanCount++;

  console.log(`Book borrowed: ${book.title} by ${user.name}`);

  // Send notification
  if (user.email) {
    console.log(
      `Sending email to ${user.email}: you borrowed ${book.title}`,
    );
  } else if (user.phone) {
    console.log(
      `Sending SMS to ${user.phone}: you borrowed ${book.title}`,
    );
  }
}
```

`returnBook` делает и возврат, и расчет штрафа, и сохранение штрафа.

```ts
returnBook(userId: string, isbn: string): void {
  ...
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
}
```

## O — Принцип открытости/закрытости (OCP)
Нарушается потому что методы зависят от типов, переданных строками, и реализованы через `if/else`, поэтому при добавлении новых типов поведения придется менять существующий код.

```ts
searchBooks(query: string, searchType: string): Book[] {
  ...
  if (searchType === "title") {
    ...
  } else if (searchType === "author") {
    ...
  } else if (searchType === "genre") {
    ...
  }
  return results;
}
```

`generateReport`: новый `reportType` потребует правок внутри этого метода.

```ts
generateReport(reportType: string): void {
  if (reportType === "books") {
    ...
  } else if (reportType === "users") {
    ...
  } else if (reportType === "loans") {
    ...
  } else if (reportType === "overdue") {
    ...
  }
}
```

## I — Принцип разделения интерфейсов (ISP)
Нету разбиения на интерфейсы и клиентские роли: все предоставляет один класс и сразу (LibrarySystem). Любой читатель такого класса потенциально зависит от методов, которыми не пользуется, границы размыты.

D — Принцип инверсии зависимостей (DIP)
Класс напрямую содержит детали реализации внешних действий и инфраструктуры, поэтому нужно зависеть от абстракций.

Идея: абстракция типа “умей отправлять уведомление” / “умей сохранять данные”, а у нас “отправь email” или “сохрани в файл `books.txt`”.

Сохранение в файл в `LibrarySystem`:

```ts
private saveToFile(filename: string, data: string): void {
  // File writing logic
  console.log(`[DEBUG] Would save to ${filename}: ${data}`);
}
```

Уведомление email/SMS также прямо прописаны конкретные ветки/способы без возможности легко подключить другой вариант:

```ts
if (user.email) {
  console.log(`Sending email to ${user.email}: you borrowed ${book.title}`);
} else if (user.phone) {
  console.log(`Sending SMS to ${user.phone}: you borrowed ${book.title}`);
}
```

`sendWelcomeEmail` является конкретной реализацией внутри того же класса:

```ts
private sendWelcomeEmail(email: string, name: string): void {
  // SMTP logic
  console.log(`Sending email to ${email} welcome ${name}`);
}
```

## L — Принцип подстановки Барбары Лисков (LSP)
Наследуемые классы должны дополнять, а не замещать поведение родительских классов, чтобы работа программы не нарушалась при замене базового типа на подтип. Но тут явного наследования нет.
`User` используется как "структура данных", а не как полиморфный объект.

`borrowBook` напрямую читает/меняет поля:
- читает `user.loanCount`
- увеличивает `user.loanCount++`
- читает `user.email / user.phone`
- читает `user.name`
Если добавить наследника, проблемы возможны не из-за того, что подкласс может изменить поведение, смысл полей или их доступность к изменению.
loanCount перестанет быть “обычным числом с обычной семантикой”.
Например, loanCount сделать вычисляемым (getter) или “с запретом увеличения”.
Тогда `user.loanCount++` может:
- не сработать как ожидается;
- выбросить ошибку;
- считать иначе, чем ожидает базовый код (и тогда логика “максимум 5” станет неправильной).
Инварианты “максимум 5 выдач” или смысл loanCount будут другими.
Если у подкласса loanCount означает “все когда-либо взятые”, а не “активные”, то проверка if (user.loanCount >= 5) будет давать другой результат.
Это нарушит LSP, потому что код borrowBook предполагает одинаковый смысл loanCount.
email/phone могут стать “не-null/не-null” иначе, или добавятся побочные эффекты.
Например, email/phone в наследнике возвращают не то, что ожидалось, или внутри getter есть логика/исключения.

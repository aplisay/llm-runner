const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcrypt');

// Initialize the SQLite database
const db = new sqlite3.Database(':memory:', (err) => {
  if (err) {
    console.error(err.message);
  } else {
    console.log('Connected to the in-memory SQLite database.');
  }
});

// Create tables
db.serialize(() => {
  db.run(`CREATE TABLE customers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    account_number TEXT NOT NULL UNIQUE,
    balance REAL NOT NULL
  )`);

  db.run(`CREATE TABLE challenge_questions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    customer_id INTEGER NOT NULL,
    question TEXT NOT NULL,
    hashed_answer TEXT NOT NULL,
    FOREIGN KEY (customer_id) REFERENCES customers(id)
  )`);
});

class BankCustomer {
  constructor(firstName, lastName, accountNumber, balance) {
    this.firstName = firstName;
    this.lastName = lastName;
    this.accountNumber = accountNumber;
    this.balance = balance;
  }

  save(callback) {
    const query = `INSERT INTO customers (first_name, last_name, account_number, balance) VALUES (?, ?, ?, ?)`;
    const values = [this.firstName, this.lastName, this.accountNumber, this.balance];

    db.run(query, values, function (err) {
      if (err) {
        return callback(err);
      }
      callback(null, this.lastID); // Return the id of the inserted customer
    });
  }

  addChallengeQuestion(question, answer, callback) {
    bcrypt.hash(answer, 10, (err, hashedAnswer) => {
      if (err) {
        return callback(err);
      }
      const query = `INSERT INTO challenge_questions (customer_id, question, hashed_answer) VALUES (?, ?, ?)`;
      const values = [this.id, question, hashedAnswer];

      db.run(query, values, (err) => {
        callback(err);
      });
    });
  }

  getChallengeQuestions(callback) {
    const query = `SELECT question FROM challenge_questions WHERE customer_id = ?`;
    const values = [this.id];

    db.all(query, values, (err, rows) => {
      if (err) {
        return callback(err);
      }
      const questions = rows.map(row => row.question);
      callback(null, questions);
    });
  }

  verifyChallengeQuestion(question, answer, callback) {
    const query = `SELECT hashed_answer FROM challenge_questions WHERE customer_id = ? AND question = ?`;
    const values = [this.id, question];

    db.get(query, values, (err, row) => {
      if (err) {
        return callback(err);
      }
      if (row) {
        bcrypt.compare(answer, row.hashed_answer, (err, result) => {
          callback(err, result);
        });
      } else {
        callback(null, false); // Question not found
      }
    });
  }
}

// Example usage
const customer1 = new BankCustomer('John', 'Doe', '123456789', 1000);
customer1.save((err, customerId) => {
  if (err) {
    return console.error(err.message);
  }
  customer1.id = customerId;

  customer1.addChallengeQuestion('What is your mother\'s maiden name?', 'Smith', (err) => {
    if (err) {
      return console.error(err.message);
    }

    customer1.addChallengeQuestion('What was the name of your first pet?', 'Buddy', (err) => {
      if (err) {
        return console.error(err.message);
      }

      customer1.getChallengeQuestions((err, questions) => {
        if (err) {
          return console.error(err.message);
        }
        console.log(questions);

        customer1.verifyChallengeQuestion('What is your mother\'s maiden name?', 'Smith', (err, isVerified) => {
          if (err) {
            return console.error(err.message);
          }
          console.log(isVerified); // Output: true or false
        });
      });
    });
  });
});
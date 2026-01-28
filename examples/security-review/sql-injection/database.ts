// Vulnerable database access layer
const db = {
  query: (sql: string) => {
    // Simulated database query
    return Promise.resolve([]);
  },
};

export function getUser(id: string) {
  // VULNERABLE: SQL injection via string concatenation
  const query = `SELECT * FROM users WHERE id = '${id}'`;
  return db.query(query);
}

export function searchUsers(name: string) {
  // VULNERABLE: Another SQL injection example
  const query = 'SELECT * FROM users WHERE name LIKE "%' + name + '%"';
  return db.query(query);
}

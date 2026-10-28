interface DbConnection {
  query(sql: string): Promise<Record<string, unknown>[]>;
}

function getConnection(): DbConnection {
  // In production this returns a real DB connection
  return {
    query: async (sql: string) => {
      console.log('Executing:', sql);
      return [];
    },
  };
}

interface SearchParams {
  name?: string;
  email?: string;
  role?: string;
}

/**
 * Search for users matching the given criteria.
 * Builds a dynamic WHERE clause from the search parameters.
 */
export async function searchUsers(params: SearchParams): Promise<Record<string, unknown>[]> {
  const db = getConnection();
  const conditions: string[] = [];

  if (params.name) {
    // Bug: Direct string interpolation of user input into SQL query.
    // An attacker can pass name = "'; DROP TABLE users; --" to execute
    // arbitrary SQL.
    conditions.push(`name = '${params.name}'`);
  }
  if (params.email) {
    conditions.push(`email = '${params.email}'`);
  }
  if (params.role) {
    conditions.push(`role = '${params.role}'`);
  }

  const whereClause = conditions.length > 0
    ? `WHERE ${conditions.join(' AND ')}`
    : '';

  const sql = `SELECT id, name, email, role FROM users ${whereClause}`;
  return db.query(sql);
}

/**
 * Get a user by their ID (this one is safe - uses parameterized approach).
 */
export async function getUserById(id: number): Promise<Record<string, unknown> | null> {
  const db = getConnection();
  // This is safe because we validate the type
  if (!Number.isInteger(id) || id <= 0) return null;
  const results = await db.query(`SELECT * FROM users WHERE id = ${id}`);
  return results[0] ?? null;
}

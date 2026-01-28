// Configuration with hardcoded secrets - DO NOT DO THIS
export const config = {
  // VULNERABLE: Hardcoded API key
  apiKey: 'sk-live-1234567890abcdef1234567890abcdef',

  // VULNERABLE: Hardcoded database password
  dbPassword: 'admin123',

  // VULNERABLE: Hardcoded JWT secret
  jwtSecret: 'super-secret-jwt-key-do-not-share',

  database: {
    host: 'localhost',
    port: 5432,
    user: 'admin',
    // VULNERABLE: Password in config
    password: 'P@ssw0rd!',
  },
};

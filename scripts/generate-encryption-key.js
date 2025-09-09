#!/usr/bin/env node

/**
 * Generate a secure encryption key for GitHub tokens
 * Run: node scripts/generate-encryption-key.js
 * Then set: export TOKEN_ENCRYPTION_KEY="<generated-key>"
 */

const crypto = require("crypto");

function generateEncryptionKey() {
  const key = crypto.randomBytes(32).toString("base64");
  console.log("Generated encryption key for TOKEN_ENCRYPTION_KEY:");
  console.log(key);
  console.log("\nAdd this to your environment variables:");
  console.log(`export TOKEN_ENCRYPTION_KEY="${key}"`);
  console.log("\nOr add to your .env file:");
  console.log(`TOKEN_ENCRYPTION_KEY="${key}"`);
}

generateEncryptionKey();

import { env } from "./config/env";

console.log("Environment configuration loaded successfully.");

console.log({
  NODE_ENV: env.NODE_ENV,
  PORT: env.PORT,
  MONGODB_URI: env.MONGODB_URI,
  CLIENT_URL: env.CLIENT_URL,
  ACCESS_TOKEN_TTL: env.ACCESS_TOKEN_TTL,
  BCRYPT_ROUNDS: env.BCRYPT_ROUNDS,
});
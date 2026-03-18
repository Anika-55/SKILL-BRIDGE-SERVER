import "dotenv/config";

type EnvConfig = {
  port: number;
  databaseUrl: string;
  jwtSecret: string;
  nodeEnv: string;
};

const required = (key: string): string => {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
};

const env: EnvConfig = {
  port: Number(process.env.PORT ?? 4000),
  databaseUrl: required("DATABASE_URL"),
  jwtSecret: required("JWT_SECRET"),
  nodeEnv: process.env.NODE_ENV ?? "development",
};

export default env;

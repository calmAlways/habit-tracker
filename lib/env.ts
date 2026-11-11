function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export const APP_PASSWORD = () => required("APP_PASSWORD");
export const AUTH_SECRET = () => required("AUTH_SECRET");
export const APP_ORIGIN = () => required("APP_ORIGIN");
export const DATABASE_URL = () => required("DATABASE_URL");
export const isSecureOrigin = () => APP_ORIGIN().startsWith("https://");

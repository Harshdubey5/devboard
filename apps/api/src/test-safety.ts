
const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is missing. Tests were not started.");
}

const databaseName = new URL(connectionString).pathname
  .replace(/^\//, "");

if (databaseName !== "devboard_test") {
  throw new Error(
    `Unsafe test database "${databaseName}". Tests must use "devboard_test".`,
  );
}
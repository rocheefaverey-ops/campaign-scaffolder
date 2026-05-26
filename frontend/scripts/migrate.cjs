const { drizzle } = require("drizzle-orm/node-postgres");
const { migrate } = require("drizzle-orm/node-postgres/migrator");
const { Client } = require("pg");

async function main() {
  const client = new Client({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT || 5432),
    database: process.env.DB_DATABASE,
    user: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
  });

  await client.connect();
  const db = drizzle(client);

  try {
    await migrate(db, { migrationsFolder: "./drizzle/migrations" });
    console.log("Migrations applied successfully");
  } catch (error) {
    console.error("Migration failed:", error.message);
    if (error.cause) console.error("Cause:", error.cause.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

main();

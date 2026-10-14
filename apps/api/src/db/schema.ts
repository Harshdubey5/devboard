
import {
  pgTable,
  serial,
  text,
  varchar,
} from "drizzle-orm/pg-core";

export const projects = pgTable("projects", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 120 }).notNull(),
  description: text("description").notNull(),
  status: varchar("status", { length: 20 })
    .notNull()
    .default("active"),
});
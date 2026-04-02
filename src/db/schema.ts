import {
  pgTable,
  uuid,
  text,
  bigint,
  numeric,
  timestamp,
  jsonb,
  pgEnum,
} from "drizzle-orm/pg-core";

export const peopleRecordingSourceEnum = pgEnum("people_recording_source", [
  "manual",
  "transcript",
]);

export const recordings = pgTable("recordings", {
  id: uuid("id").defaultRandom().primaryKey(),
  filePath: text("file_path").notNull(),
  filename: text("filename").notNull(),
  fileSize: bigint("file_size", { mode: "number" }),
  durationSeconds: numeric("duration_seconds"),
  codec: text("codec"),
  resolution: text("resolution"),
  fps: numeric("fps"),
  container: text("container"),
  fileCreatedAt: timestamp("file_created_at"),
  offloadedAt: timestamp("offloaded_at").defaultNow(),
  sourceDrive: text("source_drive"),
  destDrive: text("dest_drive"),
  notes: text("notes"),
  checksum: text("checksum"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const transcripts = pgTable("transcripts", {
  id: uuid("id").defaultRandom().primaryKey(),
  recordingId: uuid("recording_id")
    .references(() => recordings.id, { onDelete: "cascade" })
    .notNull(),
  fullText: text("full_text"),
  segments: jsonb("segments"),
  language: text("language"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const people = pgTable("people", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull().unique(),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const peopleRecordings = pgTable("people_recordings", {
  id: uuid("id").defaultRandom().primaryKey(),
  personId: uuid("person_id")
    .references(() => people.id, { onDelete: "cascade" })
    .notNull(),
  recordingId: uuid("recording_id")
    .references(() => recordings.id, { onDelete: "cascade" })
    .notNull(),
  source: peopleRecordingSourceEnum("source").notNull().default("manual"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const drives = pgTable("drives", {
  id: uuid("id").defaultRandom().primaryKey(),
  label: text("label").notNull(),
  serial: text("serial"),
  capacityBytes: bigint("capacity_bytes", { mode: "number" }),
  lastSeenAt: timestamp("last_seen_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

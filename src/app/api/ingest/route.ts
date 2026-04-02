import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { recordings, drives } from "@/db/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { requireApiKey, jsonError } from "@/lib/api";

const recordingSchema = z.object({
  file_path: z.string(),
  filename: z.string(),
  file_size: z.number().optional(),
  duration_seconds: z.number().optional(),
  codec: z.string().optional(),
  resolution: z.string().optional(),
  fps: z.number().optional(),
  container: z.string().optional(),
  file_created_at: z.string().optional(),
  source_drive: z.string().optional(),
  dest_drive: z.string().optional(),
  notes: z.string().optional(),
  checksum: z.string().optional(),
});

const ingestSchema = z.array(recordingSchema).min(1).max(1000);

export async function POST(req: NextRequest) {
  try {
    const authError = requireApiKey(req);
    if (authError) return authError;

    const body = await req.json();
    const parsed = ingestSchema.safeParse(body);
    if (!parsed.success) {
      return jsonError(`Invalid input: ${parsed.error.message}`, 400);
    }

    const items = parsed.data;
    let inserted = 0;
    let skipped = 0;

    // Collect unique dest drives to upsert
    const driveLabels = new Set<string>();
    for (const item of items) {
      if (item.dest_drive) driveLabels.add(item.dest_drive);
    }
    for (const label of driveLabels) {
      const existing = await db
        .select()
        .from(drives)
        .where(eq(drives.label, label))
        .limit(1);
      if (existing.length === 0) {
        await db.insert(drives).values({ label, lastSeenAt: new Date() });
      } else {
        await db
          .update(drives)
          .set({ lastSeenAt: new Date() })
          .where(eq(drives.label, label));
      }
    }

    for (const item of items) {
      // Upsert by checksum if provided
      if (item.checksum) {
        const existing = await db
          .select()
          .from(recordings)
          .where(eq(recordings.checksum, item.checksum))
          .limit(1);
        if (existing.length > 0) {
          // Update existing
          await db
            .update(recordings)
            .set({
              filePath: item.file_path,
              filename: item.filename,
              fileSize: item.file_size ?? null,
              durationSeconds: item.duration_seconds?.toString() ?? null,
              codec: item.codec ?? null,
              resolution: item.resolution ?? null,
              fps: item.fps?.toString() ?? null,
              container: item.container ?? null,
              fileCreatedAt: item.file_created_at
                ? new Date(item.file_created_at)
                : null,
              sourceDrive: item.source_drive ?? null,
              destDrive: item.dest_drive ?? null,
              notes: item.notes ?? null,
              updatedAt: new Date(),
            })
            .where(eq(recordings.checksum, item.checksum));
          skipped++;
          continue;
        }
      }

      await db.insert(recordings).values({
        filePath: item.file_path,
        filename: item.filename,
        fileSize: item.file_size ?? null,
        durationSeconds: item.duration_seconds?.toString() ?? null,
        codec: item.codec ?? null,
        resolution: item.resolution ?? null,
        fps: item.fps?.toString() ?? null,
        container: item.container ?? null,
        fileCreatedAt: item.file_created_at
          ? new Date(item.file_created_at)
          : null,
        sourceDrive: item.source_drive ?? null,
        destDrive: item.dest_drive ?? null,
        notes: item.notes ?? null,
        checksum: item.checksum ?? null,
      });
      inserted++;
    }

    return NextResponse.json({ inserted, updated: skipped, total: items.length });
  } catch (error) {
    console.error("Ingest error:", error);
    return jsonError("Internal server error", 500);
  }
}

import { NextResponse } from "next/server";
import { db } from "@/db";
import { drives, recordings } from "@/db/schema";
import { sql, eq, desc } from "drizzle-orm";
import { jsonError } from "@/lib/api";

export async function GET() {
  try {
    const result = await db
      .select({
        id: drives.id,
        label: drives.label,
        serial: drives.serial,
        capacityBytes: drives.capacityBytes,
        lastSeenAt: drives.lastSeenAt,
        createdAt: drives.createdAt,
        recordingCount: sql<number>`count(${recordings.id})::int`,
        totalSize: sql<number>`coalesce(sum(${recordings.fileSize}), 0)::bigint`,
        earliestRecording: sql<string>`min(${recordings.offloadedAt})`,
        latestRecording: sql<string>`max(${recordings.offloadedAt})`,
      })
      .from(drives)
      .leftJoin(recordings, eq(recordings.destDrive, drives.label))
      .groupBy(drives.id)
      .orderBy(desc(drives.lastSeenAt));

    return NextResponse.json({ data: result });
  } catch (error) {
    console.error("Drives list error:", error);
    return jsonError("Internal server error", 500);
  }
}

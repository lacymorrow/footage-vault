import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { recordings } from "@/db/schema";
import { eq, and, gte, lte, ilike, or, sql, desc } from "drizzle-orm";
import { jsonError } from "@/lib/api";

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const drive = url.searchParams.get("drive");
    const after = url.searchParams.get("after");
    const before = url.searchParams.get("before");
    const codec = url.searchParams.get("codec");
    const container = url.searchParams.get("container");
    const q = url.searchParams.get("q");
    const page = Math.max(1, parseInt(url.searchParams.get("page") ?? "1"));
    const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get("limit") ?? "50")));
    const offset = (page - 1) * limit;

    const conditions = [];
    if (drive) conditions.push(eq(recordings.destDrive, drive));
    if (after) conditions.push(gte(recordings.offloadedAt, new Date(after)));
    if (before) conditions.push(lte(recordings.offloadedAt, new Date(before)));
    if (codec) conditions.push(eq(recordings.codec, codec));
    if (container) conditions.push(eq(recordings.container, container));
    if (q) {
      conditions.push(
        or(
          ilike(recordings.filename, `%${q}%`),
          ilike(recordings.notes, `%${q}%`)
        )
      );
    }

    const where = conditions.length > 0 ? and(...conditions) : undefined;

    const [data, countResult] = await Promise.all([
      db
        .select()
        .from(recordings)
        .where(where)
        .orderBy(desc(recordings.offloadedAt))
        .limit(limit)
        .offset(offset),
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(recordings)
        .where(where),
    ]);

    const total = countResult[0]?.count ?? 0;

    return NextResponse.json({
      data,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Recordings list error:", error);
    return jsonError("Internal server error", 500);
  }
}

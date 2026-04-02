export const dynamic = "force-dynamic";
import { db } from "@/db";
import { recordings } from "@/db/schema";
import { desc, eq, gte, lte, ilike, or, and, sql } from "drizzle-orm";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { RecordingsFilter } from "@/components/recordings-filter";


function formatDuration(seconds: string | null): string {
  if (!seconds) return "-";
  const s = parseFloat(seconds);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = Math.floor(s % 60);
  if (h > 0) return `${h}h ${m}m ${sec}s`;
  if (m > 0) return `${m}m ${sec}s`;
  return `${sec}s`;
}

function formatBytes(bytes: number | null): string {
  if (!bytes) return "-";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}

export default async function RecordingsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | undefined }>;
}) {
  const params = await searchParams;
  const page = Math.max(1, parseInt(params.page ?? "1"));
  const limit = 50;
  const offset = (page - 1) * limit;

  const conditions = [];
  if (params.drive) conditions.push(eq(recordings.destDrive, params.drive));
  if (params.codec) conditions.push(eq(recordings.codec, params.codec));
  if (params.container)
    conditions.push(eq(recordings.container, params.container));
  if (params.after)
    conditions.push(gte(recordings.offloadedAt, new Date(params.after)));
  if (params.before)
    conditions.push(lte(recordings.offloadedAt, new Date(params.before)));
  if (params.q) {
    conditions.push(
      or(
        ilike(recordings.filename, `%${params.q}%`),
        ilike(recordings.notes, `%${params.q}%`)
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
  const totalPages = Math.ceil(total / limit);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Recordings</h1>
        <p className="text-muted-foreground">
          {total.toLocaleString()} recording{total !== 1 ? "s" : ""} found
        </p>
      </div>

      <RecordingsFilter />

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Filename</TableHead>
              <TableHead>Duration</TableHead>
              <TableHead>Codec</TableHead>
              <TableHead>Resolution</TableHead>
              <TableHead>Size</TableHead>
              <TableHead>Drive</TableHead>
              <TableHead>Offloaded</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={7}
                  className="text-center py-8 text-muted-foreground"
                >
                  No recordings found
                </TableCell>
              </TableRow>
            ) : (
              data.map((r) => (
                <TableRow key={r.id} className="cursor-pointer">
                  <TableCell>
                    <Link
                      href={`/recordings/${r.id}`}
                      className="hover:underline font-medium"
                    >
                      {r.filename}
                    </Link>
                  </TableCell>
                  <TableCell className="font-mono text-sm">
                    {formatDuration(r.durationSeconds)}
                  </TableCell>
                  <TableCell>
                    {r.codec && <Badge variant="secondary">{r.codec}</Badge>}
                  </TableCell>
                  <TableCell className="text-sm">{r.resolution ?? "-"}</TableCell>
                  <TableCell className="text-sm">
                    {formatBytes(r.fileSize)}
                  </TableCell>
                  <TableCell className="text-sm">
                    {r.destDrive ?? "-"}
                  </TableCell>
                  <TableCell className="text-sm">
                    {r.offloadedAt
                      ? new Date(r.offloadedAt).toLocaleDateString()
                      : "-"}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Page {page} of {totalPages}
          </p>
          <div className="flex gap-2">
            {page > 1 && (
              <Link
                href={`/recordings?page=${page - 1}`}
                className="px-3 py-1 border rounded text-sm hover:bg-accent"
              >
                Previous
              </Link>
            )}
            {page < totalPages && (
              <Link
                href={`/recordings?page=${page + 1}`}
                className="px-3 py-1 border rounded text-sm hover:bg-accent"
              >
                Next
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

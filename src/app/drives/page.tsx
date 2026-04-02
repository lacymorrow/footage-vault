export const dynamic = "force-dynamic";
import { db } from "@/db";
import { drives, recordings } from "@/db/schema";
import { sql, eq, desc } from "drizzle-orm";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { HardDrive } from "lucide-react";


function formatBytes(bytes: number | null): string {
  if (!bytes || bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB", "PB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

export default async function DrivesPage() {
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Drives</h1>
        <p className="text-muted-foreground">
          {result.length} drive{result.length !== 1 ? "s" : ""} in inventory
        </p>
      </div>

      {result.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            No drives registered yet. Drives are created automatically when you
            ingest footage.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {result.map((d) => (
            <Card key={d.id}>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <HardDrive className="h-5 w-5" />
                  {d.label}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Recordings</span>
                  <span className="font-medium">{d.recordingCount}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total Size</span>
                  <span className="font-medium font-mono">
                    {formatBytes(Number(d.totalSize))}
                  </span>
                </div>
                {d.capacityBytes && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Capacity</span>
                    <span className="font-medium font-mono">
                      {formatBytes(d.capacityBytes)}
                    </span>
                  </div>
                )}
                {d.serial && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Serial</span>
                    <span className="font-mono text-xs">{d.serial}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Date Range</span>
                  <span className="text-xs">
                    {d.earliestRecording
                      ? new Date(d.earliestRecording).toLocaleDateString()
                      : "-"}{" "}
                    to{" "}
                    {d.latestRecording
                      ? new Date(d.latestRecording).toLocaleDateString()
                      : "-"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Last Seen</span>
                  <span className="text-xs">
                    {d.lastSeenAt
                      ? new Date(d.lastSeenAt).toLocaleDateString()
                      : "-"}
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

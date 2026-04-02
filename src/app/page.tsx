export const dynamic = "force-dynamic";
import { db } from "@/db";
import { recordings, drives, people } from "@/db/schema";
import { sql, desc } from "drizzle-orm";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Film, HardDrive, Users, Database } from "lucide-react";
import Link from "next/link";
import { SearchBar } from "@/components/search-bar";


async function getStats() {
  const [recordingStats, driveCount, peopleCount, recentRecordings] =
    await Promise.all([
      db
        .select({
          count: sql<number>`count(*)::int`,
          totalSize: sql<number>`coalesce(sum(${recordings.fileSize}), 0)::bigint`,
        })
        .from(recordings),
      db.select({ count: sql<number>`count(*)::int` }).from(drives),
      db.select({ count: sql<number>`count(*)::int` }).from(people),
      db
        .select()
        .from(recordings)
        .orderBy(desc(recordings.offloadedAt))
        .limit(10),
    ]);

  return {
    totalRecordings: recordingStats[0]?.count ?? 0,
    totalSize: Number(recordingStats[0]?.totalSize ?? 0),
    driveCount: driveCount[0]?.count ?? 0,
    peopleCount: peopleCount[0]?.count ?? 0,
    recent: recentRecordings,
  };
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB", "PB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

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

export default async function DashboardPage() {
  const stats = await getStats();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold mb-2">Footage Vault</h1>
        <p className="text-muted-foreground">
          Search and manage your footage library
        </p>
      </div>

      <SearchBar />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              Total Recordings
            </CardTitle>
            <Film className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.totalRecordings.toLocaleString()}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Size</CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatBytes(stats.totalSize)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Drives</CardTitle>
            <HardDrive className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.driveCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">People</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.peopleCount}</div>
          </CardContent>
        </Card>
      </div>

      <div>
        <h2 className="text-xl font-semibold mb-4">Recent Offloads</h2>
        {stats.recent.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              No recordings yet. Use the CLI to scan and ingest footage.
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-2">
            {stats.recent.map((r) => (
              <Link key={r.id} href={`/recordings/${r.id}`}>
                <Card className="hover:bg-accent/50 transition-colors cursor-pointer">
                  <CardContent className="flex items-center justify-between py-3">
                    <div className="flex items-center gap-3">
                      <Film className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="font-medium text-sm">{r.filename}</p>
                        <p className="text-xs text-muted-foreground">
                          {r.codec} {r.resolution}{" "}
                          {r.destDrive && `on ${r.destDrive}`}
                        </p>
                      </div>
                    </div>
                    <div className="text-right text-sm text-muted-foreground">
                      <p>{formatDuration(r.durationSeconds)}</p>
                      <p>
                        {r.offloadedAt
                          ? new Date(r.offloadedAt).toLocaleDateString()
                          : ""}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

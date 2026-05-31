import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid,
  AreaChart, Area, PieChart, Pie, Cell, Legend,
} from "recharts";
import { Users, LogIn, Activity, Globe, Monitor, MapPin } from "lucide-react";

type Session = {
  login_at: string;
  last_seen_at: string;
  logout_at?: string | null;
  ip_address?: string | null;
  device?: string | null;
  browser?: string | null;
  os?: string | null;
  country?: string | null;
  city?: string | null;
};
type UserRow = {
  id: string;
  email: string;
  full_name: string | null;
  sessions: Session[];
};

const COLORS = ["#2563eb", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4", "#ec4899", "#84cc16"];

function topCounts<T extends string>(arr: (T | null | undefined)[], n = 6) {
  const m = new Map<string, number>();
  arr.forEach((v) => {
    const k = (v && String(v).trim()) || "Unknown";
    m.set(k, (m.get(k) ?? 0) + 1);
  });
  return [...m.entries()]
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, n);
}

export function AdminDashboard({ users }: { users: UserRow[] }) {
  const stats = useMemo(() => {
    const allSessions: (Session & { user: string })[] = users.flatMap((u) =>
      u.sessions.map((s) => ({ ...s, user: u.email })),
    );
    const now = Date.now();
    const dayMs = 86400000;

    const logins24h = allSessions.filter((s) => now - new Date(s.login_at).getTime() < dayMs).length;
    const logins7d = allSessions.filter((s) => now - new Date(s.login_at).getTime() < 7 * dayMs).length;
    const logins30d = allSessions.filter((s) => now - new Date(s.login_at).getTime() < 30 * dayMs).length;

    const active = allSessions.filter(
      (s) => !s.logout_at && now - new Date(s.last_seen_at).getTime() < 15 * 60 * 1000,
    ).length;

    const uniqueUsers7d = new Set(
      allSessions.filter((s) => now - new Date(s.login_at).getTime() < 7 * dayMs).map((s) => s.user),
    ).size;

    // Daily logins last 14 days
    const days: { date: string; logins: number }[] = [];
    for (let i = 13; i >= 0; i--) {
      const d = new Date(now - i * dayMs);
      const key = d.toISOString().slice(0, 10);
      days.push({
        date: d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }),
        logins: allSessions.filter((s) => s.login_at.slice(0, 10) === key).length,
      });
    }

    // Hourly distribution (0-23h) across all logins
    const hours = Array.from({ length: 24 }, (_, h) => ({ hour: `${h}h`, logins: 0 }));
    allSessions.forEach((s) => {
      const h = new Date(s.login_at).getHours();
      hours[h].logins++;
    });

    const countries = topCounts(allSessions.map((s) => s.country));
    const cities = topCounts(allSessions.map((s) => s.city), 8);
    const devices = topCounts(allSessions.map((s) => s.device));
    const browsers = topCounts(allSessions.map((s) => s.browser));
    const oses = topCounts(allSessions.map((s) => s.os));

    // Top users by access count
    const topUsers = users
      .map((u) => ({
        email: u.email,
        name: u.full_name || u.email,
        accesses: u.sessions.length,
        last: u.sessions[0]?.login_at,
      }))
      .sort((a, b) => b.accesses - a.accesses)
      .slice(0, 8);

    return {
      total: allSessions.length,
      logins24h, logins7d, logins30d, active, uniqueUsers7d,
      days, hours, countries, cities, devices, browsers, oses, topUsers,
    };
  }, [users]);

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <Kpi icon={<Activity className="h-4 w-4" />} label="Active now" value={stats.active} accent="text-emerald-600" />
        <Kpi icon={<LogIn className="h-4 w-4" />} label="Logins 24h" value={stats.logins24h} accent="text-blue-600" />
        <Kpi icon={<LogIn className="h-4 w-4" />} label="Logins 7d" value={stats.logins7d} accent="text-blue-600" />
        <Kpi icon={<LogIn className="h-4 w-4" />} label="Logins 30d" value={stats.logins30d} accent="text-blue-600" />
        <Kpi icon={<Users className="h-4 w-4" />} label="Users 7d" value={stats.uniqueUsers7d} accent="text-purple-600" />
        <Kpi icon={<Activity className="h-4 w-4" />} label="Total sessions" value={stats.total} accent="text-slate-700" />
      </div>

      {/* Trend + Hourly */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle className="text-base">Logins (últimos 14 dias)</CardTitle></CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={stats.days}>
                <defs>
                  <linearGradient id="g1" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#2563eb" stopOpacity={0.5} />
                    <stop offset="100%" stopColor="#2563eb" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                <Tooltip />
                <Area type="monotone" dataKey="logins" stroke="#2563eb" fill="url(#g1)" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Horário dos acessos</CardTitle></CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.hours}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="hour" tick={{ fontSize: 10 }} interval={2} />
                <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="logins" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Geo */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><Globe className="h-4 w-4" /> Países</CardTitle></CardHeader>
          <CardContent className="h-64">
            {stats.countries.length === 0 ? <Empty /> : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.countries} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis type="number" tick={{ fontSize: 11 }} allowDecimals={false} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={100} />
                  <Tooltip />
                  <Bar dataKey="value" fill="#2563eb" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><MapPin className="h-4 w-4" /> Cidades</CardTitle></CardHeader>
          <CardContent className="h-64">
            {stats.cities.length === 0 ? <Empty /> : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.cities} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis type="number" tick={{ fontSize: 11 }} allowDecimals={false} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={120} />
                  <Tooltip />
                  <Bar dataKey="value" fill="#8b5cf6" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Devices */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <PieCard title="Dispositivos" data={stats.devices} icon={<Monitor className="h-4 w-4" />} />
        <PieCard title="Navegadores" data={stats.browsers} />
        <PieCard title="Sistemas" data={stats.oses} />
      </div>

      {/* Top users */}
      <Card>
        <CardHeader><CardTitle className="text-base">Usuários mais ativos</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-2">
            {stats.topUsers.map((u) => (
              <div key={u.email} className="flex items-center justify-between border-b border-slate-100 pb-2 last:border-0">
                <div>
                  <div className="text-sm font-medium">{u.name}</div>
                  <div className="text-xs text-slate-500">{u.email}</div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-slate-500">
                    {u.last ? new Date(u.last).toLocaleString("pt-BR") : "—"}
                  </span>
                  <Badge variant="secondary">{u.accesses} acessos</Badge>
                </div>
              </div>
            ))}
            {stats.topUsers.length === 0 && <Empty />}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function Kpi({ icon, label, value, accent }: { icon: React.ReactNode; label: string; value: number; accent: string }) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className={`flex items-center gap-1.5 text-xs ${accent}`}>{icon}<span>{label}</span></div>
        <div className="text-2xl font-bold mt-1">{value}</div>
      </CardContent>
    </Card>
  );
}

function PieCard({ title, data, icon }: { title: string; data: { name: string; value: number }[]; icon?: React.ReactNode }) {
  return (
    <Card>
      <CardHeader><CardTitle className="text-base flex items-center gap-2">{icon}{title}</CardTitle></CardHeader>
      <CardContent className="h-56">
        {data.length === 0 ? <Empty /> : (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={data} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} label={{ fontSize: 11 }}>
                {data.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip />
              <Legend wrapperStyle={{ fontSize: 11 }} />
            </PieChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}

function Empty() {
  return <div className="h-full flex items-center justify-center text-sm text-slate-400">Sem dados ainda</div>;
}

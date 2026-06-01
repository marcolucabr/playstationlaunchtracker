import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { ArrowLeft, Trash2, Plus, Shield, User as UserIcon, RefreshCw, Search } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth-context";
import {
  adminListUsers, adminCreateUser, adminDeleteUser, adminUpdateRole,
} from "@/lib/admin.functions";
import { runCollection, discoverUrls } from "@/lib/collector.functions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { AdminDashboard } from "@/components/admin/AdminDashboard";
import { UrlsManager } from "@/components/admin/UrlsManager";
import { RecentRuns } from "@/components/admin/RecentRuns";

export const Route = createFileRoute("/admin")({
  head: () => ({ meta: [{ title: "Admin Panel" }] }),
  component: AdminPage,
});

function fmtDt(s?: string | null) {
  if (!s) return "—";
  return new Date(s).toLocaleString("pt-BR");
}
function durMin(login: string, last: string, logout?: string | null) {
  const end = logout ?? last;
  const m = Math.max(0, Math.round((new Date(end).getTime() - new Date(login).getTime()) / 60000));
  if (m < 60) return `${m}m`;
  return `${Math.floor(m/60)}h ${m%60}m`;
}

function AdminPage() {
  const { isAdmin, loading, user } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const list = useServerFn(adminListUsers);
  const create = useServerFn(adminCreateUser);
  const del = useServerFn(adminDeleteUser);
  const upd = useServerFn(adminUpdateRole);

  useEffect(() => {
    if (!loading && (!user || !isAdmin)) navigate({ to: "/" });
  }, [loading, user, isAdmin, navigate]);

  const { data: users = [] } = useQuery({
    queryKey: ["admin-users"],
    queryFn: () => list({}),
    enabled: isAdmin,
  });

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ email: "", password: "", fullName: "", role: "viewer" as "admin" | "viewer" });
  const [err, setErr] = useState<string | null>(null);

  const createMut = useMutation({
    mutationFn: (d: typeof form) => create({ data: d }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-users"] }); setOpen(false); setForm({ email:"", password:"", fullName:"", role:"viewer" }); },
    onError: (e: Error) => setErr(e.message),
  });
  const delMut = useMutation({
    mutationFn: (userId: string) => del({ data: { userId } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-users"] }),
  });
  const roleMut = useMutation({
    mutationFn: (v: { userId: string; role: "admin"|"viewer" }) => upd({ data: v }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-users"] }),
  });

  const collectFn = useServerFn(runCollection);
  const collectMut = useMutation({
    mutationFn: () => collectFn({ data: {} }),
    onSuccess: (r) => {
      toast.success(`Coleta: ${r.ok} OK · ${r.blocked} bloqueados · ${r.notFound} sem preço · ${r.error} erros`);
      qc.invalidateQueries({ queryKey: ["recent-runs"] });
      qc.invalidateQueries({ queryKey: ["pru"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const discoverFn = useServerFn(discoverUrls);
  const discoverMut = useMutation({
    mutationFn: (overwrite: boolean) => discoverFn({ data: { overwrite } }),
    onSuccess: (r) => {
      toast.success(`Descoberta: ${r.found} encontrados · ${r.blocked} bloqueados · ${r.notFound} sem resultado · ${r.skipped} pulados`);
      qc.invalidateQueries({ queryKey: ["pru"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (loading || !isAdmin) {
    return <div className="min-h-screen flex items-center justify-center text-slate-500">Loading…</div>;
  }

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to="/" className="text-slate-500 hover:text-slate-900"><ArrowLeft className="h-5 w-5" /></Link>
            <h1 className="text-2xl font-bold flex items-center gap-2"><Shield className="h-6 w-6 text-blue-600" /> Admin Panel</h1>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={() => collectMut.mutate()}
              disabled={collectMut.isPending}
            >
              <RefreshCw className={`h-4 w-4 mr-1 ${collectMut.isPending ? "animate-spin" : ""}`} />
              {collectMut.isPending ? "Coletando…" : "Coletar agora"}
            </Button>
            <Dialog open={open} onOpenChange={(o) => { setOpen(o); setErr(null); }}>
              <DialogTrigger asChild>
                <Button className="bg-blue-600 hover:bg-blue-700"><Plus className="h-4 w-4 mr-1" /> New user</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Create user</DialogTitle></DialogHeader>
                <div className="space-y-3">
                  <div><Label>Full name</Label><Input value={form.fullName} onChange={(e) => setForm({...form, fullName: e.target.value})} /></div>
                  <div><Label>Email</Label><Input type="email" value={form.email} onChange={(e) => setForm({...form, email: e.target.value})} /></div>
                  <div><Label>Password</Label><Input type="text" value={form.password} onChange={(e) => setForm({...form, password: e.target.value})} placeholder="min 8 chars" /></div>
                  <div>
                    <Label>Role</Label>
                    <Select value={form.role} onValueChange={(v: "admin"|"viewer") => setForm({...form, role: v})}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="viewer">Viewer (read-only)</SelectItem>
                        <SelectItem value="admin">Admin (full access)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {err && <p className="text-sm text-destructive">{err}</p>}
                </div>
                <DialogFooter>
                  <Button onClick={() => createMut.mutate(form)} disabled={createMut.isPending} className="bg-blue-600 hover:bg-blue-700">
                    {createMut.isPending ? "Creating…" : "Create"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
          <strong>Atenção:</strong> o coletor atual usa <code>fetch</code> puro. Lojas que renderizam preço via JavaScript ou usam anti-bot (Amazon, Mercado Livre, Magalu, Americanas) provavelmente vão retornar <strong>bloqueado</strong>. Para essas, conecte o Firecrawl depois.
        </div>

        <Tabs defaultValue="dashboard" className="space-y-4">
          <TabsList>
            <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
            <TabsTrigger value="urls">URLs por loja</TabsTrigger>
            <TabsTrigger value="users">Usuários</TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard" className="space-y-4">
            <AdminDashboard users={users} />
            <RecentRuns />
          </TabsContent>

          <TabsContent value="urls">
            <UrlsManager />
          </TabsContent>

          <TabsContent value="users" className="space-y-4">




        <Card>
          <CardHeader><CardTitle className="text-base">Users ({users.length})</CardTitle></CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Last login</TableHead>
                  <TableHead>Sessions</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((u) => {
                  const last = u.sessions[0];
                  return (
                    <TableRow key={u.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="h-8 w-8 rounded-full bg-slate-200 flex items-center justify-center"><UserIcon className="h-4 w-4 text-slate-600" /></div>
                          <div>
                            <div className="font-medium">{u.full_name || u.email}</div>
                            <div className="text-xs text-slate-500">{u.email}</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Select value={u.role} onValueChange={(v: "admin"|"viewer") => roleMut.mutate({ userId: u.id, role: v })}>
                          <SelectTrigger className="w-32 h-8"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="viewer">Viewer</SelectItem>
                            <SelectItem value="admin">Admin</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell className="text-sm">
                        {last ? (
                          <div>
                            <div>{fmtDt(last.login_at)}</div>
                            <div className="text-xs text-slate-500">{last.device} · {last.browser} · {last.os}{last.country ? ` · ${last.country}` : ""}{last.ip_address ? ` · ${last.ip_address}` : ""}</div>
                          </div>
                        ) : <span className="text-slate-400">never</span>}
                      </TableCell>
                      <TableCell><Badge variant="secondary">{u.sessions.length}</Badge></TableCell>
                      <TableCell className="text-sm text-slate-500">{fmtDt(u.created_at)}</TableCell>
                      <TableCell className="text-right">
                        <Button size="sm" variant="ghost" onClick={() => { if (confirm(`Delete ${u.email}?`)) delMut.mutate(u.id); }} disabled={u.id === user?.id}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Recent activity</CardTitle></CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Login</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>Device</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>IP</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.flatMap((u) => u.sessions.slice(0, 5).map((s, i) => (
                  <TableRow key={`${u.id}-${i}`}>
                    <TableCell className="text-sm">{u.email}</TableCell>
                    <TableCell className="text-sm">{fmtDt(s.login_at)}</TableCell>
                    <TableCell className="text-sm">{durMin(s.login_at, s.last_seen_at, s.logout_at)}{!s.logout_at && <Badge variant="outline" className="ml-2 text-xs">active</Badge>}</TableCell>
                    <TableCell className="text-sm">{s.device} · {s.browser} · {s.os}</TableCell>
                    <TableCell className="text-sm">{[s.city, s.country].filter(Boolean).join(", ") || "—"}</TableCell>
                    <TableCell className="text-sm font-mono text-xs">{s.ip_address || "—"}</TableCell>
                  </TableRow>
                )))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

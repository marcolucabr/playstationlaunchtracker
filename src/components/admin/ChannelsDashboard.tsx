import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid,
  PieChart, Pie, Cell, Legend, LineChart, Line,
} from "recharts";
import { MessageSquare, Youtube, Newspaper, Twitter, Music2, Instagram, TrendingUp } from "lucide-react";
import { listChannelsData } from "@/lib/collector.functions";

const CHANNELS: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  reddit:    { label: "Reddit",      color: "#ff4500", icon: <MessageSquare className="h-3.5 w-3.5" /> },
  youtube:   { label: "YouTube",     color: "#ff0000", icon: <Youtube className="h-3.5 w-3.5" /> },
  news:      { label: "Notícias",    color: "#2563eb", icon: <Newspaper className="h-3.5 w-3.5" /> },
  twitter:   { label: "X / Twitter", color: "#0ea5e9", icon: <Twitter className="h-3.5 w-3.5" /> },
  tiktok:    { label: "TikTok",      color: "#ec4899", icon: <Music2 className="h-3.5 w-3.5" /> },
  instagram: { label: "Instagram",   color: "#d946ef", icon: <Instagram className="h-3.5 w-3.5" /> },
};
const SENTIMENT_COLORS = { positive: "#10b981", neutral: "#94a3b8", negative: "#ef4444" };

// Portuguese stopwords for topic extraction
const STOPWORDS = new Set([
  "a","o","as","os","e","ou","de","da","do","das","dos","um","uma","uns","umas",
  "para","por","com","sem","em","no","na","nos","nas","que","se","é","são","não",
  "sim","mais","menos","muito","muita","muitos","muitas","ao","à","aos","às","como",
  "quando","onde","qual","quais","seu","sua","seus","suas","este","esta","isto",
  "esse","essa","isso","aquele","aquela","aquilo","já","só","ser","ter","foi",
  "vai","ir","the","of","and","to","in","on","for","is","are","was","were","with",
  "by","at","this","that","an","be","or","from","it","as","you","your","my","we",
  "wolverine","marvel","marvels","ps5","playstation","sony","jogo","game","games",
  "br","brasil","review","análise","análises","novo","novos","nova","novas",
  "vídeo","video","trailer","gameplay","preço","valor","reais","r$","r","sobre",
]);

function extractTopics(titles: string[], topN = 12): { word: string; count: number }[] {
  const counts = new Map<string, number>();
  titles.forEach((t) => {
    const norm = (t || "")
      .toLowerCase()
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9\s]/g, " ");
    norm.split(/\s+/).forEach((w) => {
      if (w.length < 4 || STOPWORDS.has(w) || /^\d+$/.test(w)) return;
      counts.set(w, (counts.get(w) ?? 0) + 1);
    });
  });
  return [...counts.entries()]
    .map(([word, count]) => ({ word, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, topN);
}

export function ChannelsDashboard() {
  const fn = useServerFn(listChannelsData);
  const { data, isLoading } = useQuery({
    queryKey: ["channels-data"],
    queryFn: () => fn({}),
    refetchInterval: 30000,
  });

  const stats = useMemo(() => {
    const mentions = data?.mentions ?? [];
    const trends = data?.trends ?? [];

    // Per channel counts
    const byChannel = new Map<string, number>();
    const sentimentByChannel = new Map<string, { positive: number; neutral: number; negative: number; total: number }>();
    mentions.forEach((m) => {
      byChannel.set(m.source, (byChannel.get(m.source) ?? 0) + 1);
      const cur = sentimentByChannel.get(m.source) ?? { positive: 0, neutral: 0, negative: 0, total: 0 };
      cur.total++;
      if (m.sentiment && m.sentiment in cur) cur[m.sentiment as "positive" | "neutral" | "negative"]++;
      sentimentByChannel.set(m.source, cur);
    });

    const channelData = [...byChannel.entries()]
      .map(([key, value]) => ({
        key, value,
        label: CHANNELS[key]?.label ?? key,
        color: CHANNELS[key]?.color ?? "#64748b",
      }))
      .sort((a, b) => b.value - a.value);

    const totalSentiment = mentions.reduce(
      (acc, m) => { if (m.sentiment) acc[m.sentiment as "positive" | "neutral" | "negative"]++; return acc; },
      { positive: 0, neutral: 0, negative: 0 },
    );

    // Mentions per day (last 30 days), stacked per channel
    const dayMs = 86400000;
    const now = Date.now();
    const days: Array<Record<string, number | string>> = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date(now - i * dayMs);
      const key = d.toISOString().slice(0, 10);
      const row: Record<string, number | string> = {
        date: d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }),
        _key: key,
      };
      Object.keys(CHANNELS).forEach((c) => (row[c] = 0));
      days.push(row);
    }
    mentions.forEach((m) => {
      const day = (m.posted_at ?? m.captured_at)?.slice(0, 10);
      const row = days.find((d) => d._key === day);
      if (row && m.source in CHANNELS) row[m.source] = (row[m.source] as number) + 1;
    });

    // Top topics per channel (top words from titles)
    const titlesByChannel = new Map<string, string[]>();
    mentions.forEach((m) => {
      const arr = titlesByChannel.get(m.source) ?? [];
      if (m.title) arr.push(m.title);
      titlesByChannel.set(m.source, arr);
    });
    const topicsByChannel = new Map<string, { word: string; count: number }[]>();
    titlesByChannel.forEach((titles, ch) => topicsByChannel.set(ch, extractTopics(titles, 10)));

    // Global topics
    const globalTopics = extractTopics(mentions.map((m) => m.title ?? ""), 20);

    // Latest trend series
    const lastTrend = trends[0];
    const trendSeries = lastTrend?.series as Array<{ date: string; value: number }> | undefined;

    return {
      mentions, channelData, sentimentByChannel, totalSentiment,
      days, topicsByChannel, globalTopics, lastTrend, trendSeries,
    };
  }, [data]);

  if (isLoading) return <div className="text-slate-500 text-sm">Carregando…</div>;
  if (!data) return null;

  const totalMentions = stats.mentions.length;

  return (
    <div className="space-y-4">
      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Kpi label="Total de menções" value={totalMentions} />
        <Kpi label="Positivas" value={stats.totalSentiment.positive} accent="text-emerald-600" />
        <Kpi label="Negativas" value={stats.totalSentiment.negative} accent="text-red-600" />
        <Kpi label="Canais ativos" value={stats.channelData.length} accent="text-blue-600" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Channel distribution */}
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base">Menções por canal</CardTitle></CardHeader>
          <CardContent className="h-72">
            {stats.channelData.length === 0 ? <Empty /> : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={stats.channelData} dataKey="value" nameKey="label" cx="50%" cy="50%" outerRadius={80} label={{ fontSize: 11 }}>
                    {stats.channelData.map((d, i) => <Cell key={i} fill={d.color} />)}
                  </Pie>
                  <Tooltip />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Volume timeline */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2"><CardTitle className="text-base">Volume diário por canal (últimos 30 dias)</CardTitle></CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.days}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} interval={2} />
                <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                {Object.entries(CHANNELS).map(([k, v]) => (
                  <Bar key={k} dataKey={k} stackId="a" fill={v.color} name={v.label} />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Trend chart */}
      {stats.trendSeries && stats.trendSeries.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-emerald-600" />
              Google Trends — "{stats.lastTrend?.keyword}" (BR, últimos 30 dias)
            </CardTitle>
          </CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={stats.trendSeries}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} interval={3} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Line type="monotone" dataKey="value" stroke="#10b981" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Top topics global */}
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base">Principais tópicos (todos os canais)</CardTitle></CardHeader>
        <CardContent>
          {stats.globalTopics.length === 0 ? <Empty /> : (
            <div className="flex flex-wrap gap-2">
              {stats.globalTopics.map((t) => (
                <Badge
                  key={t.word}
                  variant="secondary"
                  className="text-sm"
                  style={{ fontSize: `${Math.min(18, 11 + t.count * 0.6)}px` }}
                >
                  {t.word} <span className="ml-1.5 text-xs text-slate-500">{t.count}</span>
                </Badge>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Per channel breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {stats.channelData.map((ch) => {
          const sent = stats.sentimentByChannel.get(ch.key);
          const topics = stats.topicsByChannel.get(ch.key) ?? [];
          const ChIcon = CHANNELS[ch.key]?.icon;
          return (
            <Card key={ch.key}>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center justify-between">
                  <span className="flex items-center gap-2" style={{ color: ch.color }}>
                    {ChIcon} {ch.label}
                  </span>
                  <Badge variant="secondary">{ch.value} menções</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {sent && sent.total > 0 && (
                  <div className="mb-3">
                    <div className="flex h-2 rounded-full overflow-hidden bg-slate-100">
                      <div style={{ width: `${(sent.positive / sent.total) * 100}%`, backgroundColor: SENTIMENT_COLORS.positive }} />
                      <div style={{ width: `${(sent.neutral / sent.total) * 100}%`, backgroundColor: SENTIMENT_COLORS.neutral }} />
                      <div style={{ width: `${(sent.negative / sent.total) * 100}%`, backgroundColor: SENTIMENT_COLORS.negative }} />
                    </div>
                    <div className="flex justify-between text-xs text-slate-500 mt-1">
                      <span className="text-emerald-600">😊 {sent.positive}</span>
                      <span>😐 {sent.neutral}</span>
                      <span className="text-red-600">☹ {sent.negative}</span>
                    </div>
                  </div>
                )}
                <div className="text-xs font-semibold text-slate-500 uppercase mb-1.5">Top tópicos</div>
                {topics.length === 0 ? (
                  <div className="text-xs text-slate-400">Sem títulos suficientes</div>
                ) : (
                  <div className="flex flex-wrap gap-1.5">
                    {topics.map((t) => (
                      <Badge key={t.word} variant="outline" className="text-xs">
                        {t.word} <span className="ml-1 text-slate-400">{t.count}</span>
                      </Badge>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

function Kpi({ label, value, accent }: { label: string; value: number; accent?: string }) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="text-xs text-slate-500">{label}</div>
        <div className={`text-2xl font-bold mt-1 ${accent ?? "text-slate-900"}`}>{value}</div>
      </CardContent>
    </Card>
  );
}

function Empty() {
  return <div className="h-full flex items-center justify-center text-sm text-slate-400">Sem dados ainda</div>;
}

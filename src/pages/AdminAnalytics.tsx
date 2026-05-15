import {
  ActionIcon,
  Badge,
  Button,
  Card,
  Container,
  Grid,
  Group,
  Loader,
  Paper,
  SegmentedControl,
  Stack,
  Table,
  Text,
  Title,
  Tooltip,
} from "@mantine/core";
import { BarChart, DonutChart, LineChart } from "@mantine/charts";

import { PackedBubbles } from "../components/PackedBubbles";
import { notifications } from "@mantine/notifications";
import {
  IconChartBar,
  IconDownload,
  IconRefresh,
} from "@tabler/icons-react";
import { useEffect, useMemo, useState } from "react";

import {
  downloadCsv,
  getDocumentsReport,
  getEscalationsReport,
  getOverview,
  getStrategies,
  getTimeSeries,
  getTopics,
  type DocumentsReport,
  type EscalationsReport,
  type ExportSection,
  type OverviewKPIs,
  type Range,
  type StrategyReport,
  type TimeSeriesReport,
  type TopicsReport,
} from "../api/analytics";

// ---------------------------------------------------------------------------
// Range preset
// ---------------------------------------------------------------------------

type Preset = "7d" | "30d" | "all";

function rangeFromPreset(p: Preset): Range | undefined {
  if (p === "all") return undefined;
  const days = p === "7d" ? 7 : 30;
  const until = new Date();
  const since = new Date(until.getTime() - days * 24 * 60 * 60 * 1000);
  return { since: since.toISOString(), until: until.toISOString() };
}

// ---------------------------------------------------------------------------
// Small helpers
// ---------------------------------------------------------------------------

function pct(n: number): string {
  return `${(n * 100).toFixed(1)}%`;
}

function num(n: number | null | undefined, unit = ""): string {
  if (n === null || n === undefined) return "—";
  return `${n.toLocaleString("pt-BR")}${unit}`;
}

// ---------------------------------------------------------------------------
// KPI card
// ---------------------------------------------------------------------------

interface KpiProps {
  label: string;
  value: string;
  hint?: string;
  tone?: "teal" | "yellow" | "red" | "blue" | "gray";
}

function Kpi({ label, value, hint, tone = "gray" }: KpiProps) {
  return (
    <Paper withBorder radius="md" p="md">
      <Stack gap={4}>
        <Text size="xs" c="dimmed" tt="uppercase" fw={600}>
          {label}
        </Text>
        <Title order={3} c={tone === "gray" ? undefined : tone}>
          {value}
        </Title>
        {hint && (
          <Text size="xs" c="dimmed">
            {hint}
          </Text>
        )}
      </Stack>
    </Paper>
  );
}

// ---------------------------------------------------------------------------
// Export button
// ---------------------------------------------------------------------------

function ExportBtn({ section, range }: { section: ExportSection; range?: Range }) {
  const [loading, setLoading] = useState(false);
  async function handle() {
    setLoading(true);
    try {
      await downloadCsv(section, range);
    } catch {
      notifications.show({
        color: "red",
        title: "Erro",
        message: "Não foi possível baixar o CSV.",
      });
    } finally {
      setLoading(false);
    }
  }
  return (
    <Tooltip label="Baixar CSV">
      <ActionIcon variant="light" onClick={handle} loading={loading}>
        <IconDownload size={16} />
      </ActionIcon>
    </Tooltip>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

const STRATEGY_LABELS: Record<string, string> = {
  default: "Default",
  query_rewrite: "Query Rewrite",
  widen_k: "Widen K",
};

const LABEL_DISPLAY: Record<string, string> = {
  bot_was_wrong: "Bot errou",
  missing_document: "Doc faltando",
  student_misunderstood: "Aluno não entendeu",
  other: "Outro",
  "não rotulada": "Sem rótulo",
};

const FEEDBACK_COLORS = [
  { key: "explicit_yes", label: "Explícito sim", color: "teal.6" },
  { key: "explicit_no", label: "Explícito não", color: "red.6" },
  { key: "implicit_rephrase", label: "Reformulou", color: "yellow.6" },
  { key: "implicit_new_topic", label: "Novo tópico", color: "blue.6" },
  { key: "timeout", label: "Timeout", color: "gray.6" },
  { key: "no_signal", label: "Sem sinal", color: "gray.4" },
] as const;

const STATUS_COLOR_LABEL: Record<string, { label: string; color: string }> = {
  pending: { label: "Pendente", color: "yellow" },
  coordinator_replied: { label: "Respondida", color: "teal" },
  resolved_by_bot_later: { label: "Resolvida pelo bot", color: "gray" },
};

export default function AdminAnalytics() {
  const [preset, setPreset] = useState<Preset>("30d");
  const [loading, setLoading] = useState(false);

  const [overview, setOverview] = useState<OverviewKPIs | null>(null);
  const [strategies, setStrategies] = useState<StrategyReport | null>(null);
  const [escalations, setEscalations] = useState<EscalationsReport | null>(
    null,
  );
  const [docs, setDocs] = useState<DocumentsReport | null>(null);
  const [series, setSeries] = useState<TimeSeriesReport | null>(null);
  const [topics, setTopics] = useState<TopicsReport | null>(null);

  const range = useMemo(() => rangeFromPreset(preset), [preset]);

  async function reload() {
    setLoading(true);
    try {
      const [o, s, e, d, t, tp] = await Promise.all([
        getOverview(range),
        getStrategies(range),
        getEscalationsReport(range),
        getDocumentsReport(range),
        getTimeSeries(range),
        getTopics(range, 25),
      ]);
      setOverview(o);
      setStrategies(s);
      setEscalations(e);
      setDocs(d);
      setSeries(t);
      setTopics(tp);
    } catch {
      notifications.show({
        color: "red",
        title: "Erro",
        message: "Falha ao carregar análises.",
      });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preset]);

  // --- derived chart data ----------------------------------------------------

  const strategyChartData = useMemo(() => {
    if (!strategies) return [];
    return strategies.per_strategy.map((r) => ({
      strategy: STRATEGY_LABELS[r.strategy] ?? r.strategy,
      Total: r.attempts,
      Fallback: r.fallback,
    }));
  }, [strategies]);

  const feedbackChartData = useMemo(() => {
    if (!strategies) return [];
    return strategies.feedback_by_attempt.map((row) => ({
      attempt: `Tentativa ${row.attempt_number}`,
      "Explícito sim": row.explicit_yes,
      "Explícito não": row.explicit_no,
      Reformulou: row.implicit_rephrase,
      "Novo tópico": row.implicit_new_topic,
      Timeout: row.timeout,
      "Sem sinal": row.no_signal,
    }));
  }, [strategies]);

  const labelDonutData = useMemo(() => {
    if (!escalations) return [];
    const palette = ["red.6", "orange.6", "yellow.6", "blue.6", "gray.5"];
    return escalations.by_label.map((l, i) => ({
      name: LABEL_DISPLAY[l.label] ?? l.label,
      value: l.count,
      color: palette[i % palette.length],
    }));
  }, [escalations]);

  const replyBucketData = useMemo(() => {
    if (!escalations) return [];
    return escalations.reply_time_buckets.map((b) => ({
      bucket: b.bucket,
      Total: b.count,
    }));
  }, [escalations]);

  const timeSeriesData = useMemo(() => {
    if (!series) return [];
    return series.points.map((p) => ({
      date: p.date,
      Abertas: p.sessions_opened,
      Resolvidas: p.sessions_resolved,
      Escaladas: p.sessions_escalated,
    }));
  }, [series]);

  const fallbackSeriesData = useMemo(() => {
    if (!series) return [];
    return series.points.map((p) => ({
      date: p.date,
      Tentativas: p.attempts,
      Fallback: p.fallback_attempts,
    }));
  }, [series]);

  // ---------------------------------------------------------------------------

  return (
    <Container size="xl">
      <Stack gap="lg">
        <Group justify="space-between" wrap="wrap">
          <Group gap="xs">
            <IconChartBar />
            <Title order={3}>Análises</Title>
            <Text c="dimmed" size="sm">
              Dados do pipeline para a TCC.
            </Text>
          </Group>
          <Group gap="sm">
            <SegmentedControl
              value={preset}
              onChange={(v) => setPreset(v as Preset)}
              data={[
                { label: "7 dias", value: "7d" },
                { label: "30 dias", value: "30d" },
                { label: "Tudo", value: "all" },
              ]}
            />
            <Tooltip label="Recarregar">
              <ActionIcon
                variant="light"
                onClick={reload}
                loading={loading}
              >
                <IconRefresh size={16} />
              </ActionIcon>
            </Tooltip>
          </Group>
        </Group>

        {loading && !overview ? (
          <Group justify="center" p="xl">
            <Loader />
          </Group>
        ) : overview ? (
          <>
            {/* ==================== SECTION 1 — KPIs ==================== */}
            <Card withBorder radius="md" p="lg">
              <Stack gap="md">
                <Group justify="space-between">
                  <Title order={5}>Visão geral</Title>
                  <ExportBtn section="overview" range={range} />
                </Group>
                <Grid>
                  <Grid.Col span={{ base: 12, sm: 6, md: 4, lg: 2 }}>
                    <Kpi
                      label="Sessões"
                      value={num(overview.total_sessions)}
                      hint={`${overview.sessions_open} abertas`}
                    />
                  </Grid.Col>
                  <Grid.Col span={{ base: 12, sm: 6, md: 4, lg: 2 }}>
                    <Kpi
                      label="Resolução pelo bot"
                      value={pct(overview.resolution_rate)}
                      tone="teal"
                      hint={`${overview.sessions_resolved} de ${
                        overview.sessions_resolved +
                        overview.sessions_escalated +
                        overview.sessions_abandoned
                      }`}
                    />
                  </Grid.Col>
                  <Grid.Col span={{ base: 12, sm: 6, md: 4, lg: 2 }}>
                    <Kpi
                      label="Escalação"
                      value={pct(overview.escalation_rate)}
                      tone="yellow"
                      hint={`${overview.sessions_escalated} escaladas`}
                    />
                  </Grid.Col>
                  <Grid.Col span={{ base: 12, sm: 6, md: 4, lg: 2 }}>
                    <Kpi
                      label="Fallback"
                      value={pct(overview.fallback_rate)}
                      tone="red"
                      hint={`${overview.fallback_attempts} de ${overview.total_attempts} tentativas`}
                    />
                  </Grid.Col>
                  <Grid.Col span={{ base: 12, sm: 6, md: 4, lg: 2 }}>
                    <Kpi
                      label="Latência média"
                      value={num(
                        overview.avg_latency_ms
                          ? Math.round(overview.avg_latency_ms)
                          : null,
                        " ms",
                      )}
                      hint={`p95 ${num(
                        overview.p95_latency_ms
                          ? Math.round(overview.p95_latency_ms)
                          : null,
                        " ms",
                      )}`}
                    />
                  </Grid.Col>
                  <Grid.Col span={{ base: 12, sm: 6, md: 4, lg: 2 }}>
                    <Kpi
                      label="Resposta do coord."
                      value={num(
                        overview.median_reply_minutes
                          ? Math.round(overview.median_reply_minutes)
                          : null,
                        " min",
                      )}
                      hint={`média ${num(
                        overview.avg_reply_minutes
                          ? Math.round(overview.avg_reply_minutes)
                          : null,
                        " min",
                      )} • ${overview.pending_escalations} pendentes`}
                    />
                  </Grid.Col>
                </Grid>
              </Stack>
            </Card>

            {/* ============ SECTION 2 — Retry strategies ============ */}
            {strategies && (
              <Card withBorder radius="md" p="lg">
                <Stack gap="md">
                  <Group justify="space-between">
                    <Stack gap={0}>
                      <Title order={5}>Estratégias de retry</Title>
                      <Text size="xs" c="dimmed">
                        Como cada estratégia se comportou e como o aluno
                        reagiu a cada tentativa.
                      </Text>
                    </Stack>
                    <ExportBtn section="strategies" range={range} />
                  </Group>
                  <Grid>
                    <Grid.Col span={{ base: 12, md: 6 }}>
                      <Text size="sm" fw={500} mb="xs">
                        Tentativas por estratégia
                      </Text>
                      {strategyChartData.length > 0 ? (
                        <BarChart
                          h={240}
                          data={strategyChartData}
                          dataKey="strategy"
                          series={[
                            { name: "Total", color: "blue.6" },
                            { name: "Fallback", color: "red.6" },
                          ]}
                          withLegend
                          type="default"
                        />
                      ) : (
                        <Text c="dimmed" size="sm" ta="center" py="xl">
                          Sem dados no período.
                        </Text>
                      )}
                    </Grid.Col>
                    <Grid.Col span={{ base: 12, md: 6 }}>
                      <Text size="sm" fw={500} mb="xs">
                        Feedback por número da tentativa
                      </Text>
                      {feedbackChartData.length > 0 ? (
                        <BarChart
                          h={240}
                          data={feedbackChartData}
                          dataKey="attempt"
                          type="stacked"
                          withLegend
                          series={FEEDBACK_COLORS.map((f) => ({
                            name: f.label,
                            color: f.color,
                          }))}
                        />
                      ) : (
                        <Text c="dimmed" size="sm" ta="center" py="xl">
                          Sem dados no período.
                        </Text>
                      )}
                    </Grid.Col>
                  </Grid>

                  <Table.ScrollContainer minWidth={720}>
                    <Table striped highlightOnHover verticalSpacing="xs">
                      <Table.Thead>
                        <Table.Tr>
                          <Table.Th>Estratégia</Table.Th>
                          <Table.Th>Tentativas</Table.Th>
                          <Table.Th>Fallback</Table.Th>
                          <Table.Th>Fallback %</Table.Th>
                          <Table.Th>Sim</Table.Th>
                          <Table.Th>Não</Table.Th>
                          <Table.Th>Reformulou</Table.Th>
                          <Table.Th>Timeout</Table.Th>
                          <Table.Th>Lat. média</Table.Th>
                        </Table.Tr>
                      </Table.Thead>
                      <Table.Tbody>
                        {strategies.per_strategy.map((r) => (
                          <Table.Tr key={r.strategy}>
                            <Table.Td>
                              <Badge variant="light">
                                {STRATEGY_LABELS[r.strategy] ?? r.strategy}
                              </Badge>
                            </Table.Td>
                            <Table.Td>{r.attempts}</Table.Td>
                            <Table.Td>{r.fallback}</Table.Td>
                            <Table.Td>{pct(r.fallback_rate)}</Table.Td>
                            <Table.Td>{r.explicit_yes}</Table.Td>
                            <Table.Td>{r.explicit_no}</Table.Td>
                            <Table.Td>{r.implicit_rephrase}</Table.Td>
                            <Table.Td>{r.timeout}</Table.Td>
                            <Table.Td>
                              {r.avg_latency_ms
                                ? `${Math.round(r.avg_latency_ms)} ms`
                                : "—"}
                            </Table.Td>
                          </Table.Tr>
                        ))}
                      </Table.Tbody>
                    </Table>
                  </Table.ScrollContainer>
                </Stack>
              </Card>
            )}

            {/* =========== SECTION 3 — Escalations =========== */}
            {escalations && (
              <Card withBorder radius="md" p="lg">
                <Stack gap="md">
                  <Group justify="space-between">
                    <Stack gap={0}>
                      <Title order={5}>Escalações</Title>
                      <Text size="xs" c="dimmed">
                        {escalations.total} escalação(ões) no período.
                      </Text>
                    </Stack>
                    <ExportBtn section="escalations" range={range} />
                  </Group>
                  <Grid>
                    <Grid.Col span={{ base: 12, md: 4 }}>
                      <Text size="sm" fw={500} mb="xs">
                        Rótulos do coordenador
                      </Text>
                      {labelDonutData.length > 0 ? (
                        <DonutChart
                          h={220}
                          data={labelDonutData}
                          withLabelsLine
                          withLabels
                          withTooltip
                          chartLabel={escalations.total}
                        />
                      ) : (
                        <Text c="dimmed" size="sm" ta="center" py="xl">
                          Sem dados no período.
                        </Text>
                      )}
                    </Grid.Col>
                    <Grid.Col span={{ base: 12, md: 4 }}>
                      <Text size="sm" fw={500} mb="xs">
                        Tempo até resposta
                      </Text>
                      {replyBucketData.length > 0 ? (
                        <BarChart
                          h={220}
                          data={replyBucketData}
                          dataKey="bucket"
                          series={[{ name: "Total", color: "blue.6" }]}
                        />
                      ) : (
                        <Text c="dimmed" size="sm" ta="center" py="xl">
                          —
                        </Text>
                      )}
                    </Grid.Col>
                    <Grid.Col span={{ base: 12, md: 4 }}>
                      <Text size="sm" fw={500} mb="xs">
                        Status
                      </Text>
                      <Stack gap="xs">
                        {escalations.by_status.map((s) => (
                          <Group
                            key={s.status}
                            justify="space-between"
                            wrap="nowrap"
                          >
                            <Badge
                              color={
                                STATUS_COLOR_LABEL[s.status]?.color ?? "gray"
                              }
                              variant="light"
                            >
                              {STATUS_COLOR_LABEL[s.status]?.label ?? s.status}
                            </Badge>
                            <Text fw={500}>{s.count}</Text>
                          </Group>
                        ))}
                        {escalations.closing_feedback.length > 0 && (
                          <>
                            <Text size="xs" c="dimmed" mt="sm">
                              Voto do aluno na enquete (sessões escaladas)
                            </Text>
                            {escalations.closing_feedback.map((c) => (
                              <Group
                                key={c.feedback}
                                justify="space-between"
                                wrap="nowrap"
                              >
                                <Badge variant="outline">{c.feedback}</Badge>
                                <Text fw={500}>{c.count}</Text>
                              </Group>
                            ))}
                          </>
                        )}
                      </Stack>
                    </Grid.Col>
                  </Grid>
                </Stack>
              </Card>
            )}

            {/* =========== SECTION — Topics =========== */}
            {topics && (
              <Card withBorder radius="md" p="lg">
                <Stack gap="md">
                  <Group justify="space-between">
                    <Stack gap={0}>
                      <Title order={5}>Tópicos mais perguntados</Title>
                      <Text size="xs" c="dimmed">
                        Assuntos recorrentes nas perguntas dos alunos. Categorias vêm
                        do documento mais relevante recuperado. Termos vêm do texto
                        das perguntas (stopwords em PT removidas).
                      </Text>
                    </Stack>
                    <ExportBtn section="topics" range={range} />
                  </Group>
                  <Grid>
                    <Grid.Col span={{ base: 12, md: 6 }}>
                      <Text size="sm" fw={500} mb="xs">
                        Por categoria de documento
                      </Text>
                      {topics.by_category.length > 0 ? (
                        <BarChart
                          h={240}
                          data={topics.by_category.map((c) => ({
                            category: c.category,
                            Tentativas: c.attempts,
                            Fallback: c.fallback_attempts,
                            Escalações: c.escalations,
                          }))}
                          dataKey="category"
                          withLegend
                          series={[
                            { name: "Tentativas", color: "blue.6" },
                            { name: "Fallback", color: "red.6" },
                            { name: "Escalações", color: "yellow.6" },
                          ]}
                        />
                      ) : (
                        <Text c="dimmed" size="sm" ta="center" py="xl">
                          Sem dados no período.
                        </Text>
                      )}
                      <Table.ScrollContainer minWidth={0} mt="sm">
                        <Table verticalSpacing="xs" striped>
                          <Table.Thead>
                            <Table.Tr>
                              <Table.Th>Categoria</Table.Th>
                              <Table.Th>Tentativas</Table.Th>
                              <Table.Th>Fallback %</Table.Th>
                              <Table.Th>Escalações</Table.Th>
                            </Table.Tr>
                          </Table.Thead>
                          <Table.Tbody>
                            {topics.by_category.map((c) => (
                              <Table.Tr key={c.category}>
                                <Table.Td>
                                  <Badge variant="light" color="blue">
                                    {c.category}
                                  </Badge>
                                </Table.Td>
                                <Table.Td>{c.attempts}</Table.Td>
                                <Table.Td>{pct(c.fallback_rate)}</Table.Td>
                                <Table.Td>{c.escalations}</Table.Td>
                              </Table.Tr>
                            ))}
                          </Table.Tbody>
                        </Table>
                      </Table.ScrollContainer>
                    </Grid.Col>
                    <Grid.Col span={{ base: 12, md: 6 }}>
                      <Text size="sm" fw={500} mb="xs">
                        Termos mais frequentes
                      </Text>
                      {topics.top_terms.length > 0 ? (
                        (() => {
                          // Paleta fixa, mapeada por categoria (estável entre
                          // as duas visões: gráfico de barras + bolhas).
                          const palette = [
                            "var(--mantine-color-blue-6)",
                            "var(--mantine-color-orange-6)",
                            "var(--mantine-color-teal-6)",
                            "var(--mantine-color-grape-6)",
                            "var(--mantine-color-red-5)",
                            "var(--mantine-color-yellow-6)",
                            "var(--mantine-color-cyan-6)",
                            "var(--mantine-color-lime-6)",
                          ];
                          const categories = Array.from(
                            new Set(
                              topics.top_terms
                                .map((t) => t.category)
                                .filter((c): c is string => !!c),
                            ),
                          );
                          const catColor = new Map<string, string>();
                          categories.forEach((c, i) => {
                            catColor.set(c, palette[i % palette.length]);
                          });
                          const FALLBACK = "var(--mantine-color-gray-5)";
                          return (
                            <>
                              <PackedBubbles
                                height={320}
                                fallbackColor={FALLBACK}
                                palette={palette}
                                data={topics.top_terms.map((t) => ({
                                  id: t.term,
                                  value: t.count,
                                  group: t.category ?? undefined,
                                }))}
                              />
                              <Group gap="xs" mt="xs" wrap="wrap">
                                {categories.map((c) => (
                                  <Group key={c} gap={4} wrap="nowrap">
                                    <span
                                      style={{
                                        width: 10,
                                        height: 10,
                                        borderRadius: "50%",
                                        background: catColor.get(c),
                                        display: "inline-block",
                                      }}
                                    />
                                    <Text size="xs">{c}</Text>
                                  </Group>
                                ))}
                                {topics.top_terms.some((t) => !t.category) && (
                                  <Group gap={4} wrap="nowrap">
                                    <span
                                      style={{
                                        width: 10,
                                        height: 10,
                                        borderRadius: "50%",
                                        background: FALLBACK,
                                        display: "inline-block",
                                      }}
                                    />
                                    <Text size="xs" c="dimmed">
                                      sem categoria
                                    </Text>
                                  </Group>
                                )}
                              </Group>
                            </>
                          );
                        })()
                      ) : (
                        <Text c="dimmed" size="sm" ta="center" py="xl">
                          Sem perguntas no período.
                        </Text>
                      )}
                      {topics.top_terms.length > 0 && (
                        <Text size="xs" c="dimmed" mt="xs">
                          Top {topics.top_terms.length} termos. Tamanho da
                          bolha = frequência. Cor = categoria de documento
                          mais associada ao termo.
                        </Text>
                      )}
                    </Grid.Col>
                  </Grid>
                </Stack>
              </Card>
            )}

            {/* =========== SECTION 4 — Documents =========== */}
            {docs && (
              <Card withBorder radius="md" p="lg">
                <Stack gap="md">
                  <Group justify="space-between">
                    <Stack gap={0}>
                      <Title order={5}>Cobertura dos documentos</Title>
                      <Text size="xs" c="dimmed">
                        Quais documentos foram (ou não foram) usados pelo
                        RAG no período.
                      </Text>
                    </Stack>
                    <ExportBtn section="documents" range={range} />
                  </Group>
                  <Table.ScrollContainer minWidth={720}>
                    <Table striped highlightOnHover verticalSpacing="xs">
                      <Table.Thead>
                        <Table.Tr>
                          <Table.Th>Arquivo</Table.Th>
                          <Table.Th>Categoria</Table.Th>
                          <Table.Th>Usos</Table.Th>
                          <Table.Th>Fallback</Table.Th>
                          <Table.Th>Fallback %</Table.Th>
                          <Table.Th>Score médio</Table.Th>
                        </Table.Tr>
                      </Table.Thead>
                      <Table.Tbody>
                        {docs.rows.length === 0 && (
                          <Table.Tr>
                            <Table.Td colSpan={6}>
                              <Text c="dimmed" ta="center" size="sm">
                                Nenhum documento foi usado no período.
                              </Text>
                            </Table.Td>
                          </Table.Tr>
                        )}
                        {docs.rows.map((r) => (
                          <Table.Tr key={r.document_id ?? r.filename}>
                            <Table.Td>
                              <Text fw={500} truncate>
                                {r.filename}
                              </Text>
                            </Table.Td>
                            <Table.Td>
                              {r.category ? (
                                <Badge variant="outline" color="blue">
                                  {r.category}
                                </Badge>
                              ) : (
                                <Text c="dimmed" size="sm">
                                  —
                                </Text>
                              )}
                            </Table.Td>
                            <Table.Td>{r.attempts_used}</Table.Td>
                            <Table.Td>{r.fallback_attempts}</Table.Td>
                            <Table.Td>{pct(r.fallback_rate)}</Table.Td>
                            <Table.Td>
                              {r.avg_score !== null
                                ? r.avg_score.toFixed(3)
                                : "—"}
                            </Table.Td>
                          </Table.Tr>
                        ))}
                      </Table.Tbody>
                    </Table>
                  </Table.ScrollContainer>
                  {docs.never_retrieved.length > 0 && (
                    <Paper withBorder p="sm" radius="sm">
                      <Text size="xs" c="dimmed" mb={4}>
                        Nunca recuperados no período (
                        {docs.never_retrieved.length})
                      </Text>
                      <Group gap={6}>
                        {docs.never_retrieved.map((d) => (
                          <Badge
                            key={d.document_id}
                            variant="outline"
                            color="gray"
                          >
                            {d.filename}
                          </Badge>
                        ))}
                      </Group>
                    </Paper>
                  )}
                </Stack>
              </Card>
            )}

            {/* =========== SECTION 5 — Time series =========== */}
            {series && (
              <Card withBorder radius="md" p="lg">
                <Stack gap="md">
                  <Group justify="space-between">
                    <Stack gap={0}>
                      <Title order={5}>Série temporal</Title>
                      <Text size="xs" c="dimmed">
                        Volume diário no período.
                      </Text>
                    </Stack>
                    <ExportBtn section="timeseries" range={range} />
                  </Group>
                  <Grid>
                    <Grid.Col span={{ base: 12, md: 6 }}>
                      <Text size="sm" fw={500} mb="xs">
                        Sessões por dia
                      </Text>
                      {timeSeriesData.length > 0 ? (
                        <LineChart
                          h={240}
                          data={timeSeriesData}
                          dataKey="date"
                          withLegend
                          withDots={false}
                          series={[
                            { name: "Abertas", color: "blue.6" },
                            { name: "Resolvidas", color: "teal.6" },
                            { name: "Escaladas", color: "yellow.6" },
                          ]}
                        />
                      ) : (
                        <Text c="dimmed" size="sm" ta="center" py="xl">
                          Sem dados no período.
                        </Text>
                      )}
                    </Grid.Col>
                    <Grid.Col span={{ base: 12, md: 6 }}>
                      <Text size="sm" fw={500} mb="xs">
                        Tentativas e fallback por dia
                      </Text>
                      {fallbackSeriesData.length > 0 ? (
                        <LineChart
                          h={240}
                          data={fallbackSeriesData}
                          dataKey="date"
                          withLegend
                          withDots={false}
                          series={[
                            { name: "Tentativas", color: "grape.6" },
                            { name: "Fallback", color: "red.6" },
                          ]}
                        />
                      ) : (
                        <Text c="dimmed" size="sm" ta="center" py="xl">
                          Sem dados no período.
                        </Text>
                      )}
                    </Grid.Col>
                  </Grid>
                </Stack>
              </Card>
            )}

            <Group justify="flex-end">
              <Button
                variant="subtle"
                leftSection={<IconDownload size={14} />}
                onClick={async () => {
                  // Convenience "baixar tudo"
                  const sections: ExportSection[] = [
                    "overview",
                    "strategies",
                    "escalations",
                    "documents",
                    "timeseries",
                    "topics",
                  ];
                  for (const s of sections) {
                    await downloadCsv(s, range);
                  }
                }}
              >
                Baixar todos os CSVs
              </Button>
            </Group>
          </>
        ) : null}
      </Stack>
    </Container>
  );
}

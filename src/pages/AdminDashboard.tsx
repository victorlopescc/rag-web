import {
  ActionIcon,
  Badge,
  Button,
  Card,
  Container,
  Grid,
  Group,
  Paper,
  Stack,
  Text,
  Title,
  Tooltip,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import {
  IconAlertTriangle,
  IconClockHour4,
  IconFileDescription,
  IconInbox,
  IconRefresh,
  IconSparkles,
  IconUsers,
} from "@tabler/icons-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import { listDocuments, type DocumentOut } from "../api/documents";
import {
  closeStaleSessions,
  listEscalations,
  type EscalationListItem,
} from "../api/escalations";
import { listStudents, type StudentOut } from "../api/students";
import TestBotCard from "../components/TestBotCard";

interface Stat {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  hint?: string;
  accent?: string;
}

function StatCard({ icon, label, value, hint, accent }: Stat) {
  return (
    <Paper withBorder radius="md" p="lg">
      <Group justify="space-between" align="flex-start" wrap="nowrap">
        <Stack gap={4}>
          <Text size="xs" c="dimmed" tt="uppercase" fw={600}>
            {label}
          </Text>
          <Title order={2}>{value}</Title>
          {hint && (
            <Text size="xs" c="dimmed">
              {hint}
            </Text>
          )}
        </Stack>
        <div
          style={{
            background: accent
              ? `var(--mantine-color-${accent}-1)`
              : "var(--mantine-color-gray-1)",
            borderRadius: "50%",
            width: 44,
            height: 44,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
            color: accent ? `var(--mantine-color-${accent}-7)` : undefined,
          }}
        >
          {icon}
        </div>
      </Group>
    </Paper>
  );
}

export default function AdminDashboard() {
  const [docs, setDocs] = useState<DocumentOut[] | null>(null);
  const [students, setStudents] = useState<StudentOut[] | null>(null);
  const [pending, setPending] = useState<EscalationListItem[] | null>(null);
  const [closing, setClosing] = useState(false);

  async function reload() {
    try {
      const [d, s, p] = await Promise.all([
        listDocuments(),
        listStudents(),
        listEscalations("pending"),
      ]);
      setDocs(d);
      setStudents(s);
      setPending(p);
    } catch {
      notifications.show({
        color: "red",
        title: "Erro",
        message: "Falha ao carregar o painel.",
      });
    }
  }

  useEffect(() => {
    void reload();
  }, []);

  async function runCloseStale() {
    setClosing(true);
    try {
      const { closed } = await closeStaleSessions();
      notifications.show({
        color: "teal",
        title: "Manutenção concluída",
        message:
          closed === 0
            ? "Nenhuma sessão ociosa para fechar."
            : `${closed} sessão(ões) ociosa(s) fechada(s).`,
      });
    } catch {
      notifications.show({
        color: "red",
        title: "Erro",
        message: "Não foi possível rodar a manutenção.",
      });
    } finally {
      setClosing(false);
    }
  }

  const indexed = docs?.filter((d) => d.status === "indexed").length ?? 0;
  const docsError = docs?.filter((d) => d.status === "error").length ?? 0;
  const activeStudents = students?.filter((s) => s.active).length ?? 0;

  return (
    <Container size="lg">
      <Stack gap="lg">
        <Group justify="space-between" wrap="wrap">
          <Stack gap={0}>
            <Title order={2}>Visão geral</Title>
            <Text c="dimmed" size="sm">
              Acompanhe documentos, alunos e dúvidas pendentes.
            </Text>
          </Stack>
          <Tooltip label="Atualizar">
            <ActionIcon size="lg" variant="light" onClick={reload}>
              <IconRefresh size={18} />
            </ActionIcon>
          </Tooltip>
        </Group>

        <Grid>
          <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
            <StatCard
              icon={<IconInbox size={22} />}
              label="Escalações pendentes"
              value={pending?.length ?? "—"}
              hint="Dúvidas aguardando resposta"
              accent="yellow"
            />
          </Grid.Col>
          <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
            <StatCard
              icon={<IconFileDescription size={22} />}
              label="Documentos indexados"
              value={indexed}
              hint={
                docsError > 0 ? `${docsError} com erro` : "Base de conhecimento"
              }
              accent="teal"
            />
          </Grid.Col>
          <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
            <StatCard
              icon={<IconUsers size={22} />}
              label="Alunos cadastrados"
              value={activeStudents}
              hint={
                students
                  ? `${students.length - activeStudents} inativo(s)`
                  : undefined
              }
              accent="blue"
            />
          </Grid.Col>
          <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
            <StatCard
              icon={<IconSparkles size={22} />}
              label="Total de alunos"
              value={students?.length ?? "—"}
              hint="Inclui inativos"
            />
          </Grid.Col>
        </Grid>

        <Grid>
          <Grid.Col span={{ base: 12, md: 7 }}>
            <Card withBorder radius="md" p="lg">
              <Stack gap="md">
                <Group justify="space-between">
                  <Group gap="xs">
                    <IconAlertTriangle
                      size={18}
                      color="var(--mantine-color-yellow-7)"
                    />
                    <Title order={5}>Escalações pendentes</Title>
                    {pending && (
                      <Badge color="yellow" variant="light">
                        {pending.length}
                      </Badge>
                    )}
                  </Group>
                  <Button
                    component={Link}
                    to="/admin/escalations"
                    variant="subtle"
                    size="xs"
                  >
                    Ver todas
                  </Button>
                </Group>
                {pending && pending.length === 0 ? (
                  <Text c="dimmed" ta="center" py="lg" size="sm">
                    Tudo resolvido por aqui. 🎉
                  </Text>
                ) : (
                  <Stack gap="xs">
                    {pending?.slice(0, 5).map((e) => (
                      <Paper
                        key={e.id}
                        withBorder
                        p="sm"
                        radius="sm"
                        component={Link}
                        to={`/admin/escalations/${e.id}`}
                        style={{
                          textDecoration: "none",
                          color: "inherit",
                          display: "block",
                        }}
                      >
                        <Group justify="space-between" wrap="nowrap">
                          <Stack gap={2} style={{ minWidth: 0, flex: 1 }}>
                            <Text fw={500} truncate>
                              {e.student.full_name}
                            </Text>
                            <Text size="xs" c="dimmed" lineClamp={2}>
                              {e.summary}
                            </Text>
                          </Stack>
                          <Text size="xs" c="dimmed" style={{ flexShrink: 0 }}>
                            {new Date(e.created_at).toLocaleDateString("pt-BR")}
                          </Text>
                        </Group>
                      </Paper>
                    ))}
                  </Stack>
                )}
              </Stack>
            </Card>
          </Grid.Col>

          <Grid.Col span={{ base: 12, md: 5 }}>
            <Card withBorder radius="md" p="lg" h="100%">
              <Stack gap="md">
                <Group gap="xs">
                  <IconClockHour4 size={18} />
                  <Title order={5}>Manutenção</Title>
                </Group>
                <Text size="sm" c="dimmed">
                  Fecha manualmente sessões ociosas (sem atividade há mais de 6
                  horas). Em produção, use um cron externo nos endpoints{" "}
                  <code>/admin/maintenance/*</code>.
                </Text>
                <Button
                  variant="light"
                  onClick={runCloseStale}
                  loading={closing}
                  leftSection={<IconClockHour4 size={16} />}
                >
                  Fechar sessões ociosas agora
                </Button>
              </Stack>
            </Card>
          </Grid.Col>
        </Grid>

        <TestBotCard />
      </Stack>
    </Container>
  );
}

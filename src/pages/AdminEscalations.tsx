import {
  Badge,
  Card,
  Container,
  Group,
  Loader,
  SegmentedControl,
  Stack,
  Table,
  Text,
  Title,
  Tooltip,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { IconChevronRight, IconInbox } from "@tabler/icons-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import {
  listEscalations,
  type CoordinatorLabel,
  type EscalationListItem,
  type EscalationStatus,
} from "../api/escalations";

const STATUS_LABEL: Record<EscalationStatus, { label: string; color: string }> = {
  pending: { label: "Pendente", color: "yellow" },
  coordinator_replied: { label: "Respondida", color: "teal" },
  resolved_by_bot_later: { label: "Resolvida pelo bot", color: "gray" },
  live: { label: "Conversa ao vivo", color: "blue" },
  resolved: { label: "Conversa encerrada", color: "teal" },
  abandoned: { label: "Abandonada", color: "gray" },
};

const LABEL_NAMES: Record<CoordinatorLabel, string> = {
  bot_was_wrong: "Bot errou",
  missing_document: "Doc faltando",
  student_misunderstood: "Aluno não entendeu",
  other: "Outro",
};

type Filter = "pending" | "all";

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function AdminEscalations() {
  const navigate = useNavigate();
  const [items, setItems] = useState<EscalationListItem[] | null>(null);
  const [filter, setFilter] = useState<Filter>("pending");
  const [loading, setLoading] = useState(false);

  async function reload() {
    setLoading(true);
    try {
      const data = await listEscalations(
        filter === "pending" ? "pending" : undefined,
      );
      setItems(data);
    } catch {
      notifications.show({
        color: "red",
        title: "Erro",
        message: "Não foi possível carregar as escalações.",
      });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  return (
    <Container size="lg">
      <Stack gap="md">
        <Group justify="space-between" wrap="wrap">
          <Group gap="xs">
            <IconInbox />
            <Title order={3}>Escalações ao coordenador</Title>
          </Group>
          <SegmentedControl
            value={filter}
            onChange={(v) => setFilter(v as Filter)}
            data={[
              { label: "Pendentes", value: "pending" },
              { label: "Todas", value: "all" },
            ]}
          />
        </Group>

        <Text c="dimmed" size="sm">
          Dúvidas que o bot não conseguiu responder em 3 tentativas. Clique em
          uma linha para ver o histórico completo e responder o aluno pelo
          WhatsApp.
        </Text>

        <Card withBorder radius="md" p={0}>
          {loading && !items ? (
            <Group justify="center" p="xl">
              <Loader />
            </Group>
          ) : items && items.length === 0 ? (
            <Stack gap={4} align="center" py="xl">
              <IconInbox size={36} color="var(--mantine-color-gray-5)" />
              <Text c="dimmed" ta="center">
                Nenhuma escalação{" "}
                {filter === "pending" ? "pendente" : ""} no momento.
              </Text>
              <Text c="dimmed" size="xs" ta="center">
                Quando o bot falhar em 3 tentativas, a dúvida aparece aqui.
              </Text>
            </Stack>
          ) : (
            <Table.ScrollContainer minWidth={760}>
              <Table
                striped
                highlightOnHover
                verticalSpacing="sm"
                layout="fixed"
                style={{ tableLayout: "fixed" }}
              >
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th style={{ width: "20%" }}>Aluno</Table.Th>
                    <Table.Th style={{ width: "28%" }}>Resumo</Table.Th>
                    <Table.Th style={{ width: "17%" }}>Status</Table.Th>
                    <Table.Th style={{ width: "18%" }}>Rótulo</Table.Th>
                    <Table.Th style={{ width: "13%" }}>Criada</Table.Th>
                    <Table.Th style={{ width: "4%" }} />
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {items?.map((e) => (
                    <Table.Tr
                      key={e.id}
                      style={{ cursor: "pointer" }}
                      onClick={() => navigate(`/admin/escalations/${e.id}`)}
                    >
                      <Table.Td>
                        <Text fw={500} truncate>
                          {e.student.full_name}
                        </Text>
                        <Text size="xs" c="dimmed">
                          {e.student.matricula}
                        </Text>
                      </Table.Td>
                      <Table.Td>
                        <Tooltip
                          label={e.summary}
                          multiline
                          maw={480}
                          withArrow
                        >
                          <Text lineClamp={2} size="sm">
                            {e.summary}
                          </Text>
                        </Tooltip>
                      </Table.Td>
                      <Table.Td>
                        <Badge
                          color={STATUS_LABEL[e.status].color}
                          variant="light"
                        >
                          {STATUS_LABEL[e.status].label}
                        </Badge>
                      </Table.Td>
                      <Table.Td>
                        {e.coordinator_label ? (
                          <Badge variant="outline" color="blue">
                            {LABEL_NAMES[e.coordinator_label]}
                          </Badge>
                        ) : (
                          <Text c="dimmed" size="xs">
                            —
                          </Text>
                        )}
                      </Table.Td>
                      <Table.Td>
                        <Text size="sm">{formatDateTime(e.created_at)}</Text>
                      </Table.Td>
                      <Table.Td>
                        <IconChevronRight
                          size={16}
                          color="var(--mantine-color-gray-5)"
                        />
                      </Table.Td>
                    </Table.Tr>
                  ))}
                </Table.Tbody>
              </Table>
            </Table.ScrollContainer>
          )}
        </Card>
      </Stack>
    </Container>
  );
}

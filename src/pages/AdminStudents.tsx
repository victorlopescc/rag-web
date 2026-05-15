import {
  ActionIcon,
  Badge,
  Card,
  Container,
  Group,
  Loader,
  Stack,
  Table,
  Text,
  TextInput,
  Title,
  Tooltip,
} from "@mantine/core";
import { modals } from "@mantine/modals";
import { notifications } from "@mantine/notifications";
import {
  IconRefresh,
  IconSearch,
  IconTrash,
  IconUsers,
} from "@tabler/icons-react";
import { useEffect, useMemo, useState } from "react";

import {
  deleteStudent,
  listStudents,
  type StudentOut,
} from "../api/students";

function formatPhone(raw: string): string {
  // Best-effort pretty print for BR numbers stored as 5511...
  const digits = raw.replace(/\D/g, "");
  if (digits.length === 13) {
    return `+${digits.slice(0, 2)} (${digits.slice(2, 4)}) ${digits.slice(4, 9)}-${digits.slice(9)}`;
  }
  if (digits.length === 12) {
    return `+${digits.slice(0, 2)} (${digits.slice(2, 4)}) ${digits.slice(4, 8)}-${digits.slice(8)}`;
  }
  return raw;
}

export default function AdminStudents() {
  const [students, setStudents] = useState<StudentOut[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");

  async function reload() {
    setLoading(true);
    try {
      setStudents(await listStudents());
    } catch {
      notifications.show({
        color: "red",
        title: "Erro",
        message: "Falha ao carregar alunos.",
      });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void reload();
  }, []);

  const filtered = useMemo(() => {
    if (!students) return null;
    const q = search.trim().toLowerCase();
    if (!q) return students;
    return students.filter(
      (s) =>
        s.full_name.toLowerCase().includes(q) ||
        s.matricula.toLowerCase().includes(q) ||
        s.phone_number.includes(q),
    );
  }, [students, search]);

  function confirmDelete(s: StudentOut) {
    modals.openConfirmModal({
      title: "Remover aluno",
      children: (
        <Text size="sm">
          Remover <b>{s.full_name}</b> ({s.matricula})? Isso apaga também
          sessões, tentativas e escalações desse aluno.
        </Text>
      ),
      labels: { confirm: "Remover", cancel: "Cancelar" },
      confirmProps: { color: "red" },
      onConfirm: async () => {
        try {
          await deleteStudent(s.phone_number);
          notifications.show({
            color: "teal",
            title: "Removido",
            message: `${s.full_name} saiu da base.`,
          });
          reload();
        } catch {
          notifications.show({
            color: "red",
            title: "Erro",
            message: "Não foi possível remover o aluno.",
          });
        }
      },
    });
  }

  return (
    <Container size="lg">
      <Stack gap="md">
        <Group justify="space-between" wrap="wrap">
          <Group gap="xs">
            <IconUsers />
            <Title order={3}>Alunos cadastrados</Title>
            {students && (
              <Badge variant="light">{students.length}</Badge>
            )}
          </Group>
          <Group gap="sm">
            <TextInput
              placeholder="Buscar por nome, matrícula ou telefone"
              leftSection={<IconSearch size={14} />}
              value={search}
              onChange={(e) => setSearch(e.currentTarget.value)}
              w={280}
            />
            <Tooltip label="Recarregar">
              <ActionIcon variant="light" onClick={reload} loading={loading}>
                <IconRefresh size={18} />
              </ActionIcon>
            </Tooltip>
          </Group>
        </Group>

        <Card withBorder radius="md" p={0}>
          {students === null ? (
            <Group justify="center" p="xl">
              <Loader />
            </Group>
          ) : filtered && filtered.length === 0 ? (
            <Stack gap={4} align="center" py="xl">
              <IconUsers size={36} color="var(--mantine-color-gray-5)" />
              <Text c="dimmed">
                {search
                  ? "Nenhum aluno casa com a busca."
                  : "Nenhum aluno cadastrado ainda."}
              </Text>
            </Stack>
          ) : (
            <Table.ScrollContainer minWidth={720}>
              <Table
                striped
                highlightOnHover
                verticalSpacing="sm"
                layout="fixed"
                style={{ tableLayout: "fixed" }}
              >
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th style={{ width: "26%" }}>Nome</Table.Th>
                    <Table.Th style={{ width: "13%" }}>Matrícula</Table.Th>
                    <Table.Th style={{ width: "22%" }}>WhatsApp</Table.Th>
                    <Table.Th style={{ width: "12%" }}>Status</Table.Th>
                    <Table.Th style={{ width: "21%" }}>LID</Table.Th>
                    <Table.Th style={{ width: "6%" }} />
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {filtered?.map((s) => (
                    <Table.Tr key={s.id}>
                      <Table.Td>
                        <Text fw={500} truncate>
                          {s.full_name}
                        </Text>
                      </Table.Td>
                      <Table.Td>
                        <Text ff="monospace" size="sm">
                          {s.matricula}
                        </Text>
                      </Table.Td>
                      <Table.Td>
                        <Text size="sm">{formatPhone(s.phone_number)}</Text>
                      </Table.Td>
                      <Table.Td>
                        <Badge
                          color={s.active ? "teal" : "gray"}
                          variant="light"
                        >
                          {s.active ? "Ativo" : "Inativo"}
                        </Badge>
                      </Table.Td>
                      <Table.Td>
                        {s.lid ? (
                          <Tooltip label={s.lid} withArrow>
                            <Badge variant="outline" color="blue">
                              vinculado
                            </Badge>
                          </Tooltip>
                        ) : (
                          <Tooltip
                            label="O aluno ainda não respondeu após o cadastro."
                            withArrow
                            multiline
                            maw={260}
                          >
                            <Badge variant="outline" color="gray">
                              pendente
                            </Badge>
                          </Tooltip>
                        )}
                      </Table.Td>
                      <Table.Td>
                        <Tooltip label="Remover">
                          <ActionIcon
                            color="red"
                            variant="subtle"
                            onClick={() => confirmDelete(s)}
                          >
                            <IconTrash size={16} />
                          </ActionIcon>
                        </Tooltip>
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

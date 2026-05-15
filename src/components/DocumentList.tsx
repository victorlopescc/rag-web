import {
  ActionIcon,
  Badge,
  Card,
  Group,
  Loader,
  Stack,
  Table,
  Text,
  Title,
  Tooltip,
} from "@mantine/core";
import { modals } from "@mantine/modals";
import { notifications } from "@mantine/notifications";
import {
  IconEye,
  IconFileDescription,
  IconRefresh,
  IconTrash,
} from "@tabler/icons-react";
import { useEffect, useState } from "react";

import { deleteDocument, listDocuments } from "../api/documents";
import type { DocumentOut } from "../api/documents";
import ChunkPreviewModal from "./ChunkPreviewModal";

const STATUS_LABEL: Record<
  DocumentOut["status"],
  { color: string; label: string }
> = {
  pending: { color: "gray", label: "Aguardando" },
  processing: { color: "yellow", label: "Processando" },
  indexed: { color: "teal", label: "Indexado" },
  error: { color: "red", label: "Erro" },
};

interface Props {
  refreshKey: number;
  onRefresh: () => void;
}

export default function DocumentList({ refreshKey, onRefresh }: Props) {
  const [docs, setDocs] = useState<DocumentOut[] | null>(null);
  const [loading, setLoading] = useState(false);

  async function reload() {
    setLoading(true);
    try {
      setDocs(await listDocuments());
    } catch {
      notifications.show({
        color: "red",
        title: "Erro",
        message: "Falha ao buscar documentos.",
      });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshKey]);

  async function handleDelete(doc: DocumentOut) {
    try {
      await deleteDocument(doc.id);
      notifications.show({
        color: "teal",
        title: "Removido",
        message: `${doc.filename} foi removido da base.`,
      });
      onRefresh();
    } catch {
      notifications.show({
        color: "red",
        title: "Erro",
        message: "Não foi possível remover o documento.",
      });
    }
  }

  function confirmDelete(doc: DocumentOut) {
    modals.openConfirmModal({
      title: "Remover documento",
      children: (
        <Text size="sm">
          Tem certeza que quer remover <b>{doc.filename}</b>? O documento e
          todos os seus chunks serão apagados do Postgres e do ChromaDB.
        </Text>
      ),
      labels: { confirm: "Remover", cancel: "Cancelar" },
      confirmProps: { color: "red" },
      onConfirm: () => handleDelete(doc),
    });
  }

  function openChunkPreview(doc: DocumentOut) {
    modals.open({
      title: `Chunks de ${doc.filename}`,
      size: "lg",
      children: (
        <ChunkPreviewModal documentId={doc.id} filename={doc.filename} />
      ),
    });
  }

  return (
    <Card shadow="sm" radius="md" p="lg" withBorder>
      <Stack gap="md">
        <Group justify="space-between">
          <Group gap="xs">
            <IconFileDescription size={20} />
            <Title order={4}>Documentos indexados</Title>
            {docs && (
              <Badge variant="light" size="sm">
                {docs.length}
              </Badge>
            )}
          </Group>
          <Tooltip label="Recarregar">
            <ActionIcon variant="subtle" onClick={onRefresh} loading={loading}>
              <IconRefresh size={18} />
            </ActionIcon>
          </Tooltip>
        </Group>

        {docs === null ? (
          <Group justify="center" py="xl">
            <Loader />
          </Group>
        ) : docs.length === 0 ? (
          <Stack gap={4} align="center" py="xl">
            <IconFileDescription size={36} color="var(--mantine-color-gray-5)" />
            <Text c="dimmed" ta="center">
              Nenhum documento indexado ainda.
            </Text>
            <Text c="dimmed" size="xs" ta="center">
              Envie um PDF, DOCX ou TXT no card ao lado.
            </Text>
          </Stack>
        ) : (
          <Table.ScrollContainer minWidth={720}>
            <Table
              verticalSpacing="sm"
              highlightOnHover
              layout="fixed"
              style={{ tableLayout: "fixed" }}
            >
              <Table.Thead>
                <Table.Tr>
                  <Table.Th style={{ width: "28%" }}>Arquivo</Table.Th>
                  <Table.Th style={{ width: "22%" }}>Categoria</Table.Th>
                  <Table.Th style={{ width: "9%" }}>Chunks</Table.Th>
                  <Table.Th style={{ width: "19%" }}>Status</Table.Th>
                  <Table.Th style={{ width: "16%" }}>Enviado em</Table.Th>
                  <Table.Th style={{ width: "12%" }} />
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {docs.map((d) => (
                  <Table.Tr key={d.id}>
                    <Table.Td>
                      <Tooltip
                        label={d.filename}
                        multiline
                        maw={420}
                        disabled={d.filename.length < 36}
                      >
                        <Text fw={500} truncate>
                          {d.filename}
                        </Text>
                      </Tooltip>
                      {d.description && (
                        <Text size="xs" c="dimmed" lineClamp={1}>
                          {d.description}
                        </Text>
                      )}
                    </Table.Td>
                    <Table.Td>
                      {d.category ? (
                        <Badge variant="outline" color="blue">
                          {d.category}
                        </Badge>
                      ) : (
                        <Text c="dimmed" size="sm">
                          —
                        </Text>
                      )}
                    </Table.Td>
                    <Table.Td>
                      <Text size="sm" ff="monospace">
                        {d.total_chunks}
                      </Text>
                    </Table.Td>
                    <Table.Td>
                      <Tooltip
                        label={d.error_msg ?? STATUS_LABEL[d.status].label}
                        disabled={!d.error_msg}
                        multiline
                        maw={320}
                      >
                        <Badge
                          color={STATUS_LABEL[d.status].color}
                          variant="light"
                        >
                          {STATUS_LABEL[d.status].label}
                        </Badge>
                      </Tooltip>
                    </Table.Td>
                    <Table.Td>
                      <Text size="sm">
                        {new Date(d.created_at).toLocaleDateString("pt-BR")}
                      </Text>
                      <Text size="xs" c="dimmed">
                        {new Date(d.created_at).toLocaleTimeString("pt-BR", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </Text>
                    </Table.Td>
                    <Table.Td>
                      <Group gap={4} wrap="nowrap">
                        <Tooltip label="Ver chunks">
                          <ActionIcon
                            color="blue"
                            variant="subtle"
                            onClick={() => openChunkPreview(d)}
                            disabled={d.total_chunks === 0}
                          >
                            <IconEye size={16} />
                          </ActionIcon>
                        </Tooltip>
                        <Tooltip label="Remover">
                          <ActionIcon
                            color="red"
                            variant="subtle"
                            onClick={() => confirmDelete(d)}
                          >
                            <IconTrash size={16} />
                          </ActionIcon>
                        </Tooltip>
                      </Group>
                    </Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          </Table.ScrollContainer>
        )}
      </Stack>
    </Card>
  );
}

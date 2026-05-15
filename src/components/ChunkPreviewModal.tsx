import {
  Badge,
  Card,
  Code,
  Group,
  Loader,
  Pagination,
  Stack,
  Text,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { useEffect, useState } from "react";

import { getDocumentChunks } from "../api/documents";
import type { ChunksPage } from "../api/documents";

interface Props {
  documentId: string | null;
  filename?: string;
}

const PAGE_SIZE = 10;

/**
 * Mostra os chunks de um documento paginados. Útil pro coordenador
 * verificar como o chunker fragmentou o doc. Chunks muito pequenos
 * indicam ruído, chunks muito grandes indicam que o limite foi
 * atingido sem encontrar boa fronteira.
 *
 * Uso típico: aberto via modal de DocumentList ao clicar no ícone "👁".
 */
export default function ChunkPreviewModal({ documentId, filename }: Props) {
  const [data, setData] = useState<ChunksPage | null>(null);
  const [page, setPage] = useState(1); // 1-indexed pra Mantine Pagination
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Guarda: documentId nulo → modal não abriu, nada a fazer.
    // (Em prática nunca acontece dentro de um modal aberto, mas prop
    // tipa como nullable pra simplificar a vida do caller.)
    if (!documentId) return;
    let cancelled = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    const offset = (page - 1) * PAGE_SIZE;
    getDocumentChunks(documentId, offset, PAGE_SIZE)
      .then((page) => {
        if (!cancelled) setData(page);
      })
      .catch(() => {
        if (!cancelled) {
          notifications.show({
            color: "red",
            title: "Erro",
            message: "Não foi possível carregar os chunks.",
          });
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [documentId, page]);

  if (!documentId) return null;

  const totalPages = data ? Math.ceil(data.total_chunks / PAGE_SIZE) : 1;

  return (
    <Stack gap="md">
      {filename && (
        <Group gap="xs" wrap="nowrap">
          <Text size="sm" c="dimmed">
            Arquivo:
          </Text>
          <Text size="sm" fw={500} truncate>
            {filename}
          </Text>
        </Group>
      )}

      {data && (
        <Group gap="xs">
          <Badge variant="light" color="blue">
            {data.total_chunks} chunks
          </Badge>
          <Text size="xs" c="dimmed">
            mostrando {data.offset + 1}–
            {Math.min(data.offset + data.limit, data.total_chunks)}
          </Text>
        </Group>
      )}

      {loading && !data ? (
        <Group justify="center" py="lg">
          <Loader />
        </Group>
      ) : data && data.chunks.length === 0 ? (
        <Text c="dimmed" ta="center" py="lg">
          Nenhum chunk encontrado.
        </Text>
      ) : (
        <Stack gap="sm">
          {data?.chunks.map((c) => (
            <Card key={c.chunk_index} withBorder radius="sm" p="sm">
              <Group justify="space-between" mb={6}>
                <Group gap="xs">
                  <Badge variant="outline" size="xs" color="gray">
                    #{c.chunk_index}
                  </Badge>
                  <Text size="xs" c="dimmed">
                    {c.char_count} chars
                    {c.token_count != null && ` • ~${c.token_count} tokens`}
                  </Text>
                </Group>
              </Group>
              <Code
                block
                style={{
                  fontSize: 12,
                  maxHeight: 180,
                  overflow: "auto",
                  whiteSpace: "pre-wrap",
                }}
              >
                {c.content}
              </Code>
            </Card>
          ))}
        </Stack>
      )}

      {totalPages > 1 && (
        <Group justify="center" pt="xs">
          <Pagination
            value={page}
            onChange={setPage}
            total={totalPages}
            size="sm"
            disabled={loading}
          />
        </Group>
      )}
    </Stack>
  );
}

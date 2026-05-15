import {
  Badge,
  Button,
  Card,
  Group,
  Select,
  Stack,
  Text,
  TextInput,
  Title,
  Tooltip,
} from "@mantine/core";
import { Dropzone, MIME_TYPES } from "@mantine/dropzone";
import { useForm } from "@mantine/form";
import { notifications } from "@mantine/notifications";
import {
  IconCheck,
  IconFileText,
  IconSparkles,
  IconUpload,
  IconX,
} from "@tabler/icons-react";
import { useState } from "react";

import { suggestCategory, uploadDocument } from "../api/documents";

interface Props {
  onUploaded: () => void;
}

const ACCEPTED_MIME = [MIME_TYPES.pdf, MIME_TYPES.docx, "text/plain"];

export default function DocumentUpload({ onUploaded }: Props) {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  // Sugestão automática que vem do backend ao soltar arquivo. Usado pra
  // mostrar uma badge "Sugerido" e pré-preencher o campo categoria.
  const [suggestedCategory, setSuggestedCategory] = useState<string | null>(null);
  // Lista de categorias já registradas no sistema (vinda do mesmo
  // endpoint). Vira o data do Select. Permite criar nova categoria.
  const [availableCategories, setAvailableCategories] = useState<string[]>([]);
  const [suggestLoading, setSuggestLoading] = useState(false);

  const form = useForm({
    initialValues: { category: "", description: "" },
  });

  async function handleFileSelected(picked: File | null) {
    setFile(picked);
    setSuggestedCategory(null);
    if (!picked) return;
    // Pede sugestão de categoria pro backend. Falhas aqui são silenciosas
    // (não bloqueiam o upload; coordenador pode digitar manualmente).
    setSuggestLoading(true);
    try {
      const out = await suggestCategory(picked);
      setSuggestedCategory(out.suggested_category);
      setAvailableCategories(out.available_categories);
      // Só pré-preenche se o coordenador ainda não digitou nada.
      if (out.suggested_category && !form.values.category) {
        form.setFieldValue("category", out.suggested_category);
      }
    } catch {
      // Silencioso: backend pode estar fora do ar / arquivo grande.
      // Coordenador segue editando manualmente.
    } finally {
      setSuggestLoading(false);
    }
  }

  async function handleSubmit(values: typeof form.values) {
    if (!file) {
      notifications.show({
        color: "red",
        title: "Arquivo obrigatório",
        message: "Arraste um PDF, DOCX ou TXT na área acima.",
      });
      return;
    }
    setLoading(true);
    try {
      await uploadDocument(file, values.category || undefined, values.description || undefined);
      notifications.show({
        color: "teal",
        title: "Documento indexado",
        message: `${file.name} foi processado e está disponível para consulta.`,
        icon: <IconCheck size={18} />,
      });
      form.reset();
      setFile(null);
      setSuggestedCategory(null);
      onUploaded();
    } catch (e: unknown) {
      const msg =
        (e as { response?: { data?: { detail?: string } } })?.response?.data
          ?.detail ?? "Falha no upload. Verifique o backend e tente de novo.";
      notifications.show({
        color: "red",
        title: "Erro",
        message: msg,
        icon: <IconX size={18} />,
      });
    } finally {
      setLoading(false);
    }
  }

  // Combina sugestão + lista atual + valor digitado no Select. Permite
  // criar nova categoria (não restritivo). Útil quando o coordenador
  // sobe um doc de tópico ainda não cadastrado.
  const selectData = Array.from(
    new Set(
      [
        ...availableCategories,
        suggestedCategory ?? "",
        form.values.category,
      ].filter((s) => s && s.length > 0),
    ),
  );

  // Mostra a badge de sugestão quando o backend devolveu algo E o valor
  // atual do form bate com a sugestão (sinaliza visualmente que veio
  // do auto-detect, não do coordenador). Coordenador editou? Some.
  const showSuggestionBadge =
    suggestedCategory != null && form.values.category === suggestedCategory;

  return (
    <Card shadow="sm" radius="md" p="lg" withBorder>
      <Stack gap="md">
        <Title order={4}>Indexar novo documento</Title>

        <Dropzone
          onDrop={(files) => handleFileSelected(files[0] ?? null)}
          accept={ACCEPTED_MIME}
          maxFiles={1}
          maxSize={50 * 1024 ** 2}
          loading={loading}
        >
          <Group
            justify="center"
            gap="sm"
            mih={110}
            style={{ pointerEvents: "none" }}
          >
            <Dropzone.Accept>
              <IconUpload size={40} color="var(--mantine-color-teal-6)" />
            </Dropzone.Accept>
            <Dropzone.Reject>
              <IconX size={40} color="var(--mantine-color-red-6)" />
            </Dropzone.Reject>
            <Dropzone.Idle>
              <IconFileText size={40} color="var(--mantine-color-blue-6)" />
            </Dropzone.Idle>

            <Stack gap={2}>
              <Text size="md" fw={500}>
                {file ? file.name : "Arraste um arquivo aqui ou clique para selecionar"}
              </Text>
              <Text size="xs" c="dimmed">
                Aceita PDF, DOCX, TXT • até 50 MB
              </Text>
            </Stack>
          </Group>
        </Dropzone>

        <form onSubmit={form.onSubmit(handleSubmit)}>
          <Stack gap="sm">
            <Stack gap={4}>
              <Group gap="xs" align="center">
                <Text size="sm" fw={500}>
                  Categoria
                </Text>
                {suggestLoading && (
                  <Text size="xs" c="dimmed">
                    detectando...
                  </Text>
                )}
                {showSuggestionBadge && (
                  <Tooltip
                    label="Categoria pré-preenchida automaticamente. Você pode trocar."
                    multiline
                    maw={260}
                  >
                    <Badge
                      size="xs"
                      variant="light"
                      color="grape"
                      leftSection={<IconSparkles size={10} />}
                    >
                      Sugerido
                    </Badge>
                  </Tooltip>
                )}
              </Group>
              <Select
                placeholder="Selecione ou digite uma nova categoria"
                data={selectData}
                searchable
                clearable
                allowDeselect
                // Permite criar nova categoria digitada (útil pra docs
                // de tópico ainda não cadastrado). Mantine Select com
                // searchable + creatable behavior via getCreateLabel.
                onSearchChange={(val) => {
                  // Quando o user digita algo que não está na lista,
                  // preserva no form pra ser submetido.
                  form.setFieldValue("category", val);
                }}
                {...form.getInputProps("category")}
              />
            </Stack>
            <TextInput
              label="Descrição (opcional)"
              placeholder="Resumo curto do documento"
              {...form.getInputProps("description")}
            />
            <Group justify="flex-end">
              <Button
                type="submit"
                loading={loading}
                leftSection={<IconUpload size={16} />}
              >
                Enviar e indexar
              </Button>
            </Group>
          </Stack>
        </form>
      </Stack>
    </Card>
  );
}

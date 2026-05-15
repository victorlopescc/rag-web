import {
  Alert,
  Badge,
  Button,
  Card,
  Group,
  Paper,
  Stack,
  Text,
  TextInput,
  Title,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { notifications } from "@mantine/notifications";
import {
  IconAlertCircle,
  IconRobot,
  IconSend,
  IconSparkles,
} from "@tabler/icons-react";
import { useState } from "react";

import { askBot, type QueryResponse } from "../api/query";

/**
 * Lets the coordinator ask the RAG directly, without going through WhatsApp.
 * Useful to sanity-check if the bot can answer a question before documents
 * ship, or to preview what a student would receive.
 */
export default function TestBotCard() {
  const [result, setResult] = useState<QueryResponse | null>(null);
  const [loading, setLoading] = useState(false);

  const form = useForm({
    initialValues: { question: "", category: "" },
    validate: {
      question: (v) => (v.trim().length < 3 ? "Escreva uma pergunta" : null),
    },
  });

  async function onSubmit(values: typeof form.values) {
    setLoading(true);
    setResult(null);
    try {
      const res = await askBot({
        question: values.question.trim(),
        category: values.category.trim() || undefined,
      });
      setResult(res);
    } catch (e: unknown) {
      const detail =
        (e as { response?: { data?: { detail?: string } } })?.response?.data
          ?.detail ?? "Falha ao consultar o bot.";
      notifications.show({
        color: "red",
        title: "Erro",
        message: detail,
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card withBorder radius="md" p="lg">
      <Stack gap="md">
        <Group gap="xs">
          <IconRobot size={20} />
          <Title order={5}>Testar o bot</Title>
          <Badge variant="light" color="grape">
            Prévia
          </Badge>
        </Group>
        <Text size="sm" c="dimmed">
          Pergunta direto ao RAG sem passar pelo WhatsApp. Ideal para conferir
          se um novo documento foi bem indexado.
        </Text>

        <form onSubmit={form.onSubmit(onSubmit)}>
          <Stack gap="sm">
            <TextInput
              label="Pergunta"
              placeholder="Ex.: Qual a duração do curso de Computação?"
              {...form.getInputProps("question")}
            />
            <TextInput
              label="Categoria (opcional)"
              description="Se informada, a busca é restrita a essa categoria."
              placeholder="Ex.: regulamento"
              {...form.getInputProps("category")}
            />
            <Group justify="flex-end">
              <Button
                type="submit"
                loading={loading}
                leftSection={<IconSend size={16} />}
              >
                Perguntar
              </Button>
            </Group>
          </Stack>
        </form>

        {result && (
          <Paper withBorder p="md" radius="sm">
            <Stack gap="xs">
              <Group gap="xs">
                <IconSparkles
                  size={16}
                  color="var(--mantine-color-blue-6)"
                />
                <Text fw={500} size="sm">
                  Resposta do bot
                </Text>
                <Badge size="xs" variant="outline">
                  {result.latency_ms} ms
                </Badge>
                {result.was_fallback && (
                  <Badge size="xs" color="red" variant="light">
                    fallback
                  </Badge>
                )}
              </Group>
              {result.was_fallback && (
                <Alert
                  color="red"
                  variant="light"
                  icon={<IconAlertCircle size={16} />}
                >
                  O bot não encontrou conteúdo relevante e retornou a mensagem
                  padrão. Considere adicionar um documento sobre o tema.
                </Alert>
              )}
              <Text style={{ whiteSpace: "pre-wrap" }} size="sm">
                {result.answer}
              </Text>
            </Stack>
          </Paper>
        )}
      </Stack>
    </Card>
  );
}

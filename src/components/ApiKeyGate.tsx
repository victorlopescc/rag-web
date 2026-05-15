import {
  Button,
  Card,
  Center,
  Container,
  PasswordInput,
  Stack,
  Text,
  Title,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { notifications } from "@mantine/notifications";
import { IconLock } from "@tabler/icons-react";
import { useState } from "react";

import { setApiKey } from "../lib/apiKey";
import { api } from "../api/client";

interface Props {
  onUnlock: () => void;
}

/**
 * Solicita a API key do admin e valida batendo em /documents.
 * Se passar, grava no localStorage e libera o painel.
 */
export default function ApiKeyGate({ onUnlock }: Props) {
  const [loading, setLoading] = useState(false);
  const form = useForm({
    initialValues: { key: "" },
    validate: { key: (v) => (v.trim() ? null : "Informe a chave") },
  });

  async function onSubmit(values: typeof form.values) {
    setLoading(true);
    setApiKey(values.key.trim());
    try {
      await api.get("/documents");
      onUnlock();
    } catch (e: unknown) {
      const status = (e as { response?: { status?: number } })?.response?.status;
      notifications.show({
        color: "red",
        title: "Falha ao validar",
        message:
          status === 401
            ? "API key inválida."
            : "Não foi possível contatar o backend. Verifique se está rodando.",
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <Center mih="100vh" bg="var(--mantine-color-gray-0)" p="md">
      <Container size={420} w="100%">
        <Card shadow="md" radius="md" p="xl" withBorder>
          <Stack gap="lg">
            <Stack gap={4} align="center">
              <IconLock size={40} color="var(--mantine-color-blue-6)" />
              <Title order={2}>Acesso restrito</Title>
              <Text c="dimmed" size="sm" ta="center">
                Informe a API key do backend (variável{" "}
                <code>API_SECRET_KEY</code>) para gerenciar documentos.
              </Text>
            </Stack>

            <form onSubmit={form.onSubmit(onSubmit)}>
              <Stack gap="sm">
                <PasswordInput
                  label="API key"
                  placeholder="••••••••"
                  withAsterisk
                  {...form.getInputProps("key")}
                />
                <Button type="submit" loading={loading} fullWidth>
                  Entrar
                </Button>
              </Stack>
            </form>
          </Stack>
        </Card>
      </Container>
    </Center>
  );
}

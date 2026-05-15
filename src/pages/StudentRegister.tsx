import {
  Alert,
  Anchor,
  Button,
  Card,
  Center,
  Checkbox,
  Container,
  Group,
  List,
  Stack,
  Text,
  TextInput,
  Title,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { notifications } from "@mantine/notifications";
import {
  IconAlertTriangle,
  IconBrandWhatsapp,
  IconCheck,
  IconX,
} from "@tabler/icons-react";
import { useState } from "react";
import { Link } from "react-router-dom";

import { registerStudent } from "../api/students";
import { maskMatricula, maskPhone, unmaskDigits } from "../lib/masks";

const PHONE_HINT = "Digite só números com DDD; o formato é aplicado automaticamente.";

export default function StudentRegister() {
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const form = useForm({
    initialValues: {
      full_name: "",
      matricula: "",
      phone_number: "",
      data_consent: false,
    },
    validate: {
      full_name: (v) => (v.trim().length < 3 ? "Digite seu nome completo" : null),
      matricula: (v) =>
        /^\d{6}$/.test(v.trim()) ? null : "A matrícula deve ter exatamente 6 dígitos.",
      phone_number: (v) => {
        const digits = unmaskDigits(v);
        if (digits.length < 10 || digits.length > 13) return "Telefone inválido";
        return null;
      },
      data_consent: (v) =>
        v ? null : "Você precisa concordar com o uso dos dados para continuar.",
    },
  });

  async function onSubmit(values: typeof form.values) {
    setLoading(true);
    try {
      await registerStudent({
        full_name: values.full_name.trim(),
        // Máscara só visual; backend recebe os dígitos limpos.
        matricula: unmaskDigits(values.matricula),
        phone_number: unmaskDigits(values.phone_number),
        data_consent: values.data_consent,
      });
      setDone(true);
      notifications.show({
        color: "teal",
        title: "Cadastro realizado!",
        message: "Você vai receber uma mensagem de boas-vindas no WhatsApp.",
        icon: <IconCheck size={18} />,
      });
    } catch (e: unknown) {
      const msg =
        (e as { response?: { data?: { detail?: string } } })?.response?.data
          ?.detail ?? "Não foi possível concluir o cadastro. Tente novamente.";
      notifications.show({
        color: "red",
        title: "Erro no cadastro",
        message: msg,
        icon: <IconX size={18} />,
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <Center mih="100vh" bg="var(--mantine-color-gray-0)" p="md">
      <Container size={460} w="100%">
        <Card shadow="md" radius="md" p="xl" withBorder>
          <Stack gap="lg">
            <Stack gap={4} align="center">
              <IconBrandWhatsapp size={40} color="var(--mantine-color-teal-6)" />
              <Title order={2} ta="center">
                Coordenação de Computação
              </Title>
              <Text c="dimmed" ta="center" size="sm">
                Cadastre-se para tirar dúvidas do curso pelo WhatsApp.
              </Text>
            </Stack>

            {done ? (
              <Stack align="center" py="md">
                <IconCheck size={48} color="var(--mantine-color-teal-6)" />
                <Text fw={600}>Cadastro concluído!</Text>
                <Text c="dimmed" size="sm" ta="center">
                  Abra o WhatsApp. Você vai receber uma mensagem de boas-vindas
                  em instantes. A partir daí é só enviar suas perguntas por lá.
                </Text>
                <Button
                  variant="subtle"
                  onClick={() => {
                    form.reset();
                    setDone(false);
                  }}
                >
                  Cadastrar outro aluno
                </Button>
              </Stack>
            ) : (
              <form onSubmit={form.onSubmit(onSubmit)}>
                <Stack gap="sm">
                  {/* Aviso destacado ANTES do formulário: o aluno
                      precisa ler isso pra entender no que está se
                      inscrevendo. Não basta uma linha discreta no
                      consent, esse projeto é piloto experimental e
                      o bot pode errar. */}
                  <Alert
                    color="yellow"
                    icon={<IconAlertTriangle size={18} />}
                    title="Antes de continuar, leia com atenção"
                    radius="md"
                  >
                    <List size="sm" spacing={4} mt={4}>
                      <List.Item>
                        Este é um <b>piloto experimental</b> do projeto de
                        TCC. O bot vai responder dúvidas sobre o curso,
                        mas <b>pode errar</b>. Sempre confirme
                        informações críticas (prazos, regras de TCC,
                        carga horária) com a coordenação.
                      </List.Item>
                      <List.Item>
                        Suas mensagens serão analisadas <b>de forma
                        anonimizada</b> para a pesquisa acadêmica. Nenhum
                        dado pessoal será publicado.
                      </List.Item>
                      <List.Item>
                        O número fica ativo por <b>uma semana</b>; depois
                        disso, é desativado.
                      </List.Item>
                      <List.Item>
                        Para falar direto com o coordenador a qualquer
                        momento, envie <b>/coordenador</b> no WhatsApp.
                      </List.Item>
                    </List>
                  </Alert>

                  <TextInput
                    label="Nome completo"
                    placeholder="Ex.: Maria da Silva"
                    withAsterisk
                    {...form.getInputProps("full_name")}
                  />
                  <TextInput
                    label="Matrícula"
                    placeholder="Ex.: 202600"
                    description="6 dígitos"
                    withAsterisk
                    inputMode="numeric"
                    maxLength={6}
                    {...form.getInputProps("matricula")}
                    onChange={(e) =>
                      form.setFieldValue(
                        "matricula",
                        maskMatricula(e.currentTarget.value),
                      )
                    }
                  />
                  <TextInput
                    label="Telefone (WhatsApp)"
                    placeholder="(31) 99999-9999"
                    description={PHONE_HINT}
                    withAsterisk
                    inputMode="numeric"
                    {...form.getInputProps("phone_number")}
                    onChange={(e) =>
                      form.setFieldValue(
                        "phone_number",
                        maskPhone(e.currentTarget.value),
                      )
                    }
                  />
                  <Checkbox
                    mt="xs"
                    label={
                      <Text size="sm">
                        Li os avisos acima, entendo que o bot é experimental
                        e <b>pode cometer erros</b>, e autorizo o uso anônimo
                        das minhas interações para fins de pesquisa acadêmica
                        (TCC de Ciência da Computação).
                      </Text>
                    }
                    {...form.getInputProps("data_consent", { type: "checkbox" })}
                  />
                  <Button type="submit" loading={loading} fullWidth mt="sm">
                    Cadastrar
                  </Button>
                </Stack>
              </form>
            )}
          </Stack>
        </Card>

        <Group justify="center" mt="md">
          <Anchor component={Link} to="/admin" size="xs" c="dimmed">
            Área do coordenador
          </Anchor>
        </Group>
      </Container>
    </Center>
  );
}

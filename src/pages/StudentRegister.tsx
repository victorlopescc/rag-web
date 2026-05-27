import {
  Anchor,
  Badge,
  Button,
  Card,
  Center,
  Checkbox,
  Collapse,
  Container,
  Group,
  Paper,
  Stack,
  Text,
  TextInput,
  Title,
  UnstyledButton,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { useDisclosure } from "@mantine/hooks";
import { notifications } from "@mantine/notifications";
import {
  IconAlertTriangle,
  IconBrandWhatsapp,
  IconCheck,
  IconChevronDown,
  IconX,
} from "@tabler/icons-react";
import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";

import {
  getRegistrationStatus,
  registerStudent,
  type StudentRegisterOut,
} from "../api/students";
import { maskMatricula, maskPhone, unmaskDigits } from "../lib/masks";

const PHONE_HINT = "Digite só números com DDD; o formato é aplicado automaticamente.";

export default function StudentRegister() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<StudentRegisterOut | null>(null);
  const [activated, setActivated] = useState(false);
  const [warningsOpen, { toggle: toggleWarnings }] = useDisclosure(false);
  const pollRef = useRef<number | null>(null);

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

  // Polling pra detectar quando o aluno envia a 1ª mensagem pelo WhatsApp.
  // Roda só enquanto temos um result e ainda não foi ativado. Cada 3s,
  // até 5 minutos (=100 tentativas) ou até ativar — o que vier antes.
  useEffect(() => {
    if (!result || activated) return;
    if (result.registration_completed) {
      setActivated(true);
      return;
    }

    let attempts = 0;
    const MAX_ATTEMPTS = 100;
    const POLL_INTERVAL_MS = 3000;

    const tick = async () => {
      attempts += 1;
      if (attempts > MAX_ATTEMPTS) {
        // Para o polling após 5 min — o aluno ainda pode ativar depois,
        // mas não vamos ficar consumindo a API indefinidamente.
        if (pollRef.current) {
          window.clearInterval(pollRef.current);
          pollRef.current = null;
        }
        return;
      }
      try {
        const status = await getRegistrationStatus(result.id);
        if (status.registration_completed) {
          setActivated(true);
          if (pollRef.current) {
            window.clearInterval(pollRef.current);
            pollRef.current = null;
          }
        }
      } catch {
        // erros de rede silenciosos — próxima tentativa cobre
      }
    };

    pollRef.current = window.setInterval(tick, POLL_INTERVAL_MS);
    return () => {
      if (pollRef.current) {
        window.clearInterval(pollRef.current);
        pollRef.current = null;
      }
    };
  }, [result, activated]);

  async function onSubmit(values: typeof form.values) {
    setLoading(true);
    try {
      const res = await registerStudent({
        full_name: values.full_name.trim(),
        matricula: unmaskDigits(values.matricula),
        phone_number: unmaskDigits(values.phone_number),
        data_consent: values.data_consent,
      });
      setResult(res);
      setActivated(res.registration_completed);
      notifications.show({
        color: "teal",
        title: "Cadastro realizado!",
        message: "Agora clique no botão abaixo pra iniciar a conversa com o bot.",
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

  function resetForm() {
    form.reset();
    setResult(null);
    setActivated(false);
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

            {result ? (
              activated ? (
                /* Cadastro já ativado — confirmação final */
                <Stack align="center" py="md" gap="sm">
                  <IconCheck size={48} color="var(--mantine-color-teal-6)" />
                  <Text fw={600}>Cadastro ativado! 🎓</Text>
                  <Text c="dimmed" size="sm" ta="center">
                    Tudo certo. Continue a conversa no WhatsApp — pode mandar
                    qualquer dúvida sobre o curso por lá.
                  </Text>
                  <Button variant="subtle" onClick={resetForm} mt="sm">
                    Cadastrar outro aluno
                  </Button>
                </Stack>
              ) : (
                /* Cadastrado mas ainda precisa enviar a 1ª mensagem */
                <Stack gap="md">
                  <Stack align="center" gap="xs">
                    <IconCheck size={48} color="var(--mantine-color-teal-6)" />
                    <Text fw={600}>Cadastro criado!</Text>
                    <Text c="dimmed" size="sm" ta="center">
                      Falta só <b>um passo</b>: enviar a primeira mensagem pelo
                      WhatsApp pra ativar o bot.
                    </Text>
                  </Stack>

                  <Paper
                    withBorder
                    radius="md"
                    p="md"
                    style={{
                      backgroundColor: "var(--mantine-color-teal-light)",
                      borderColor: "var(--mantine-color-teal-light-color)",
                    }}
                  >
                    <Stack gap="sm">
                      <Text size="sm">
                        Clique no botão abaixo. Ele vai abrir o WhatsApp já
                        com uma mensagem pronta — é só apertar <b>enviar</b> e o
                        bot vai te responder com as boas-vindas.
                      </Text>
                      {result.whatsapp_link ? (
                        <Button
                          component="a"
                          href={result.whatsapp_link}
                          target="_blank"
                          rel="noopener noreferrer"
                          leftSection={<IconBrandWhatsapp size={20} />}
                          color="teal"
                          size="md"
                          fullWidth
                        >
                          Abrir WhatsApp e enviar mensagem
                        </Button>
                      ) : (
                        <Text size="xs" c="dimmed">
                          Link indisponível no momento. Avise o administrador.
                        </Text>
                      )}
                      <Group gap="xs" justify="center">
                        <Badge variant="dot" color="teal" size="sm">
                          Aguardando sua primeira mensagem...
                        </Badge>
                      </Group>
                    </Stack>
                  </Paper>

                  <Text size="xs" c="dimmed" ta="center">
                    Quando você enviar a mensagem, essa tela atualiza
                    automaticamente.
                  </Text>

                  <Button variant="subtle" size="xs" onClick={resetForm}>
                    Cadastrar outro aluno
                  </Button>
                </Stack>
              )
            ) : (
              <form onSubmit={form.onSubmit(onSubmit)}>
                <Stack gap="sm">
                  {/* Aviso colapsável: o cabeçalho fica sempre visível
                      pra o aluno saber que existe um aviso, mas o
                      conteúdo só aparece se ele tocar. */}
                  <Paper
                    withBorder
                    radius="md"
                    style={{
                      backgroundColor: "var(--mantine-color-yellow-light)",
                      borderColor: "var(--mantine-color-yellow-light-color)",
                    }}
                  >
                    <UnstyledButton
                      onClick={toggleWarnings}
                      w="100%"
                      p="sm"
                      aria-expanded={warningsOpen}
                    >
                      <Group justify="space-between" gap="xs" wrap="nowrap">
                        <Group gap="xs" wrap="nowrap">
                          <IconAlertTriangle
                            size={18}
                            color="var(--mantine-color-yellow-light-color)"
                          />
                          <Text size="sm" fw={600}>
                            Antes de continuar, leia com atenção
                          </Text>
                        </Group>
                        <IconChevronDown
                          size={16}
                          style={{
                            transform: warningsOpen ? "rotate(180deg)" : "none",
                            transition: "transform 200ms ease",
                          }}
                        />
                      </Group>
                    </UnstyledButton>
                    <Collapse expanded={warningsOpen}>
                      <Stack gap={6} px="sm" pb="sm">
                        <Text size="sm">
                          • Este é um <b>piloto experimental</b> do projeto
                          de TCC. O bot vai responder dúvidas sobre o curso,
                          mas <b>pode errar</b>. Sempre confirme informações
                          críticas (prazos, regras de TCC, carga horária)
                          com a coordenação.
                        </Text>
                        <Text size="sm">
                          • Suas mensagens serão analisadas <b>de forma
                          anonimizada</b> para a pesquisa acadêmica. Nenhum
                          dado pessoal será publicado.
                        </Text>
                        <Text size="sm">
                          • O número fica ativo por <b>uma semana</b>;
                          depois disso, é desativado.
                        </Text>
                        <Text size="sm">
                          • Para falar direto com o coordenador a qualquer
                          momento, envie <b>/coordenador</b> no WhatsApp.
                        </Text>
                      </Stack>
                    </Collapse>
                  </Paper>

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

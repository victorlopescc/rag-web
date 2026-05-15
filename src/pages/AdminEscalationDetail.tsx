import {
  Alert,
  Badge,
  Button,
  Card,
  Container,
  Divider,
  Group,
  Loader,
  Paper,
  Select,
  Stack,
  Text,
  Textarea,
  Timeline,
  Title,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { notifications } from "@mantine/notifications";
import {
  IconArrowLeft,
  IconCheck,
  IconMessageCircle,
  IconSend,
} from "@tabler/icons-react";
import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";

import {
  getEscalation,
  patchEscalation,
  replyEscalation,
  type CoordinatorLabel,
  type EscalationDetail,
} from "../api/escalations";
import LiveThread from "../components/LiveThread";

const LABEL_OPTIONS: { value: CoordinatorLabel; label: string }[] = [
  { value: "bot_was_wrong", label: "Bot errou" },
  { value: "missing_document", label: "Documento faltando" },
  { value: "student_misunderstood", label: "Aluno não entendeu" },
  { value: "other", label: "Outro" },
];

const SIGNAL_LABEL: Record<string, string> = {
  explicit_yes: "✅ aluno disse sim",
  explicit_no: "❌ aluno disse não",
  implicit_rephrase: "↻ aluno reformulou",
  implicit_new_topic: "↗ novo tópico",
  timeout: "⏱ timeout",
};

export default function AdminEscalationDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [esc, setEsc] = useState<EscalationDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [savingMeta, setSavingMeta] = useState(false);

  const form = useForm({
    initialValues: {
      message: "",
      coordinator_label: "" as CoordinatorLabel | "",
      coordinator_notes: "",
    },
    validate: {
      message: (v) => (v.trim().length >= 3 ? null : "Escreva a resposta."),
    },
  });

  async function reload() {
    if (!id) return;
    setLoading(true);
    try {
      const data = await getEscalation(id);
      setEsc(data);
      form.setValues({
        message: "",
        coordinator_label: (data.coordinator_label ?? "") as CoordinatorLabel | "",
        coordinator_notes: data.coordinator_notes ?? "",
      });
    } catch {
      notifications.show({
        color: "red",
        title: "Erro",
        message: "Escalação não encontrada.",
      });
      navigate("/admin/escalations");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function onReply(values: typeof form.values) {
    if (!id) return;
    setSending(true);
    try {
      const updated = await replyEscalation(id, {
        message: values.message.trim(),
        coordinator_label: values.coordinator_label || undefined,
        coordinator_notes: values.coordinator_notes?.trim() || undefined,
      });
      setEsc(updated);
      form.setFieldValue("message", "");
      notifications.show({
        color: "teal",
        title: "Resposta enviada",
        message: "O aluno receberá pelo WhatsApp.",
        icon: <IconCheck size={16} />,
      });
    } catch (e: unknown) {
      const detail =
        (e as { response?: { data?: { detail?: string } } })?.response?.data
          ?.detail ?? "Falha ao enviar resposta.";
      notifications.show({
        color: "red",
        title: "Erro",
        message: detail,
      });
    } finally {
      setSending(false);
    }
  }

  async function saveMetadataOnly() {
    if (!id || !esc) return;
    setSavingMeta(true);
    try {
      const updated = await patchEscalation(id, {
        coordinator_label: (form.values.coordinator_label || undefined) as
          | CoordinatorLabel
          | undefined,
        coordinator_notes: form.values.coordinator_notes || undefined,
      });
      setEsc(updated);
      notifications.show({
        color: "teal",
        title: "Salvo",
        message: "Rótulos e notas atualizados.",
      });
    } catch {
      notifications.show({
        color: "red",
        title: "Erro",
        message: "Não foi possível salvar.",
      });
    } finally {
      setSavingMeta(false);
    }
  }

  if (loading || !esc) {
    return (
      <Container size="md" py="xl">
        <Group justify="center">
          <Loader />
        </Group>
      </Container>
    );
  }

  const alreadyReplied = esc.status === "coordinator_replied";
  // Quando a thread já passou da fase de "responder uma vez" (live ou
  // terminal), escondemos o card legado de resposta única; coordenador
  // só interage pelo chat ao vivo.
  const inThreadMode =
    esc.status === "live" ||
    esc.status === "resolved" ||
    esc.status === "abandoned";

  return (
    <Container size="md">
      <Stack gap="md">
        <Group>
          <Button
            component={Link}
            to="/admin/escalations"
            variant="subtle"
            leftSection={<IconArrowLeft size={16} />}
          >
            Voltar
          </Button>
        </Group>

        <Card withBorder radius="md" p="lg">
          <Stack gap="xs">
            <Group justify="space-between" wrap="nowrap">
              <Title order={4}>{esc.student.full_name}</Title>
              <Badge color={alreadyReplied ? "teal" : "yellow"} variant="light">
                {alreadyReplied ? "Respondida" : "Pendente"}
              </Badge>
            </Group>
            <Text size="sm" c="dimmed">
              Matrícula {esc.student.matricula} • {esc.student.phone_number}
            </Text>
            <Text size="xs" c="dimmed">
              Criada em {new Date(esc.created_at).toLocaleString("pt-BR")}
              {esc.replied_at &&
                ` • respondida em ${new Date(esc.replied_at).toLocaleString("pt-BR")}`}
            </Text>
          </Stack>
        </Card>

        <Card withBorder radius="md" p="lg">
          <Stack gap="xs">
            <Title order={5}>Resumo (gerado por IA)</Title>
            <Paper withBorder p="md" radius="sm">
              <Text style={{ whiteSpace: "pre-wrap" }}>{esc.summary}</Text>
            </Paper>
            {esc.closing_feedback && (
              <Text size="xs" c="dimmed">
                Voto do aluno na enquete:{" "}
                <Badge variant="outline">{esc.closing_feedback}</Badge>
              </Text>
            )}
          </Stack>
        </Card>

        <Card withBorder radius="md" p="lg">
          <Stack gap="md">
            <Title order={5}>Histórico das tentativas do bot</Title>
            <Timeline active={esc.attempts.length - 1} bulletSize={24} lineWidth={2}>
              {esc.attempts.map((a) => (
                <Timeline.Item
                  key={a.attempt_number}
                  bullet={<IconMessageCircle size={12} />}
                  title={
                    <Group gap="xs">
                      <Text fw={500}>Tentativa {a.attempt_number}</Text>
                      <Badge size="xs" variant="light">
                        {a.retrieval_strategy}
                      </Badge>
                      {a.was_fallback && (
                        <Badge size="xs" color="red" variant="light">
                          fallback
                        </Badge>
                      )}
                    </Group>
                  }
                >
                  <Stack gap={4} mt={4}>
                    <Text size="sm">
                      <Text span c="dimmed">
                        Aluno:
                      </Text>{" "}
                      {a.question}
                    </Text>
                    <Text size="sm">
                      <Text span c="dimmed">
                        Bot:
                      </Text>{" "}
                      {a.answer}
                    </Text>
                    {a.feedback_signal && (
                      <Text size="xs" c="dimmed">
                        {SIGNAL_LABEL[a.feedback_signal] ?? a.feedback_signal}
                      </Text>
                    )}
                  </Stack>
                </Timeline.Item>
              ))}
            </Timeline>
          </Stack>
        </Card>

        {/* Live thread: aparece sempre. No estado pending/coordinator_replied
            mostra um CTA "Iniciar conversa"; em live mostra chat; em estado
            terminal mostra histórico read-only. */}
        <LiveThread escalation={esc} onChanged={setEsc} />

        {!inThreadMode && (
        <Card withBorder radius="md" p="lg">
          <form onSubmit={form.onSubmit(onReply)}>
            <Stack gap="md">
              <Title order={5}>Resposta única (sem conversa ao vivo)</Title>
              <Text size="xs" c="dimmed">
                Use quando a dúvida pode ser resolvida com uma única mensagem.
                Para um diálogo, prefira iniciar a conversa ao vivo acima.
              </Text>

              {alreadyReplied && esc.coordinator_reply && (
                <Alert color="teal" title="Já respondida">
                  <Text size="sm" style={{ whiteSpace: "pre-wrap" }}>
                    {esc.coordinator_reply}
                  </Text>
                </Alert>
              )}

              {!alreadyReplied && (
                <Textarea
                  autosize
                  minRows={4}
                  label="Mensagem ao aluno"
                  description="Será enviada via WhatsApp com identificação da coordenação."
                  placeholder="Ex.: A duração do curso é de 8 semestres. Você encontra isso no PPC, seção 3.2..."
                  withAsterisk
                  {...form.getInputProps("message")}
                />
              )}

              <Divider />

              <Text size="sm" fw={500}>
                Classificação (dados para a análise da tese)
              </Text>

              <Select
                label="Rótulo"
                placeholder="Selecione"
                data={LABEL_OPTIONS}
                clearable
                {...form.getInputProps("coordinator_label")}
              />

              <Textarea
                autosize
                minRows={2}
                label="Notas internas"
                description="Opcional. Não vai para o aluno."
                {...form.getInputProps("coordinator_notes")}
              />

              <Group justify="flex-end">
                <Button
                  variant="default"
                  loading={savingMeta}
                  onClick={saveMetadataOnly}
                >
                  Salvar notas
                </Button>
                {!alreadyReplied && (
                  <Button
                    type="submit"
                    loading={sending}
                    leftSection={<IconSend size={16} />}
                  >
                    Enviar resposta
                  </Button>
                )}
              </Group>
            </Stack>
          </form>
        </Card>
        )}
      </Stack>
    </Container>
  );
}

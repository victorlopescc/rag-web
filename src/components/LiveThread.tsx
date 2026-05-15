import {
  ActionIcon,
  Alert,
  Badge,
  Box,
  Button,
  Card,
  Group,
  Loader,
  Modal,
  Paper,
  ScrollArea,
  Stack,
  Text,
  Textarea,
  Title,
  Tooltip,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import {
  IconCheck,
  IconLock,
  IconPlayerPlay,
  IconRefresh,
  IconSend,
} from "@tabler/icons-react";
import { useEffect, useRef, useState } from "react";

import {
  closeThread,
  getEscalation,
  getThread,
  sendThreadMessage,
  startThread,
  type EscalationDetail,
  type ThreadView,
} from "../api/escalations";

interface Props {
  escalation: EscalationDetail;
  onChanged: (next: EscalationDetail) => void;
}

const POLL_INTERVAL_MS = 5000;

// Estados terminais: thread fechada, sem UI de envio.
const TERMINAL_STATUSES: ReadonlySet<EscalationDetail["status"]> = new Set([
  "resolved",
  "abandoned",
]);

export default function LiveThread({ escalation, onChanged }: Props) {
  const [thread, setThread] = useState<ThreadView | null>(null);
  const [loading, setLoading] = useState(false);
  const [starting, setStarting] = useState(false);
  const [closing, setClosing] = useState(false);
  const [sending, setSending] = useState(false);
  const [showCloseConfirm, setShowCloseConfirm] = useState(false);
  const [draft, setDraft] = useState("");
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  const isLive = escalation.status === "live";
  const isTerminal = TERMINAL_STATUSES.has(escalation.status);
  // Thread só "existe" (tem histórico ou está aberta) se passou por live.
  const hasThread = isLive || isTerminal || escalation.live_opened_at !== null;

  // --- carga + polling ----------------------------------------------------

  async function reload() {
    setLoading(true);
    try {
      const data = await getThread(escalation.id);
      setThread(data);
      // Status pode ter mudado FORA do painel: aluno mandou /encerrar
      // pelo WhatsApp, ou o cron auto-fechou por timeout. Nesse caso
      // o pai ainda acha que está 'live'. Busca a escalação completa
      // e propaga pro estado parar de exibir a caixa de envio e a UI
      // refletir o status novo.
      if (data.status !== escalation.status) {
        try {
          const updated = await getEscalation(escalation.id);
          onChanged(updated);
        } catch {
          // Se falhar, o próximo polling/refresh tenta de novo.
        }
      }
    } catch {
      notifications.show({
        color: "red",
        title: "Erro",
        message: "Falha ao carregar a conversa.",
      });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!hasThread) {
      setThread(null);
      return;
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void reload();

    if (!isLive) return; // sem polling em threads encerradas
    const id = window.setInterval(() => {
      void reload();
    }, POLL_INTERVAL_MS);
    return () => window.clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [escalation.id, escalation.status]);

  // Auto-scroll pro final quando chegam mensagens novas.
  useEffect(() => {
    if (!scrollAreaRef.current) return;
    const el = scrollAreaRef.current;
    el.scrollTop = el.scrollHeight;
  }, [thread?.messages.length]);

  // --- actions ------------------------------------------------------------

  async function handleStart() {
    setStarting(true);
    try {
      const updated = await startThread(escalation.id);
      onChanged(updated);
      notifications.show({
        color: "teal",
        title: "Conversa iniciada",
        message: "O aluno foi avisado pelo WhatsApp.",
        icon: <IconCheck size={16} />,
      });
    } catch (e: unknown) {
      const detail =
        (e as { response?: { data?: { detail?: string } } })?.response?.data
          ?.detail ?? "Falha ao iniciar a conversa.";
      notifications.show({
        color: "red",
        title: "Erro",
        message: detail,
      });
    } finally {
      setStarting(false);
    }
  }

  async function handleClose() {
    setClosing(true);
    try {
      const updated = await closeThread(escalation.id);
      onChanged(updated);
      setShowCloseConfirm(false);
      notifications.show({
        color: "teal",
        title: "Conversa encerrada",
        message: "O aluno foi avisado.",
        icon: <IconCheck size={16} />,
      });
    } catch (e: unknown) {
      const detail =
        (e as { response?: { data?: { detail?: string } } })?.response?.data
          ?.detail ?? "Falha ao encerrar.";
      notifications.show({
        color: "red",
        title: "Erro",
        message: detail,
      });
    } finally {
      setClosing(false);
    }
  }

  async function handleSend() {
    const text = draft.trim();
    if (!text) return;
    setSending(true);
    try {
      await sendThreadMessage(escalation.id, text);
      setDraft("");
      await reload();
    } catch (e: unknown) {
      const detail =
        (e as { response?: { data?: { detail?: string } } })?.response?.data
          ?.detail ?? "Falha ao enviar mensagem.";
      notifications.show({
        color: "red",
        title: "Erro",
        message: detail,
      });
    } finally {
      setSending(false);
    }
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    // Enter envia, Shift+Enter quebra linha. Padrão de chat moderno.
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void handleSend();
    }
  }

  // --- render -------------------------------------------------------------

  if (!hasThread) {
    return (
      <Card withBorder radius="md" p="lg">
        <Stack gap="md" align="flex-start">
          <Title order={5}>Conversa ao vivo com o aluno</Title>
          <Text size="sm" c="dimmed">
            Em vez de mandar uma resposta única, você pode abrir uma conversa
            ao vivo. O aluno recebe um aviso pelo WhatsApp e qualquer mensagem
            que ele mandar aparece aqui, sem passar pelo bot, até você
            encerrar.
          </Text>
          <Button
            leftSection={<IconPlayerPlay size={16} />}
            loading={starting}
            onClick={handleStart}
          >
            Iniciar conversa ao vivo
          </Button>
        </Stack>
      </Card>
    );
  }

  return (
    <Card withBorder radius="md" p="lg">
      <Stack gap="md">
        <Group justify="space-between" wrap="nowrap">
          <Group gap="xs">
            <Title order={5}>Conversa com o aluno</Title>
            <Badge
              color={isLive ? "teal" : isTerminal ? "gray" : "blue"}
              variant="light"
            >
              {isLive ? "Ao vivo" :
                escalation.status === "resolved" ? "Encerrada por você" :
                escalation.status === "abandoned" ? "Encerrada" :
                escalation.status}
            </Badge>
          </Group>
          <Group gap="xs">
            <Tooltip label="Recarregar">
              <ActionIcon variant="subtle" onClick={() => void reload()} loading={loading}>
                <IconRefresh size={16} />
              </ActionIcon>
            </Tooltip>
            {isLive && (
              <Button
                size="xs"
                variant="light"
                color="red"
                leftSection={<IconLock size={14} />}
                onClick={() => setShowCloseConfirm(true)}
              >
                Encerrar conversa
              </Button>
            )}
          </Group>
        </Group>

        {isTerminal && (
          <Alert color="gray" variant="light">
            Esta conversa já foi encerrada. Histórico abaixo em modo somente
            leitura.
          </Alert>
        )}

        <ScrollArea h={340} viewportRef={scrollAreaRef} type="auto">
          <Stack gap="xs" pr="xs">
            {!thread ? (
              <Group justify="center" py="xl">
                <Loader size="sm" />
              </Group>
            ) : thread.messages.length === 0 ? (
              <Text c="dimmed" ta="center" py="lg" size="sm">
                {isLive
                  ? "Nenhuma mensagem ainda. Escreva algo pra começar."
                  : "Conversa sem mensagens."}
              </Text>
            ) : (
              thread.messages.map((m) => {
                const fromCoord = m.direction === "coordinator";
                return (
                  <Group
                    key={m.id}
                    justify={fromCoord ? "flex-end" : "flex-start"}
                    wrap="nowrap"
                  >
                    {/* Cores via variáveis semânticas do Mantine.
                        ``teal-light`` / ``default-hover`` se adaptam
                        automaticamente entre light e dark mode. Hardcoded
                        ``teal-0``/``gray-0`` ficavam ilegíveis em dark. */}
                    <Paper
                      radius="md"
                      p="sm"
                      style={{
                        maxWidth: "78%",
                        backgroundColor: fromCoord
                          ? "var(--mantine-color-teal-light)"
                          : "var(--mantine-color-default-hover)",
                        borderLeft: fromCoord
                          ? "none"
                          : "3px solid var(--mantine-color-default-border)",
                        borderRight: fromCoord
                          ? "3px solid var(--mantine-color-teal-filled)"
                          : "none",
                      }}
                    >
                      <Stack gap={2}>
                        <Text
                          size="xs"
                          fw={600}
                          c={fromCoord ? "teal" : "blue"}
                        >
                          {fromCoord ? "Coordenação" : "Aluno"}
                        </Text>
                        <Text size="sm" style={{ whiteSpace: "pre-wrap" }}>
                          {m.text}
                        </Text>
                        <Text size="xs" c="dimmed" ta="right">
                          {new Date(m.sent_at).toLocaleTimeString("pt-BR", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </Text>
                      </Stack>
                    </Paper>
                  </Group>
                );
              })
            )}
          </Stack>
        </ScrollArea>

        {isLive && (
          <Box>
            <Textarea
              autosize
              minRows={2}
              maxRows={6}
              placeholder="Escreva a resposta. Enter envia, Shift+Enter quebra linha"
              value={draft}
              onChange={(e) => setDraft(e.currentTarget.value)}
              onKeyDown={onKeyDown}
              disabled={sending}
            />
            <Group justify="flex-end" mt="xs">
              <Button
                loading={sending}
                leftSection={<IconSend size={16} />}
                onClick={() => void handleSend()}
                disabled={draft.trim().length === 0}
              >
                Enviar
              </Button>
            </Group>
          </Box>
        )}
      </Stack>

      <Modal
        opened={showCloseConfirm}
        onClose={() => setShowCloseConfirm(false)}
        title="Encerrar conversa"
        size="sm"
        centered
      >
        <Stack gap="md">
          <Text size="sm">
            O aluno vai receber um aviso pelo WhatsApp dizendo que a conversa
            foi encerrada. Depois disso, qualquer mensagem dele volta a passar
            pelo bot. Confirma?
          </Text>
          <Group justify="flex-end">
            <Button variant="default" onClick={() => setShowCloseConfirm(false)}>
              Cancelar
            </Button>
            <Button color="red" loading={closing} onClick={() => void handleClose()}>
              Encerrar
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Card>
  );
}

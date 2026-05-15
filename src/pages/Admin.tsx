import {
  AppShell,
  Burger,
  Button,
  Group,
  NavLink,
  Stack,
  Title,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import {
  IconChartBar,
  IconFiles,
  IconInbox,
  IconLayoutDashboard,
  IconLogout,
  IconUsers,
} from "@tabler/icons-react";
import { useState } from "react";
import { Link, Outlet, useLocation } from "react-router-dom";

import ApiKeyGate from "../components/ApiKeyGate";
import { clearApiKey, getApiKey } from "../lib/apiKey";

export default function Admin() {
  const [unlocked, setUnlocked] = useState<boolean>(() => Boolean(getApiKey()));
  const [opened, { toggle, close }] = useDisclosure();
  const location = useLocation();

  if (!unlocked) {
    return <ApiKeyGate onUnlock={() => setUnlocked(true)} />;
  }

  function logout() {
    clearApiKey();
    setUnlocked(false);
  }

  const isDashboard = location.pathname === "/admin";
  const isDocs = location.pathname.startsWith("/admin/documents");
  const isStudents = location.pathname.startsWith("/admin/students");
  const isEscalations = location.pathname.startsWith("/admin/escalations");
  const isAnalytics = location.pathname.startsWith("/admin/analytics");

  return (
    <AppShell
      header={{ height: 60 }}
      padding="md"
      navbar={{
        width: 220,
        breakpoint: "sm",
        collapsed: { mobile: !opened },
      }}
    >
      <AppShell.Header>
        <Group h="100%" px="md" justify="space-between">
          <Group gap="sm">
            <Burger opened={opened} onClick={toggle} hiddenFrom="sm" size="sm" />
            <Title order={4}>RAG · Painel do coordenador</Title>
          </Group>
          <Group gap="sm">
            <Button component={Link} to="/" variant="subtle" size="xs">
              Página pública
            </Button>
            <Button
              variant="light"
              color="red"
              size="xs"
              leftSection={<IconLogout size={14} />}
              onClick={logout}
            >
              Sair
            </Button>
          </Group>
        </Group>
      </AppShell.Header>

      <AppShell.Navbar p="sm">
        <Stack gap={4}>
          <NavLink
            component={Link}
            to="/admin"
            label="Visão geral"
            leftSection={<IconLayoutDashboard size={18} />}
            active={isDashboard}
            onClick={close}
          />
          <NavLink
            component={Link}
            to="/admin/documents"
            label="Documentos"
            leftSection={<IconFiles size={18} />}
            active={isDocs}
            onClick={close}
          />
          <NavLink
            component={Link}
            to="/admin/students"
            label="Alunos"
            leftSection={<IconUsers size={18} />}
            active={isStudents}
            onClick={close}
          />
          <NavLink
            component={Link}
            to="/admin/escalations"
            label="Escalações"
            leftSection={<IconInbox size={18} />}
            active={isEscalations}
            onClick={close}
          />
          <NavLink
            component={Link}
            to="/admin/analytics"
            label="Análises"
            leftSection={<IconChartBar size={18} />}
            active={isAnalytics}
            onClick={close}
          />
        </Stack>
      </AppShell.Navbar>

      <AppShell.Main>
        <Outlet />
      </AppShell.Main>
    </AppShell>
  );
}

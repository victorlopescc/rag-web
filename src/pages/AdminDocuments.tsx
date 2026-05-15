import { Container, SimpleGrid, Text } from "@mantine/core";
import { useState } from "react";

import DocumentList from "../components/DocumentList";
import DocumentUpload from "../components/DocumentUpload";

export default function AdminDocuments() {
  const [refreshKey, setRefreshKey] = useState(0);

  return (
    <Container size="lg">
      <Text c="dimmed" mb="lg" size="sm">
        Gerencie os documentos que alimentam o assistente do WhatsApp.
        Cada arquivo é extraído, dividido em chunks e indexado no ChromaDB.
      </Text>
      <SimpleGrid cols={{ base: 1, md: 2 }} spacing="lg">
        <DocumentUpload onUploaded={() => setRefreshKey((k) => k + 1)} />
        <DocumentList
          refreshKey={refreshKey}
          onRefresh={() => setRefreshKey((k) => k + 1)}
        />
      </SimpleGrid>
    </Container>
  );
}

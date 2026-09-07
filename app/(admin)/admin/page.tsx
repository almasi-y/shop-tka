// app/(admin)/admin/page.tsx
import {
  useApplyDocumentActions,
  createDocumentHandle,
  createDocument,
} from "@sanity/sdk-react";

// Create a new product
const apply = useApplyDocumentActions();

const handleCreateProduct = async () => {
  const newDocHandle = createDocumentHandle({
    documentId: crypto.randomUUID(),
    documentType: "product",
  });
  await apply(createDocument(newDocHandle));
  router.push(`/admin/inventory/${newDocHandle.documentId}`);
};
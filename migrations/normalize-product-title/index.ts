import { at, defineMigration, setIfMissing } from "sanity/migrate";

export default defineMigration({
  title: "Normalize product name to title",
  documentTypes: ["product"],
  filter: "defined(name) && !defined(title)",
  migrate: {
    document(document) {
      if (typeof document.name !== "string" || document.title) {
        return;
      }

      return at("title", setIfMissing(document.name));
    },
  },
});

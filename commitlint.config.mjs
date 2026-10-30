// Telkomsel FOSS Commit Format (docs/ai/steering/commit-conventions.md)
// Format: [JIRAID][ACTOR] type(scope): subject
const config = {
  extends: ["@commitlint/config-conventional"],
  parserPreset: {
    parserOpts: {
      // Match: [JIRAID][ACTOR] type(scope): subject
      // Example: [RUSUH-002][Akbar] refactor(ui): move to components/ui
      headerPattern: /^\[([A-Z]+-\d+)\]\[([^\]]+)\]\s*(\w+)(?:\(([^)]+)\))?:\s*(.+)$/,
      headerCorrespondence: ["ticket", "actor", "type", "scope", "subject"],
    },
  },
  rules: {
    "type-enum": [
      2,
      "always",
      ["feat", "fix", "docs", "style", "refactor", "perf", "test", "build", "ci", "chore", "revert"],
    ],
    "header-max-length": [2, "always", 100], // Increased for prefix
    "subject-case": [2, "always", "lower-case"],
    "subject-full-stop": [2, "never", "."],
    "no-attribution-trailer": [2, "always"],
    "jira-ticket-format": [2, "always"],
    "actor-required": [2, "always"],
  },
  plugins: [
    {
      rules: {
        // Tidak ada trailer atribusi atau co-authorship (docs/ai/steering/README.md).
        "no-attribution-trailer": ({ raw }) => {
          const found = /^(co-authored-by|generated-by):/im.test(raw ?? "");
          return [!found, "Hapus trailer Co-Authored-By / Generated-By."];
        },
        // Validasi format JIRA ticket
        "jira-ticket-format": ({ ticket }) => {
          if (!ticket) {
            return [false, "JIRA ticket ID diperlukan dalam format [JIRAID]"];
          }
          const valid = /^[A-Z]+-\d+$/.test(ticket);
          return [valid, "JIRA ticket harus dalam format PROJECT-123"];
        },
        // Validasi actor required
        "actor-required": ({ actor }) => {
          if (!actor || actor.trim() === "") {
            return [false, "Actor diperlukan dalam format [ACTOR]"];
          }
          return [true, ""];
        },
      },
    },
  ],
};

export default config;

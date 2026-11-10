// Telkomsel FOSS Commit Format (.kiro/steering/commit-conventions.md)
// Format: [JIRAID][ACTOR] type(scope): subject
const config = {
  extends: ["@commitlint/config-conventional"],
  // Commit merge dibuat otomatis (git/GitHub/IDE) dan tidak mengikuti format Telkomsel.
  // Termasuk pesan tanpa header yang hanya berisi trailer (mis. Co-authored-by dari GitHub).
  ignores: [
    (message) => /^\s*(Merge|Revert) /i.test(message ?? ""),
    (message) => !(message ?? "").replace(/^(co-authored-by|signed-off-by):.*$/gim, "").trim(),
  ],
  parserPreset: {
    parserOpts: {
      // Match: [JIRAID][ACTOR] type(scope): subject
      // Example: [RUSUH-002][Akbar] refactor(ui): move to components/ui
      // Tiket = nomor issue GitHub: [#66][zaki] fix(ticket): draw QR from qr_value. ID Jira lama tetap dikenali.
      headerPattern: /^\[([A-Z]+-\d+|#\d+)\]\[([^\]]+)\] (\w+)(?:\(([^)]+)\))?: (.+)$/,
      headerCorrespondence: ["ticket", "actor", "type", "scope", "subject"],
    },
  },
  rules: {
    "type-enum": [2, "always", ["feat", "fix", "chore", "docs", "refactor", "test"]],
    "scope-empty": [2, "never"],
    "header-max-length": [2, "always", 100], // Increased for prefix
    // Akronim dan versi tetap boleh: "handle SSE reconnection", "update axios to v1.5.0".
    "subject-case": [2, "never", ["sentence-case", "start-case", "pascal-case", "upper-case"]],
    "subject-full-stop": [2, "never", "."],
    "no-attribution-trailer": [2, "always"],
    "jira-ticket-format": [2, "always"],
    "actor-required": [2, "always"],
  },
  plugins: [
    {
      rules: {
        // Tidak ada trailer atribusi atau co-authorship (.kiro/steering/README.md).
        "no-attribution-trailer": ({ raw }) => {
          const found = /^(co-authored-by|generated-by):/im.test(raw ?? "");
          return [!found, "Hapus trailer Co-Authored-By / Generated-By."];
        },
        // Validasi format JIRA ticket
        "jira-ticket-format": ({ ticket }) => {
          if (!ticket) {
            return [false, "Nomor issue diperlukan dalam format [#123] (atau [PROJECT-123] untuk ID Jira)"];
          }
          const valid = /^([A-Z]+-\d+|#\d+)$/.test(ticket);
          return [valid, "Tiket harus berupa nomor issue #123 atau PROJECT-123"];
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

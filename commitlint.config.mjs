// Conventional Commits (docs/ai/steering/coding-conventions.md#git)
const config = {
  extends: ["@commitlint/config-conventional"],
  rules: {
    "type-enum": [
      2,
      "always",
      ["feat", "fix", "docs", "style", "refactor", "perf", "test", "build", "ci", "chore", "revert"],
    ],
    "header-max-length": [2, "always", 72],
    "subject-case": [2, "always", "lower-case"],
    "subject-full-stop": [2, "never", "."],
    "no-attribution-trailer": [2, "always"],
  },
  plugins: [
    {
      rules: {
        // Tidak ada trailer atribusi atau co-authorship (docs/ai/steering/README.md).
        "no-attribution-trailer": ({ raw }) => {
          const found = /^(co-authored-by|generated-by):/im.test(raw ?? "");
          return [!found, "Hapus trailer Co-Authored-By / Generated-By."];
        },
      },
    },
  ],
};

export default config;

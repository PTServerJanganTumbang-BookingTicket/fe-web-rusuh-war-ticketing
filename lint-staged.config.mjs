// Berjalan pada file yang di-stage saat commit (hook .husky/pre-commit).
const config = {
  "*.{ts,tsx,mjs}": (files) => {
    const list = files.map((f) => `"${f}"`).join(" ");
    const code = files.filter((f) => /\.(ts|tsx)$/.test(f)).map((f) => `"${f}"`);
    const cmds = [`prettier --write ${list}`, `eslint --fix --max-warnings=0 ${list}`];
    if (code.length > 0) cmds.push(`vitest related --run --passWithNoTests ${code.join(" ")}`);
    return cmds;
  },
  "*.{json,css,yml,yaml}": "prettier --write",
};

export default config;

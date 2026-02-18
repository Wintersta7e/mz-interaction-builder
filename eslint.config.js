const { configs, config } = require("@electron-toolkit/eslint-config-ts");
const prettierConfig = require("@electron-toolkit/eslint-config-prettier");

module.exports = config(
  { ignores: ["out/", "dist/", "release/"] },
  ...configs.recommended,
  prettierConfig,
  {
    rules: {
      "@typescript-eslint/explicit-function-return-type": "off",
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_" },
      ],
    },
  },
  {
    files: ["*.config.js", "*.config.cjs"],
    rules: {
      "@typescript-eslint/no-require-imports": "off",
    },
  },
);

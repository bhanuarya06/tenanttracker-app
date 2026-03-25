// ESLint flat config for backend (Node.js)
export default [
  {
    files: ["src/**/*.js"],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
    },
    plugins: {},
    extends: ["eslint:recommended"],
    rules: {
      // Add or override rules as needed
    },
  },
];

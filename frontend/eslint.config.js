// ESLint flat config for frontend (React)
export default [
  {
    files: ["src/**/*.{js,jsx,ts,tsx}"],
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

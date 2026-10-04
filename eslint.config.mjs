import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTypeScript from "eslint-config-next/typescript";
import prettierRecommended from "eslint-plugin-prettier/recommended";
import globals from "globals";

export default defineConfig([
  ...nextVitals,
  ...nextTypeScript,
  {
    files: [
      "app/**/*.{js,jsx,ts,tsx}",
      "components/**/*.{js,jsx,ts,tsx}",
      "layouts/**/*.{js,jsx,ts,tsx}",
      "lib/**/*.{js,mjs,jsx,ts,tsx}",
      "scripts/**/*.{js,mjs,jsx,ts,tsx}",
    ],
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
    rules: {
      "react/react-in-jsx-scope": "off",
      "jsx-a11y/anchor-is-valid": [
        "error",
        {
          components: ["Link"],
          specialLink: ["hrefLeft", "hrefRight"],
          aspects: ["invalidHref", "preferButton"],
        },
      ],
      "react/prop-types": "off",
      "@typescript-eslint/no-unused-vars": "off",
      "react/no-unescaped-entities": "off",
      "@typescript-eslint/explicit-module-boundary-types": "off",
      "@typescript-eslint/no-require-imports": "off",
      "@typescript-eslint/ban-ts-comment": "off",
      "@typescript-eslint/no-explicit-any": "off",
    },
  },
  prettierRecommended,
  globalIgnores([
    ".contentlayer/**",
    ".next/**",
    "experiments/**",
    "node_modules/**",
    "public/**",
  ]),
]);

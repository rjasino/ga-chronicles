import nextVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";

const config = [
  ...nextVitals,
  ...nextTypescript,
  { ignores: ["node_modules/", ".next/", "dist/", "build/", "coverage/", "*.min.js"] },
];

export default config;

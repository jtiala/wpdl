import typescript from "@rollup/plugin-typescript";

export default {
  input: "src/index.ts",
  output: {
    file: "dist/wpdl.js",
    format: "es",
  },
  plugins: [typescript()],
  external: [
    "chalk",
    "fs/promises",
    "jsdom",
    "mime-types",
    "node:buffer",
    "node:process",
    "prettier",
    "yargs",
    "yargs/helpers",
    "yargs/yargs",
  ],
};

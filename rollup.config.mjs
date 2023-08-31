import typescript from "@rollup/plugin-typescript";
import shebang from "rollup-plugin-add-shebang";
import executable from "rollup-plugin-executable-output";

export default {
  input: "src/index.ts",
  output: {
    file: "dist/wpdl.js",
    format: "es",
  },
  plugins: [
    typescript(),
    shebang({
      include: "dist/wpdl.js",
    }),
    executable(),
  ],
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

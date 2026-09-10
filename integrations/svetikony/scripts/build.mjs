import { build } from "esbuild";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
await build({
  entryPoints: ["src/server.mjs"],
  bundle: true,
  platform: "node",
  target: "node24",
  format: "esm",
  outfile: "dist/server.mjs",
  banner: {
    js: "import {createRequire as __createRequire} from 'node:module'; const require=__createRequire(import.meta.url);",
  },
});
mkdirSync("dist/licenses", { recursive: true });
for (const dependency of ["@modelcontextprotocol/sdk", "zod"]) {
  writeFileSync(
    "dist/licenses/" + dependency.replaceAll("/", "-") + ".txt",
    readFileSync("node_modules/" + dependency + "/LICENSE"),
  );
}

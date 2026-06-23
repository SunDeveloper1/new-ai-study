import * as esbuild from "esbuild";
import { unlinkSync } from "fs";
import { resolve } from "path";

const root = process.cwd();

try {
  await esbuild.build({
    entryPoints: [resolve(root, "api", "index.ts")],
    bundle: true,
    platform: "node",
    format: "esm",
    packages: "external",
    outfile: resolve(root, "api", "index.js"),
    absWorkingDir: root,
  });
  unlinkSync(resolve(root, "api", "index.ts"));
  console.log("✓ API serverless function bundled successfully");
} catch (err) {
  console.error("API bundle failed:", err);
  process.exit(1);
}

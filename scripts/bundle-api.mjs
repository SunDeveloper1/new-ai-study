import * as esbuild from "esbuild";
import { unlinkSync } from "fs";

try {
  await esbuild.build({
    entryPoints: ["api/index.ts"],
    bundle: true,
    platform: "node",
    format: "esm",
    packages: "external",
    outfile: "api/index.js",
  });
  unlinkSync("api/index.ts");
  console.log("✓ API serverless function bundled successfully");
} catch (err) {
  console.error("API bundle failed:", err);
  process.exit(1);
}

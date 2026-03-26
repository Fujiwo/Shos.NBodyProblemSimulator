import { build } from "esbuild";
import { cp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repositoryRoot = path.resolve(__dirname, "..");
const sourcesDir = path.join(repositoryRoot, "Sources");
const distDir = path.join(repositoryRoot, "Dist");
const outputMainPath = path.join(distDir, "main.min.js");
const outputWorkerPath = path.join(distDir, "physics-worker.min.js");
const outputHtmlPath = path.join(distDir, "index.html");
const outputStylePath = path.join(distDir, "style.css");
const outputImagesPath = path.join(distDir, "images");
const legacyOutputPaths = [
  path.join(sourcesDir, "main.min.js"),
  path.join(sourcesDir, "physics-worker.min.js"),
  path.join(sourcesDir, "index.min.html")
];

const bootstrapWorkerImport = "../workers/physics-worker.js";
const bundledWorkerImport = "./physics-worker.min.js";

function createWorkerRedirectPlugin() {
  return {
    name: "worker-redirect",
    setup(buildContext) {
      buildContext.onLoad({ filter: /[\\/]Sources[\\/]app[\\/]bootstrap\.js$/ }, async (args) => {
        const source = await readFile(args.path, "utf8");

        if (!source.includes(bootstrapWorkerImport)) {
          throw new Error(`Expected worker import path was not found in ${args.path}.`);
        }

        return {
          contents: source.replace(bootstrapWorkerImport, bundledWorkerImport),
          loader: "js"
        };
      });
    }
  };
}

async function buildWorker() {
  await build({
    entryPoints: [path.join(sourcesDir, "workers", "physics-worker.js")],
    outfile: outputWorkerPath,
    bundle: true,
    minify: true,
    format: "esm",
    platform: "browser",
    target: ["es2020"],
    legalComments: "none"
  });
}

async function buildMain() {
  await build({
    entryPoints: [path.join(sourcesDir, "main.js")],
    outfile: outputMainPath,
    bundle: true,
    minify: true,
    format: "esm",
    platform: "browser",
    target: ["es2020"],
    legalComments: "none",
    plugins: [createWorkerRedirectPlugin()]
  });
}

async function writeBundledHtml() {
  const sourceHtml = await readFile(path.join(sourcesDir, "index.html"), "utf8");
  const replacedHtml = sourceHtml.replace(
    /<script type="module" src="\.\/main\.js(?:\?[^\"]*)?"><\/script>/,
    '<script type="module" src="./main.min.js"></script>'
  );

  await writeFile(outputHtmlPath, replacedHtml, "utf8");
}

async function copyStaticAssets() {
  await cp(path.join(sourcesDir, "style.css"), outputStylePath);
  await cp(path.join(sourcesDir, "images"), outputImagesPath, { recursive: true });
}

async function cleanOutputs() {
  await Promise.all([
    rm(outputMainPath, { force: true }),
    rm(outputWorkerPath, { force: true }),
    rm(outputHtmlPath, { force: true }),
    rm(outputStylePath, { force: true }),
    rm(outputImagesPath, { force: true, recursive: true }),
    ...legacyOutputPaths.map((outputPath) => rm(outputPath, { force: true }))
  ]);
}

async function main() {
  const cleanOnly = process.argv.includes("--clean");

  if (cleanOnly) {
    await cleanOutputs();
    console.log("Removed Dist output and legacy Sources minified files");
    return;
  }

  await cleanOutputs();
  await mkdir(distDir, { recursive: true });
  await buildWorker();
  await buildMain();
  await writeBundledHtml();
  await copyStaticAssets();

  console.log("Generated Dist/index.html, Dist/main.min.js, Dist/physics-worker.min.js, Dist/style.css, and Dist/images");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
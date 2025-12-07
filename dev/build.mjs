import { build } from "esbuild";
import { exec } from "node:child_process";
import { mkdir, rm } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = resolve(__filename, "../..");

const srcDir = resolve(__dirname, "src");
const distDir = resolve(__dirname, "dist");

const entry = resolve(srcDir, "PseudoDebugKit.ts");
const outFile = "PseudoDebugKit";

async function run(cmd) {
	return new Promise((res, rej) => {
		exec(cmd, (err, stdout, stderr) => {
			if (err) rej(err);
			else res({ stdout, stderr });
		});
	});
}

async function main() {
	await rm(distDir, { recursive: true, force: true });
	await mkdir(distDir, { recursive: true });

	await Promise.all([
		build({
			entryPoints: [entry],
			outfile: resolve(distDir, `${outFile}.js`),
			bundle: true,
			format: "esm",
			platform: "browser",
			target: ["es2024"],
			sourcemap: true,
			charset: "utf8",
			minify: false,
		}),
		build({
			entryPoints: [entry],
			outfile: resolve(distDir, `${outFile}.min.js`),
			bundle: true,
			format: "esm",
			platform: "browser",
			target: ["es2024"],
			sourcemap: true,
			charset: "utf8",
			minify: true,
		}),
		run("npx tsc --emitDeclarationOnly --declaration"),
	]);

	console.log("build complete: PseudoDebugKit.js");
}

main();

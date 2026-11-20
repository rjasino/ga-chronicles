import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const appDirectory = fileURLToPath(new URL("..", import.meta.url));
const packageJson = JSON.parse(
  readFileSync(new URL("../package.json", import.meta.url), "utf8"),
);
const lockfile = JSON.parse(
  readFileSync(new URL("../package-lock.json", import.meta.url), "utf8"),
);

const expectedVersion = packageJson.devDependencies?.supabase;
const lockfileRequirement =
  lockfile.packages?.[""]?.devDependencies?.supabase;
const lockfileVersion = lockfile.packages?.["node_modules/supabase"]?.version;
const installedPackagePath = `${appDirectory}/node_modules/supabase/package.json`;
let installedVersion;

try {
  installedVersion = JSON.parse(readFileSync(installedPackagePath, "utf8")).version;
} catch {
  console.error(
    "Supabase CLI is not installed locally. Run `npm ci --prefix apps/web` first.",
  );
  process.exit(1);
}

if (!expectedVersion || !/^\d+\.\d+\.\d+$/.test(expectedVersion)) {
  console.error(
    `The Supabase CLI must be pinned to an exact version in package.json; found ${JSON.stringify(expectedVersion)}.`,
  );
  process.exit(1);
}

const versions = {
  "package.json": expectedVersion,
  "package-lock root dependency": lockfileRequirement,
  "package-lock.json": lockfileVersion,
  "installed CLI package": installedVersion,
};
const mismatches = Object.entries(versions).filter(
  ([, version]) => version !== expectedVersion,
);

if (mismatches.length > 0) {
  console.error(`Supabase CLI version mismatch. Expected ${expectedVersion}:`);
  for (const [source, version] of mismatches) {
    console.error(`  ${source}: ${version ?? "missing"}`);
  }
  process.exit(1);
}

console.log(`Supabase CLI is locked to ${expectedVersion} in package.json, package-lock.json, and node_modules.`);

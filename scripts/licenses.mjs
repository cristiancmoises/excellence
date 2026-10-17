import { readdirSync, readFileSync, existsSync, writeFileSync } from "node:fs";
import { join } from "node:path";
const packages = [];
function walk(base) {
  if (!existsSync(base)) return;
  for (const dir of readdirSync(base, { withFileTypes: true })) {
    if (!dir.isDirectory() || dir.name.startsWith(".")) continue;
    const path = join(base, dir.name);
    if (dir.name.startsWith("@")) {
      walk(path);
      continue;
    }
    const meta = join(path, "package.json");
    if (!existsSync(meta)) continue;
    try {
      const p = JSON.parse(readFileSync(meta, "utf8"));
      const files = readdirSync(path).filter((x) =>
        /^(licen[sc]e|copying|notice)(\.|$|-)/i.test(x),
      );
      let licenses = files
        .map((f) => {
          try {
            return f + "\n" + readFileSync(join(path, f), "utf8");
          } catch {
            return "";
          }
        })
        .join("\n\n");
      if (p.name === "buffers") {
        p.license = "MIT/X11";
        licenses =
          "Upstream package license declaration: https://github.com/bitpay/node-buffers/blob/master/package.json\nCopyright (c) James Halliday\n\n" +
          "Permission is hereby granted" +
          readFileSync("LICENSE", "utf8").split(
            "Permission is hereby granted",
          )[1];
        licenses = licenses.replace(
          "\n\nof this software",
          "\n\nof this software",
        );
      }
      if (p.name === "jstat") p.license = "MIT";
      packages.push({
        name: p.name,
        version: p.version,
        license: p.license || "SEE LICENSE",
        repository: p.repository,
        notices: licenses,
      });
      walk(join(path, "node_modules"));
    } catch {}
  }
}
walk("node_modules");
packages.sort((a, b) => a.name.localeCompare(b.name));
writeFileSync(
  "THIRD_PARTY_NOTICES.txt",
  "Excellence 0.1.0-rc.1 — third-party licenses\nIncludes runtime and build dependencies. Original license terms remain applicable.\nFortuneSheet and its formula parser are patched at build time for CSP, immutable selection arguments, dependency recalculation, boolean literals and typed division errors; see scripts/patch-fortune.mjs.\n\n" +
    packages
      .map(
        (p) =>
          "=".repeat(72) +
          "\n" +
          p.name +
          "@" +
          p.version +
          "\nLicense: " +
          JSON.stringify(p.license) +
          "\nRepository: " +
          JSON.stringify(p.repository || "") +
          "\n\n" +
          p.notices,
      )
      .join("\n\n"),
);
writeFileSync(
  "docs/dependencies.json",
  JSON.stringify(
    packages.map(({ notices, ...p }) => p),
    null,
    2,
  ) + "\n",
);
console.log(`${packages.length} pacotes documentados.`);

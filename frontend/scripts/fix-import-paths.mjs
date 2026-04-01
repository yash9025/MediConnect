import fs from "fs";
import path from "path";

const projectRoot = process.cwd();
const srcRoot = path.join(projectRoot, "src");
const exts = ["", ".js", ".jsx", ".ts", ".tsx"];
const indexExts = ["/index.js", "/index.jsx", "/index.ts", "/index.tsx"];

const toPosix = (p) => p.replace(/\\/g, "/");

const existsImportTarget = (basePath) => {
  for (const ext of exts) {
    if (fs.existsSync(basePath + ext)) return true;
  }
  for (const idxExt of indexExts) {
    if (fs.existsSync(basePath + idxExt)) return true;
  }
  return false;
};

const getAllFiles = (dir) => {
  const out = [];
  const items = fs.readdirSync(dir, { withFileTypes: true });

  for (const item of items) {
    if (item.name === "node_modules" || item.name === "dist") continue;

    const full = path.join(dir, item.name);
    if (item.isDirectory()) {
      out.push(...getAllFiles(full));
      continue;
    }

    if (/\.(jsx?|tsx?)$/.test(item.name)) {
      out.push(full);
    }
  }

  return out;
};

const tryResolve = (fileDir, importPath) => {
  const absolute = path.resolve(fileDir, importPath);
  if (existsImportTarget(absolute)) return importPath;

  const candidates = [];

  // Case 1: after moving files deeper, add one more ../
  candidates.push(path.posix.join("..", importPath));

  // Case 2: after moving files shallower, remove one ../ if possible
  if (importPath.startsWith("../")) {
    candidates.push(importPath.replace(/^\.\.\//, "./"));
  }

  // Case 3: normalize accidental duplicate slash segments
  candidates.push(importPath.replace(/\/+/g, "/"));

  for (const candidate of candidates) {
    const nextAbsolute = path.resolve(fileDir, candidate);
    if (existsImportTarget(nextAbsolute)) {
      return candidate;
    }
  }

  return null;
};

const importRegex = /(from\s+["'])(\.\.?\/[^"']+)(["'])/g;
const sideEffectRegex = /(import\s+["'])(\.\.?\/[^"']+)(["'])/g;

const files = getAllFiles(srcRoot);
let changeCount = 0;

for (const file of files) {
  const dir = path.dirname(file);
  const original = fs.readFileSync(file, "utf8");
  let updated = original;

  const applyFixes = (regex) => {
    updated = updated.replace(regex, (full, p1, importPath, p3) => {
      const fixed = tryResolve(dir, importPath);
      if (!fixed || fixed === importPath) {
        return full;
      }

      changeCount += 1;
      console.log(`${toPosix(path.relative(projectRoot, file))}: ${importPath} -> ${fixed}`);
      return `${p1}${fixed}${p3}`;
    });
  };

  applyFixes(importRegex);
  applyFixes(sideEffectRegex);

  if (updated !== original) {
    fs.writeFileSync(file, updated, "utf8");
  }
}

console.log(`Done. Updated ${changeCount} import statement(s).`);

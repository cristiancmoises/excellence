import path from "node:path";
export function withinDirectory(directory, file, paths = path) {
  const rel = paths.relative(directory, file);
  return (
    rel === "" ||
    (!rel.startsWith(".." + paths.sep) &&
      rel !== ".." &&
      !paths.isAbsolute(rel))
  );
}

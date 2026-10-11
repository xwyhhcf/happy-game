import { rmSync } from "node:fs";
import path from "node:path";
import { tmpdir } from "node:os";

export default function cleanup() {
  const directory = process.env.E2E_DATA_DIR;
  if (
    directory &&
    path.dirname(directory) === path.resolve(tmpdir()) &&
    path.basename(directory).startsWith("happy-game-e2e-")
  )
    rmSync(directory, { recursive: true, force: true });
}

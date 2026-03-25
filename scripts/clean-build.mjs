import { rmSync } from "node:fs";

rmSync("dist", { recursive: true, force: true });
rmSync("dist-cjs", { recursive: true, force: true });

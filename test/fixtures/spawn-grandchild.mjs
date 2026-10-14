import { spawn } from "node:child_process";

const grandchild = spawn(
  process.execPath,
  ["-e", "setInterval(() => {}, 1000)"],
  { stdio: "ignore" },
);

process.stdout.write(`ready:${grandchild.pid}\n`);
process.stdin.resume();

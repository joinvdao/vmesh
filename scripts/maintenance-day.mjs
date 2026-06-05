import { spawnSync } from "node:child_process";
import process from "node:process";

const commands = [
  ["npm", ["run", "format:check"]],
  ["npm", ["run", "lint"]],
  ["npm", ["test"]],
  ["npm", ["run", "agent-ready:check"]],
  ["npm", ["run", "public-workflow:check"]],
  ["npm", ["run", "privacy:check"]]
];

for (const [command, args] of commands) {
  console.log(`\n> ${command} ${args.join(" ")}`);
  const executable = command === "npm" && process.env.npm_execpath ? process.execPath : command;
  const executableArgs =
    command === "npm" && process.env.npm_execpath ? [process.env.npm_execpath, ...args] : args;
  const result = spawnSync(executable, executableArgs, { stdio: "inherit" });

  if (result.error) {
    console.error(result.error.message);
    process.exit(1);
  }

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

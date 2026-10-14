import { createInterface } from "node:readline";
import type { Readable, Writable } from "node:stream";

export type NdjsonTransport = {
  write: (message: unknown) => void;
  onMessage: (handler: (message: unknown) => void) => () => void;
  close: () => void;
};

export function createNdjsonTransport(
  stdin: Writable,
  stdout: Readable,
): NdjsonTransport {
  const readline = createInterface({ input: stdout });

  return {
    write(message: unknown) {
      stdin.write(`${JSON.stringify(message)}\n`);
    },
    onMessage(handler: (message: unknown) => void) {
      const listener = (line: string) => {
        const trimmed = line.trim();
        if (!trimmed) {
          return;
        }

        handler(JSON.parse(trimmed) as unknown);
      };

      readline.on("line", listener);
      return () => {
        readline.off("line", listener);
      };
    },
    close() {
      readline.close();
    },
  };
}

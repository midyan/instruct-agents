import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const requireFromModule = createRequire(import.meta.url);

type PackageBinField = Record<string, string> | string;

function resolvePackageJsonPath(packageName: string): string {
  return requireFromModule.resolve(`${packageName}/package.json`);
}

function readPackageBinField(packageName: string): PackageBinField {
  const packageJsonPath = resolvePackageJsonPath(packageName);
  const packageJson = requireFromModule(packageJsonPath) as {
    bin?: PackageBinField;
  };

  if (packageJson.bin === undefined) {
    throw new Error(`Package "${packageName}" does not expose a bin entry`);
  }

  return packageJson.bin;
}

function resolveRelativeBinPath(
  packageName: string,
  binField: PackageBinField,
  binName?: string,
): string {
  if (typeof binField === "string") {
    return binField;
  }

  const resolvedBinName = binName ?? Object.keys(binField)[0];
  const relativePath = binField[resolvedBinName];

  if (relativePath === undefined) {
    throw new Error(
      `Package "${packageName}" does not expose bin "${resolvedBinName}"`,
    );
  }

  return relativePath;
}

/** Resolves an npm package binary to an absolute path. */
export function resolvePackageBin(
  packageName: string,
  binName?: string,
): string {
  const packageJsonPath = resolvePackageJsonPath(packageName);
  const relativePath = resolveRelativeBinPath(
    packageName,
    readPackageBinField(packageName),
    binName,
  );

  return join(dirname(packageJsonPath), relativePath);
}

/** Resolves a path relative to the calling module file. */
export function resolveModuleRelativePath(relativePath: string): string {
  return fileURLToPath(new URL(relativePath, import.meta.url));
}

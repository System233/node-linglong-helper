// Copyright (c) 2024 System233
//
// This software is released under the MIT License.
// https://opensource.org/licenses/MIT

import { PackageManager, IPackage } from "apt-cli";

const pm = new PackageManager({ cacheDir: "~/.cache" });
export const resolve = (depends: string[]) =>
  depends.map((item) => pm.resolve(item, { recursive: true, missing: true }));

export const walk = <T>(
  pkg: IPackage | IPackage[],
  cb: (pkg: IPackage) => T,
  set: Set<IPackage> = new Set()
): T[] => {
  if (!pkg) {
    return [];
  }
  if (Array.isArray(pkg)) {
    return pkg.flatMap((item) => walk(item, cb, set));
  }
  if (set.has(pkg)) {
    return [];
  }
  set.add(pkg);
  return [cb(pkg), ...walk(pkg.dependencies, cb, set)];
};

export const flat = (pkg: IPackage): IPackage[] => walk(pkg, (x) => x);
export const getAllDepends = (pkg: IPackage | IPackage[]) =>
  walk(pkg, (pkg) => `${pkg.package}`);

// Copyright (c) 2024 System233
//
// This software is released under the MIT License.
// https://opensource.org/licenses/MIT

import { IPackage } from "apt-cli";

export const walk = <T>(
  pkg: IPackage | IPackage[] | null | undefined,
  cb: (pkg: IPackage) => T,
  set: Set<string> = new Set()
): T[] => {
  if (!pkg) {
    return [];
  }
  if (Array.isArray(pkg)) {
    return pkg.flatMap((item) => walk(item, cb, set));
  }
  const id = `${pkg.package}:${pkg.architecture}:${pkg.version}`;
  if (set.has(id)) {
    return [];
  }
  set.add(id);
  return [cb(pkg), ...walk(pkg.dependencies, cb, set)];
};

export const flat = (pkg: IPackage | IPackage[]): IPackage[] =>
  walk(pkg, (x) => x);
export const getAllDepends = (pkg: IPackage | IPackage[]) =>
  walk(pkg, (pkg) => `${pkg.package}`);

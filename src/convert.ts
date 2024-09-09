// Copyright (c) 2024 System233
//
// This software is released under the MIT License.
// https://opensource.org/licenses/MIT

// Copyright (c) 2024 System233
//
// This software is released under the MIT License.
// https://opensource.org/licenses/MIT

import { writeFile } from "fs/promises";
import {
  getLinyapsName,
  loadRuntimePackages,
  lockPorjectDir,
  normalizeVersion,
} from "./utils.js";
import { join } from "path";
import { Command } from "commander";
import { PackageManager, parseSourceEnrty } from "apt-cli";
import { create } from "./create.js";
import { getAllDepends } from "./apt.js";
import { SOURCES_LIST } from "./constant.js";

export interface CLIConvertOption {
  id: string;
  name: string;
  depend: string[];
  entry: string[];
  withRuntime: boolean;
  runtime: string;
  base: string;

  cacheDir: string;
  version: string;
  kind: "app" | "runtime";
  description: string;
}
const convert = async (rawId: string, opt: CLIConvertOption) => {
  opt.id = rawId;
  const [pkgId] = opt.id.split(":", 1);
  const id = getLinyapsName(pkgId);

  await lockPorjectDir(id, async () => {
    const sourcesFile = join(id, SOURCES_LIST);
    await writeFile(sourcesFile, opt.entry.join("\n"));

    const manager = new PackageManager({
      cacheDir: opt.cacheDir || join(id, ".cache"),
    });
    opt.entry.forEach((item) =>
      manager.repository.create(parseSourceEnrty(item))
    );
    await manager.load();
    const pkg = manager.resolve(opt.id, { recursive: true });
    if (!pkg) {
      throw new Error(`找不到包: ${JSON.stringify(opt.id)}`);
    }
    const allDepends = Array.from(
      new Set(opt.depend.concat(getAllDepends(pkg)))
    );
    const runtimePackages = await loadRuntimePackages();
    const neededRuntime = !!allDepends.find((item) =>
      runtimePackages.includes(item)
    );
    await create(pkgId, {
      id: pkgId,
      depend: [opt.id, ...opt.depend],
      name: opt.name || pkg.package,
      version: opt.version || normalizeVersion(pkg.version),
      kind: opt.kind || "app",
      withRuntime: neededRuntime || opt.withRuntime,
      description: opt.description || pkg.description,
      base: opt.base,
      runtime: opt.runtime,
      nolock: true,
    });
  });
};

export const convertCommand = new Command("convert")
  .description("创建DEB包转换项目")
  .argument("<id>", "DEB包名")
  .option("-d,--depend <...depends>", "依赖列表", (x, y) => y.concat(x), [])
  .option("-e,--entry <...entry>", "APT源条目", (x, y) => y.concat(x), [])
  .option("--cacheDir <cacheDir>", "APT缓存目录")
  .option("--with-runtime", "引入默认org.deepin.Runtime")
  .option("--name <name>", "应用名称")
  .option("--kind <app|runtime>", "应用类型")
  .option("--version <x.x.x.x>", "版本号")
  .option("--description <description>", "应用说明")
  .option("--base <id/version>", "基础依赖包")
  .option("--runtime <id/version>", "Runtime依赖包")
  .action(convert);

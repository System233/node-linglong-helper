// Copyright (c) 2024 System233
//
// This software is released under the MIT License.
// https://opensource.org/licenses/MIT

import {
  loadPackages,
  loadSourcesList,
  loadYAML,
  resolveOrAsset,
  savePackages,
  saveYAML,
} from "./utils.js";
import { IProject } from "./interface.js";
import {
  DEP_EXCLUDE_LIST,
  DEP_INCLDUE_LIST,
  DEP_LIST,
  DEP_LIST_ALL,
  DEP_LIST_GENERATED,
  LINGLONG_BASE_PACKAGE_LIST,
  LINGLONG_RUNTIME_PACKAGE_LIST,
  LINGLONG_YAML,
  SOURCES_LIST,
} from "./constant.js";
import { Command } from "commander";
import { PackageManager, parseSourceEnrty } from "apt-cli";
import { flat } from "./apt.js";

export interface CLIUpdateOption {
  id: string;
  name: string;
  depends: string[];
  entry: string[];
  withRuntime: boolean;
  runtime: string;
  base: string;

  cacheDir: string;
  version: string;
  kind: "app" | "runtime";
  description: string;

  baseListFile?: string;
  runtimeListFile?: string;
}
const update = async (opt: CLIUpdateOption) => {
  const manager = new PackageManager({ cacheDir: opt.cacheDir });
  const sourceList = await loadSourcesList();
  const entries = sourceList.concat(opt.entry);
  entries.forEach((item) => manager.repository.create(parseSourceEnrty(item)));
  await manager.load();
  const currentDeps = opt.depends.concat(await loadPackages(DEP_LIST));
  const packages = currentDeps.flatMap((item) => {
    const pkg = manager.resolve(item, { recursive: true });
    if (pkg == null) {
      console.warn(`找不到依赖: ${JSON.stringify(item)}`);
      return [];
    }
    return flat(pkg);
  });

  const proj = await loadYAML<IProject>(LINGLONG_YAML);
  const baseListFile =
    opt.baseListFile || (await resolveOrAsset(LINGLONG_BASE_PACKAGE_LIST));
  const runtimeListFile =
    opt.runtimeListFile ||
    (await resolveOrAsset(LINGLONG_RUNTIME_PACKAGE_LIST));
  const [basePackages, runtimePackages, excludePackages, includePackages] =
    await Promise.all([
      loadPackages(baseListFile),
      proj.runtime ? loadPackages(runtimeListFile) : [],
      loadPackages(DEP_EXCLUDE_LIST, true),
      loadPackages(DEP_INCLDUE_LIST, true),
    ]);
  const envPackages = new Set(
    [].concat(basePackages, runtimePackages, excludePackages)
  );
  const filteredPackages = packages.filter(
    (item) =>
      !envPackages.has(item.package) || includePackages.includes(item.package)
  );
  proj.sources = filteredPackages.map((item) => ({
    kind: "file",
    url: new URL(item.filename, item.repository.url).toString(),
    digest: item.hash.sha256,
  }));
  await saveYAML(LINGLONG_YAML, proj, IProject);
  await Promise.all([
    opt.entry.length ? savePackages(SOURCES_LIST, entries) : null,
    savePackages(
      DEP_LIST_GENERATED,
      Array.from(filteredPackages, (x) => `${x.package}`)
    ),
    savePackages(
      DEP_LIST_ALL,
      Array.from(packages, (x) => `${x.package}`)
    ),
  ]);
};

export const updateCommand = new Command("update")
  .description("更新玲珑项目")
  .option(
    "-d,--depends <depends...>",
    "追加依赖列表",
    (x, y) => y.concat(x),
    []
  )
  .option("-e,--entry <entry...>", "追加APT源条目", (x, y) => y.concat(x), [])
  .option("--cacheDir <cacheDir>", "APT缓存目录", ".cache")
  .option("--with-runtime", "引入默认org.deepin.Runtime")
  .option(
    "--base-list-file <baseListFile>",
    "Base环境包列表文件,用于筛选需下载的依赖"
  )
  .option(
    "--runtime-list-file <runtimeListFile>",
    "Runtime环境包列表文件,用于用于筛选需下载的依赖"
  )
  .option("--name <name>", "应用名称")
  .option("--kind <app|runtime>", "应用类型")
  .option("--version <x.x.x.x>", "版本号")
  .option("--description <description>", "应用说明")
  .option("--base <id/version>", "基础依赖包")
  .option("--runtime <id/version>", "Runtime依赖包")
  .action(update);

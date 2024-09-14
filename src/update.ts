// Copyright (c) 2024 System233
//
// This software is released under the MIT License.
// https://opensource.org/licenses/MIT

import {
  joinURL,
  loadAuthConf,
  loadPackages,
  loadSourcesList,
  loadYAML,
  resolveOrAsset,
  savePackages,
  saveYAML,
} from "./utils.js";
import { IProject } from "./interface.js";
import {
  AUTH_CONF,
  DEP_EXCLUDE_LIST,
  DEP_INCLDUE_LIST,
  DEP_LIST,
  DEP_LIST_ALL,
  DEP_LIST_GENERATED,
  LINGLONG_BASE_PACKAGE_LIST,
  LINGLONG_RUNTIME_DEFAULT,
  LINGLONG_RUNTIME_PACKAGE_LIST,
  LINGLONG_YAML,
  SOURCES_LIST,
} from "./constant.js";
import { Command } from "commander";
import { PackageManager, parseSourceEnrty } from "apt-cli";
import { flat } from "./apt.js";

export interface CLIUpdateOption {
  id?: string;
  name?: string;
  depends: string[];
  entry: string[];
  withRuntime: boolean;
  runtime?: string;
  base?: string;

  cacheDir: string;
  version?: string;
  kind?: "app" | "runtime";
  description?: string;

  baseListFile?: string;
  runtimeListFile?: string;
  authConf?: string;
  quiet?: boolean;
}

export const update = async (opt: CLIUpdateOption) => {
  const manager = new PackageManager({ cacheDir: opt.cacheDir });
  const sourceList = await loadSourcesList();
  const entries = sourceList.concat(opt.entry);
  const authConf = await loadAuthConf(opt.authConf || AUTH_CONF, !opt.authConf);

  entries
    .map((item) => parseSourceEnrty(item))
    .filter((x) => x != null)
    .forEach((item) => manager.repository.create(item));

  authConf.forEach((item) => manager.auth.conf.push(item));
  await manager.load({ quiet: opt.quiet });
  const currentDeps = opt.depends.concat(await loadPackages(DEP_LIST));
  const packages = flat(
    currentDeps.flatMap((item) => {
      const pkg = manager.resolve(item, { recursive: true });
      if (pkg == null) {
        console.warn(`找不到依赖: ${JSON.stringify(item)}`);
        return [];
      }
      return [pkg];
    })
  );
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
  const envPackages = new Set([
    ...basePackages,
    ...runtimePackages,
    ...excludePackages,
  ]);
  const filteredPackages = packages.filter(
    (item) =>
      !envPackages.has(item.package) || includePackages.includes(item.package)
  );
  proj.sources = filteredPackages.map((item) => ({
    kind: "file",
    url: joinURL(item.repository.url, item.filename),
    digest: item.hash.sha256,
  }));

  proj.base = opt.base ?? proj.base;
  proj.runtime =
    opt.runtime ??
    proj.runtime ??
    (opt.withRuntime ? LINGLONG_RUNTIME_DEFAULT : undefined);
  proj.package.name = opt.name ?? proj.package.name;
  proj.package.kind = opt.kind ?? proj.package.kind;
  proj.package.version = opt.version ?? proj.package.version;
  proj.package.description = opt.kind ?? proj.package.description;

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
    [] as string[]
  )
  .option(
    "-e,--entry <entry...>",
    "追加APT源条目",
    (x, y) => y.concat(x),
    [] as string[]
  )
  .option("--auth-conf <FILE>", "APT auth.conf授权配置")
  .option("--cache-dir <DIR>", "APT缓存目录", ".cache")
  .option("--with-runtime", "引入默认org.deepin.Runtime")
  .option("--base-list-file <FILE>", "Base环境包列表文件,用于筛选需下载的依赖")
  .option(
    "--runtime-list-file <FILE>",
    "Runtime环境包列表文件,用于用于筛选需下载的依赖"
  )
  .option("--name <name>", "应用名称")
  .option("--kind <app|runtime>", "应用类型")
  .option("--version <x.x.x.x>", "版本号")
  .option("--description <TEXT>", "应用说明")
  .option("--base <id/version>", "基础依赖包")
  .option("--runtime <id/version>", "Runtime依赖包")
  .option("--quiet", "不显示进度条")
  .action(update);

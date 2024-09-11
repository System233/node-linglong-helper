// Copyright (c) 2024 System233
//
// This software is released under the MIT License.
// https://opensource.org/licenses/MIT

// Copyright (c) 2024 System233
//
// This software is released under the MIT License.
// https://opensource.org/licenses/MIT

import {
  getLinyapsName,
  joinRoot,
  loadAuthConf,
  loadPackages,
  lockPorjectDir,
  normalizeVersion,
  resolveAsset,
} from "./utils.js";
import { join } from "path";
import { Command } from "commander";
import { PackageManager, parseSourceEnrty } from "apt-cli";
import { create } from "./create.js";
import { getAllDepends } from "./apt.js";
import {
  LINGLONG_BOOT_DEFAULT,
  LINGLONG_RUNTIME_PACKAGE_LIST,
  SOURCES_LIST,
} from "./constant.js";

export interface CLIConvertOption {
  id?: string;
  name?: string;
  depends: string[];
  entry: string[];
  entryList: string[];
  withRuntime: boolean;
  withLinyaps: boolean;
  runtime?: string;
  base?: string;
  cacheDir?: string;
  version?: string;
  kind: "app" | "runtime";
  description?: string;
  boot?: string;
  baseListFile?: string;
  runtimeListFile?: string;
  authConf: string[];
  includeListFile: string[];
  excludeListFile: string[];
  from?: string;
}
const convert = async (rawId: string, opt: CLIConvertOption) => {

  console.log(opt)
  opt.id = rawId;
  const [pkgId] = opt.id.split(":", 1);
  const id = getLinyapsName(pkgId, opt.withLinyaps);

  await lockPorjectDir(id, async () => {
    const listEntries = await loadPackages(opt.entryList);
    const fromEntries = opt.from
      ? await loadPackages(joinRoot(SOURCES_LIST, opt.from))
      : [];
    const entries = opt.entry.concat(listEntries, fromEntries);

    const manager = new PackageManager({
      cacheDir: opt.cacheDir || join(id, ".cache"),
    });
    entries.forEach((item) =>
      manager.repository.create(parseSourceEnrty(item))
    );

    const authConf = await loadAuthConf(opt.authConf);
    authConf.forEach((item) => manager.auth.conf.push(item));

    await manager.load();

    const pkg = manager.resolve(opt.id, { recursive: true });
    if (!pkg) {
      throw new Error(`找不到包: ${JSON.stringify(opt.id)}`);
    }
    const allDepends = Array.from(
      new Set(opt.depends.concat(getAllDepends(pkg)))
    );
    const runtimePackages = await loadPackages(
      opt.runtimeListFile || resolveAsset(LINGLONG_RUNTIME_PACKAGE_LIST)
    );
    const neededRuntime = !!allDepends.find((item) =>
      runtimePackages.includes(item)
    );
    await create(pkgId, {
      id: pkgId,
      depends: [opt.id, ...opt.depends],
      name: opt.name || pkg.package,
      version: opt.version || normalizeVersion(pkg.version),
      kind: opt.kind || "app",
      withRuntime: neededRuntime || opt.withRuntime,
      description: opt.description || pkg.description,
      base: opt.base,
      runtime: opt.runtime,
      nolock: true,
      entry: entries,
      entryList: [],
      boot: opt.boot,
      authConf: opt.authConf,
      includeListFile: opt.includeListFile,
      excludeListFile: opt.excludeListFile,
      from: opt.from,
      withLinyaps: opt.withLinyaps,
    });
  });
};

export const convertCommand = new Command("convert")
  .description("创建DEB包转换项目")
  .argument("<id>", "DEB包名")
  .option("-d,--depends <depends...>", "依赖列表", (x, y) => y.concat(x), [])
  .option("-e,--entry <entry...>", "APT源条目", (x, y) => y.concat(x), [])
  .option(
    "-f,--entry-list <entryList...>",
    "APT源条目文件",
    (x, y) => y.concat(x),
    []
  )
  .option(
    "--auth-conf <authConf...>",
    "APT auth.conf授权配置",
    (x, y) => y.concat(x),
    []
  )
  .option("--cacheDir <cacheDir>", "APT缓存目录")
  .option(
    "--base-list-file <baseListFile>",
    "Base环境包列表文件,用于筛选需下载的依赖"
  )
  .option(
    "--runtime-list-file <runtimeListFile>",
    "Runtime环境包列表文件,用于用于筛选需下载的依赖"
  )
  .option(
    "--include-list-file <includeListFile...>",
    "强包含依赖列表文件",
    (x, y) => y.concat(x),
    []
  )
  .option(
    "--exclude-list-file <excludeListFile...>",
    "排除依赖列表文件",
    (x, y) => y.concat(x),
    []
  )
  .option("--with-runtime", "引入默认org.deepin.Runtime")
  .option("--with-linyaps", "包名添加.linyaps后缀")
  .option("--boot <boot>", "启动文件路径", LINGLONG_BOOT_DEFAULT)
  .option("--name <name>", "应用名称")
  .option("--kind <app|runtime>", "应用类型")
  .option("--version <x.x.x.x>", "版本号")
  .option("--description <description>", "应用说明")
  .option("--base <id/version>", "基础依赖包")
  .option("--runtime <id/version>", "Runtime依赖包")
  .option("--from <PROJECT>", "以指定项目为模板进行创建")
  .action(convert);

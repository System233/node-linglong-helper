// Copyright (c) 2024 System233
//
// This software is released under the MIT License.
// https://opensource.org/licenses/MIT

import {
  ControlKeys,
  fromDebFile,
  getLinyapsName,
  isDebFile,
  joinRoot,
  loadAuthConf,
  loadPackages,
  lockPorjectDir,
  normalizeVersion,
  resolveAsset,
  resolveOrAsset,
  uniqueFilter,
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
  id: string;
  name?: string;
  depends: string[];
  entry: string[];
  entryList: string[];
  withRuntime: boolean;
  withLinyaps: boolean;
  runtime?: string;
  base?: string;
  cacheDir: string;
  version?: string;
  kind: "app" | "runtime";
  description?: string;
  boot?: string;
  baseListFile?: string;
  runtimeListFile?: string;
  authConf?: string;
  includeListFile?: string;
  excludeListFile?: string;
  quiet?: boolean;
  from?: string;
  retry: number;
}
const convert = async (rawId: string, opt: CLIConvertOption) => {
  // opt.id = rawId;
  const external: string[] = [];
  const [pkgId] = rawId.split(":", 1);
  let info: {
    control: Record<ControlKeys, string>;
    hash: string;
  } | null = null;
  if (await isDebFile(rawId)) {
    info = await fromDebFile(rawId, {
      quiet: opt.quiet,
      cacheDir: opt.cacheDir,
    });
    opt.id ||= info.control.Package;
    external.push(`file[digest=${info.hash}]+${rawId}`);
  }
  opt.id ||= pkgId;
  opt.id = opt.withLinyaps ? getLinyapsName(opt.id, opt.withLinyaps) : opt.id;
  await lockPorjectDir(opt.id, async () => {
    const listEntries = await loadPackages(opt.entryList);
    const fromEntries = opt.from
      ? await loadPackages(joinRoot(SOURCES_LIST, opt.from))
      : [];
    const entries = opt.entry.concat(listEntries, fromEntries);

    const manager = new PackageManager({
      cacheDir: opt.cacheDir || join(opt.id, ".cache"),
      retry: opt.retry,
    });
    entries
      .map((item) => parseSourceEnrty(item))
      .filter((x) => x != null)
      .filter(uniqueFilter())
      .forEach((item) => manager.repository.create(item));

    const authConf = await loadAuthConf(opt.authConf);
    authConf.forEach((item) => manager.auth.conf.push(item));

    await manager.load({ quiet: opt.quiet, retry: opt.retry });
    const allDepends: Set<string> = new Set();
    if (info != null) {
      const topLevel = info.control.Depends.split(",").map((x) => x.trim());
      opt.depends.push(...topLevel);
      const depends = topLevel
        .flatMap((item) => manager.resolve(item, { recursive: true }))
        .filter((x) => x != null);
      getAllDepends(depends).forEach((item) => allDepends.add(item));
      opt.version ||= normalizeVersion(info.control.Version);
      opt.description ||= info.control.Description;
      opt.name ||= info.control.Package;
    } else {
      const pkg = manager.resolve(rawId, { recursive: true });
      if (!pkg) {
        throw new Error(`找不到包: ${JSON.stringify(rawId)}`);
      }
      getAllDepends(pkg).forEach((item) => allDepends.add(item));
      opt.version ||= normalizeVersion(pkg.version);
      opt.description ||= pkg.description;
      opt.name ||= pkg.package;
      opt.depends.push(rawId);
    }

    const runtimePackages = await loadPackages(
      opt.runtimeListFile ||
        (await resolveOrAsset(LINGLONG_RUNTIME_PACKAGE_LIST, opt.from))
    );
    const neededRuntime = !!runtimePackages.find((item) =>
      allDepends.has(item)
    );
    await create(opt.id, {
      id: opt.id,
      external,
      depends: opt.depends,
      name: opt.name,
      version: opt.version,
      kind: opt.kind || "app",
      withRuntime: neededRuntime || opt.withRuntime,
      description: opt.description,
      base: opt.base,
      runtime: opt.runtime,
      nolock: true,
      entry: opt.entry,
      entryList: opt.entryList,
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
  .argument("<package>", "DEB包名")
  .option(
    "-d,--depends <depends...>",
    "依赖列表",
    (x, y) => y.concat(x),
    [] as string[]
  )
  .option(
    "-e,--entry <entry...>",
    "APT源条目",
    (x, y) => y.concat(x),
    [] as string[]
  )
  .option(
    "-f,--entry-list <FILE...>",
    "APT源条目文件",
    (x, y) => y.concat(x),
    [] as string[]
  )
  .option("--auth-conf <FILE>", "APT auth.conf授权配置")
  .option("--cache-dir <DIR>", "APT缓存目录")
  .option("--base-list-file <FILE>", "Base环境包列表文件,用于筛选需下载的依赖")
  .option(
    "--runtime-list-file <FILE>",
    "Runtime环境包列表文件,用于用于筛选需下载的依赖"
  )
  .option("--include-list-file <FILE>", "强包含依赖列表文件")
  .option("--exclude-list-file <FILE>", "排除依赖列表文件")
  .option("--with-runtime", "引入默认org.deepin.Runtime")
  .option("--with-linyaps", "包名添加.linyaps后缀")
  .option("--boot <boot>", "启动文件路径", LINGLONG_BOOT_DEFAULT)
  .option("--name <name>", "应用名称")
  .option("--id <id>", "应用ID")
  .option("--kind <app|runtime>", "应用类型")
  .option("--version <x.x.x.x>", "版本号")
  .option("--description <TEXT>", "应用说明")
  .option("--base <id/version>", "基础依赖包")
  .option("--runtime <id/version>", "Runtime依赖包")
  .option("--from <DIR>", "以指定项目为模板获取文件")
  .option("--quiet", "不显示进度条")
  .option("--retry <INT>", "下载重试次数", parseInt, 10)
  .action(convert);

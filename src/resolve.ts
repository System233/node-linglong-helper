// Copyright (c) 2024 System233
//
// This software is released under the MIT License.
// https://opensource.org/licenses/MIT

import { Command } from "commander";
import { spawn } from "child_process";
import {
  AUTH_CONF,
  LL_BUILDER_COMMAND,
  DETECT_DEP_SCRIPT,
  DEP_LIST,
} from "./constant.js";
import { createInterface } from "readline/promises";
import { IContentItem, PackageManager, parseSourceEnrty } from "apt-cli";
import {
  loadSourcesList,
  loadAuthConf,
  installAsset,
  loadPackages,
  savePackages,
} from "./utils.js";
import { update } from "./update.js";

export interface CLIResolveOption {
  cacheDir: string;
  authConf?: string;
  arch: string[];
  match: string;
  round: number;
  retry: number;
  from: string;
}
const execAsync = async (cmd: string, args: string[]) => {
  const proc = spawn(cmd, args, { stdio: "inherit", cwd: process.cwd() });
  const code = await new Promise<number>((resolve, reject) => {
    proc.on("exit", resolve);
    proc.on("error", reject);
  });
  if (code != 0) {
    throw new Error(
      `执行失败: cmd=${JSON.stringify(cmd)} args=${JSON.stringify(
        args
      )},code=${code}`
    );
  }
};
const runDetectDep = async (opt: CLIResolveOption) => {
  await update({
    cacheDir: opt.cacheDir,
    depends: [],
    entry: [],
    withRuntime: false,
    from: opt.from,
    retry: opt.retry,
  });
  await execAsync(LL_BUILDER_COMMAND, ["build"]);
  const proc = spawn(
    LL_BUILDER_COMMAND,
    ["run", "--exec", `./${DETECT_DEP_SCRIPT}`],
    { stdio: ["ignore", "pipe", "inherit"] }
  );
  const rl = createInterface({ input: proc.stdout });
  const set = new Set<string>();
  for await (const line of rl) {
    set.add(line.trim());
  }
  return set;
};
export const resolve = async (opt: CLIResolveOption) => {
  await installAsset(DETECT_DEP_SCRIPT, opt.from, { mode: "755" });
  const manager = new PackageManager({
    cacheDir: opt.cacheDir,
    retry: opt.retry,
  });
  const entries = await loadSourcesList();
  const authConf = await loadAuthConf(AUTH_CONF, true);

  entries
    .map((item) => parseSourceEnrty(item))
    .filter((x) => x != null)
    .forEach((item) => manager.repository.create(item));

  authConf.forEach((item) => manager.auth.conf.push(item));
  await manager.loadMetadata();
  await manager.loadContents();

  const regex = new RegExp(opt.match, "i");
  const depends = await loadPackages(DEP_LIST, true);
  const added = new Set<string>();
  const missing = new Set<string>();
  const difference = (x: Set<string>, y: Set<string>) => {
    for (const i of x) {
      if (!y.has(i)) {
        return true;
      }
    }
    for (const i of y) {
      if (!x.has(i)) {
        return true;
      }
    }
    return false;
  };
  const resolved: IContentItem[] = [];
  for (let i = 1; i <= opt.round; ++i) {
    let updated = false;
    console.warn(`[开始第`, i, `轮查找]`);
    const files = await runDetectDep(opt);
    if (!difference(files, missing)) {
      console.warn("缺失依赖列表无变化,结束查找");
      return;
    }
    const list = Array.from(files).filter(
      (item) => !resolved.find((pkg) => pkg.path.includes(item))
    );
    if (!list.length) {
      console.warn("未发现缺失依赖,结束查找");
      return;
    }
    console.warn("正在查找依赖:", ...list);
    const packages = await manager.find(
      `/${list.join("|")}$`,
      opt.arch.length ? opt.arch : undefined
    );

    const filtered = packages.filter((item) => regex.test(item.package));
    filtered.forEach((pkg) =>
      console.warn(
        `找到依赖 ${pkg.path} => ${pkg.package}:${pkg.index.architecture}`
      )
    );
    if (!filtered.length) {
      console.warn(`全部查找失败`);
      files.forEach((item) => missing.add(item));
    }
    const items = new Set(filtered.map((item) => item.package));
    items.forEach((item) => {
      if (!depends.includes(item)) {
        console.warn("添加依赖:", item);
        depends.push(item);
        updated = true;
        added.add(item);
      } else if (added.has(item)) {
        console.error("需要但可能被排除的依赖:", item);
      }
    });
    if (updated) {
      console.warn("依赖列表已更新");
      await savePackages(DEP_LIST, depends);
    }
    if (missing.size) {
      console.warn(missing.size, "个依赖无法解决");
      missing.forEach((item) => console.log(item));
    }

    resolved.push(...filtered);
  }
  await update({
    cacheDir: opt.cacheDir,
    depends: [],
    entry: [],
    withRuntime: false,
    from: opt.from,
    retry: opt.retry,
  });
};
export const resolveCommand = new Command("resolve")
  .description(`自动化解决隐式依赖`)
  .option(
    "--arch <ARCH...>",
    "指定架构范围进行搜索",
    (x, y) => y.concat(x),
    [] as string[]
  )
  .option("--match <REGEX>", "过滤包名", "^lib")
  .option("-r,--round <INT>", "最大查找轮数", parseInt, 3)
  .option("--cache-dir <DIR>", "APT缓存目录", ".cache")
  .option("--retry <INT>", "下载重试次数", parseInt, 10)
  .option("--from <DIR>", "以指定项目为模板获取文件")
  .action(resolve);

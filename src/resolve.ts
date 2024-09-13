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
  BIN_NAME,
} from "./constant.js";
import { createInterface } from "readline/promises";
import { PackageManager, parseSourceEnrty } from "apt-cli";
import {
  loadSourcesList,
  loadAuthConf,
  installAsset,
  loadPackages,
  savePackages,
} from "./utils.js";

export interface CLIResolveOption {
  cacheDir?: string;
  authConf?: string;
  arch: string[];
  match: string;
  round: number;
}
const execAsync = async (cmd: string, args: string[]) => {
  const proc = spawn(cmd, args, { stdio: "inherit" });
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
const runDetectDep = async () => {
  await execAsync(BIN_NAME, ["update"]);
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
  await installAsset(DETECT_DEP_SCRIPT, { mode: "755" });
  const manager = new PackageManager({ cacheDir: opt.cacheDir });
  const entries = await loadSourcesList();
  const authConf = await loadAuthConf(AUTH_CONF, true);
  entries.forEach((item) => manager.repository.create(parseSourceEnrty(item)));
  authConf.forEach((item) => manager.auth.conf.push(item));
  await manager.loadMetadata();
  await manager.loadContents();

  const regex = new RegExp(opt.match, "i");
  const depends = await loadPackages(DEP_LIST, true);
  const missing = new Set<string>();
  let updated = false;
  for (let i = 0; i < opt.round; ++i) {
    console.warn(`开始第`, i, `轮查找`);
    const files = await runDetectDep();
    if (!missing.difference(files).size) {
      console.warn("缺失依赖列表无变化,提前结束查找");
      return;
    }
    await Promise.all(
      Array.from(files).map(async (file) => {
        const packages = await manager.find(
          `/${file}$`,
          opt.arch.length ? opt.arch : null
        );

        packages
          .filter((item) => regex.test(item.package))
          .forEach((pkg) =>
            console.warn(
              `找到依赖 ${file} => ${pkg.package}:${pkg.index.architecture}`
            )
          );
        if (!packages.length) {
          console.warn(`未知依赖:`, file);
          missing.add(file);
        } else {
          missing.delete(file);
        }
        packages.forEach((item) => {
          if (!depends.includes(item.package)) {
            console.warn("添加依赖:", item.package);
            depends.push(item.package);
            updated = true;
          }
        });
      })
    );
  }
  if (updated) {
    console.warn("依赖列表已更新");
    await savePackages(DEP_LIST, depends);
  }
  if (missing.size) {
    console.warn(missing.size, "个依赖无法解决");
    missing.forEach((item) => console.log(item));
  }
  await execAsync(BIN_NAME, ["update"]);
};
export const resolveCommand = new Command("resolve")
  .description(`自动化解决隐式依赖`)
  .option("--arch <ARCH...>", "指定架构范围进行搜索", (x, y) => y.concat(x), [])
  .option("--match <regex>", "过滤包名", "^lib")
  .option("-r,--round <INT>", "最大查找轮数", parseInt, 3)
  .option("--cacheDir <cacheDir>", "APT缓存目录", ".cache")
  .action(resolve);

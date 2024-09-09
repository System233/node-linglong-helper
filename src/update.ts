// Copyright (c) 2024 System233
//
// This software is released under the MIT License.
// https://opensource.org/licenses/MIT

import {
  loadBasePackages,
  loadDepList,
  loadRuntimePackages,
  loadSourcesList,
  loadYAML,
  saveDepList,
  savePackages,
  saveYAML,
} from "./utils.js";
import { IProject } from "./interface.js";
import { DEP_LIST_GENERATED, LINGLONG_YAML } from "./constant.js";
import { Command } from "commander";
import { PackageManager, parseSourceEnrty } from "apt-cli";
import { flat } from "./apt.js";

export interface CLIUpdateOption {
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
const update = async (opt: CLIUpdateOption) => {
  const manager = new PackageManager({ cacheDir: opt.cacheDir });
  const sourceList = await loadSourcesList();
  sourceList
    .concat(opt.entry)
    .forEach((item) => manager.repository.create(parseSourceEnrty(item)));
  await manager.load();
  const currentDeps = [...(await loadDepList()), ...opt.depend];
  const packages = Array.from(
    new Set(
      currentDeps.flatMap((item) => {
        const pkg = manager.resolve(item, { recursive: true });
        if (pkg == null) {
          console.warn(`找不到依赖: ${JSON.stringify(item)}`);
          return [];
        }
        return flat(pkg);
      })
    )
  );

  const proj = await loadYAML<IProject>(LINGLONG_YAML);

  const [basePackages, runtimePackages] = await Promise.all([
    loadBasePackages(),
    proj.runtime ? await loadRuntimePackages() : [],
  ]);
  const envPackages = new Set(basePackages.concat(runtimePackages));
  const filteredPackages = packages.filter(
    (item) => !envPackages.has(item.package)
  );
  proj.sources = filteredPackages.map((item) => ({
    kind: "file",
    url: new URL(item.filename, item.repository.url).toString(),
    digest: item.hash.sha256,
  }));
  await saveYAML(LINGLONG_YAML, proj, IProject);
  await savePackages(
    DEP_LIST_GENERATED,
    Array.from(filteredPackages, (x) => `${x.package}`)
  );
};

export const updateCommand = new Command("update")
  .description("更新玲珑项目依赖")
  .option("-d,--depend <...depends>", "追加依赖列表", (x, y) => y.concat(x), [])
  .option("--entry <...entry>", "APT源条目", (x, y) => y.concat(x), [])
  .option("--cacheDir <cacheDir>", "APT缓存目录", ".cache")
  .option("--with-runtime", "引入默认org.deepin.Runtime")
  .option("--name <name>", "应用名称")
  .option("--kind <app|runtime>", "应用类型")
  .option("--version <x.x.x.x>", "版本号")
  .option("--description <description>", "应用说明")
  .option("--base <id/version>", "基础依赖包")
  .option("--runtime <id/version>", "Runtime依赖包")
  .action(update);

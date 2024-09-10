// Copyright (c) 2024 System233
//
// This software is released under the MIT License.
// https://opensource.org/licenses/MIT

import {
  getLinyapsName,
  install,
  loadPackages,
  lockPorjectDir,
  saveDepList,
  savePackages,
  saveYAML,
  validateYAML,
} from "./utils.js";
import { join } from "path";
import { IProject } from "./interface.js";
import {
  BIN_NAME,
  BUILD_SCRIPT,
  INSTALL_DEP_SCRIPT,
  INSTALL_START_SCRIPT,
  LINGLONG_BASE_DEFAULT,
  LINGLONG_BOOT_DEFAULT,
  LINGLONG_RUNTIME_DEFAULT,
  LINGLONG_YAML,
  LINGLONG_YAML_VERSION,
  SOURCES_LIST,
} from "./constant.js";
import { Command } from "commander";

export interface CLICreateOption {
  id: string;
  name: string;
  version: string;
  depends: string[];
  entry: string[];
  entryList: string[];
  kind: "app" | "runtime";
  withRuntime: boolean;
  description: string;
  base: string;
  runtime: string;
  nolock: boolean;
  boot: string;
}
export const create = async (rawId: string, opt: CLICreateOption) => {
  opt.id = rawId;
  const id = getLinyapsName(opt.id);
  await lockPorjectDir(
    id,
    async () => {
      const listEntries = await Promise.all(
        opt.entryList.map((item) => loadPackages(item))
      );
      const entries = opt.entry.concat(listEntries.flat());
      await savePackages(SOURCES_LIST, entries);

      const yamlFile = join(id, LINGLONG_YAML);
      const cmd = `/opt/apps/${id}/files/${opt.boot || LINGLONG_BOOT_DEFAULT}`;
      const proj: IProject = await validateYAML({
        version: LINGLONG_YAML_VERSION,
        package: {
          id,
          name: opt.name,
          version: opt.version,
          kind: opt.kind,
          description: opt.description,
        },
        command: [cmd],
        base: opt.base || LINGLONG_BASE_DEFAULT,
        runtime:
          opt.runtime || opt.withRuntime ? LINGLONG_RUNTIME_DEFAULT : undefined,
        build: [
          `export LINGLONG_RAW_ID=${JSON.stringify(opt.id)}`,
          `export LINGLONG_APP_ID=${JSON.stringify(id)}`,
          `export LINGLONG_APP_NAME=${JSON.stringify(opt.name)}`,
          `export LINGLONG_APP_VERSION=${JSON.stringify(opt.version)}`,
          `export LINGLONG_APP_KIND=${JSON.stringify(opt.kind)}`,
          `export LINGLONG_APP_DESC=${JSON.stringify(opt.description)}`,
          `export LINGLONG_COMMAND=${JSON.stringify(cmd)}`,
          `exec /project/${BUILD_SCRIPT}`,
        ].join("\n"),
      });
      await saveYAML<IProject>(yamlFile, proj);
      await saveDepList(opt.depends, id);
      await Promise.all([
        install(INSTALL_DEP_SCRIPT, id),
        install(INSTALL_START_SCRIPT, id),
        install(BUILD_SCRIPT, id),
      ]);
      console.log(
        `已创建项目:${id}, 可通过以下命令进行初始化:\n\tcd ${id};\n\t${BIN_NAME} update`
      );
    },
    opt.nolock
  );
};

export const command = new Command("create")
  .description("创建玲珑包工程")
  .argument("<id>", "包名")
  .option("-d,--depend <depends...>", "依赖列表", (x, y) => y.concat(x), [])
  .option("-e,--entry <entry...>", "APT源条目", (x, y) => y.concat(x), [])
  .option("-f,--entry-list <...entryList>", "APT源条目文件")
  .option("--with-runtime", "引入默认org.deepin.Runtime")
  .option("--boot <boot>", "启动文件路径", LINGLONG_BOOT_DEFAULT)
  .option("--name <name>", "应用名称", "App Name")
  .option("--kind <app|runtime>", "应用类型", "app")
  .option("--version <x.x.x.x>", "版本号", "0.0.0.1")
  .option("--description <description>", "应用说明", "Description")
  .option("--base <package/version>", "基础依赖包")
  .option("--runtime <package/version>", "Runtime依赖包")
  .action(create);

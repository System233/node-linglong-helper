// Copyright (c) 2024 System233
//
// This software is released under the MIT License.
// https://opensource.org/licenses/MIT

import {
  exists,
  getLinyapsName,
  installAsset,
  installFile,
  joinRoot,
  loadPackages,
  loadYAML,
  lockPorjectDir,
  savePackages,
  saveYAML,
  validateYAML,
} from "./utils.js";
import { join } from "path";
import { IProject } from "./interface.js";
import {
  AUTH_CONF,
  BIN_NAME,
  BUILD_SCRIPT,
  DEP_EXCLUDE_LIST,
  DEP_INCLDUE_LIST,
  DEP_LIST,
  DOT_GITIGNORE,
  DOT_GITIGNORE_RENAME,
  INSTALL_DEP_SCRIPT,
  INSTALL_START_SCRIPT,
  LINGLONG_BASE_DEFAULT,
  LINGLONG_BASE_PACKAGE_LIST,
  LINGLONG_BOOT_DEFAULT,
  LINGLONG_RUNTIME_DEFAULT,
  LINGLONG_RUNTIME_PACKAGE_LIST,
  LINGLONG_YAML,
  LINGLONG_YAML_VERSION,
  SOURCES_LIST,
} from "./constant.js";
import { Command } from "commander";

export interface CLICreateOption {
  id?: string;
  name?: string;
  version?: string;
  depends: string[];
  entry: string[];
  entryList: string[];
  kind?: "app" | "runtime";
  withRuntime: boolean;
  withLinyaps: boolean;
  description?: string;
  base?: string;
  runtime?: string;
  nolock?: boolean;
  boot?: string;
  baseListFile?: string;
  runtimeListFile?: string;
  authConf: string;
  from?: string;
  includeListFile?: string;
  excludeListFile?: string;
}
export const create = async (rawId: string, opt: CLICreateOption) => {
  opt.id = rawId;
  const id = getLinyapsName(opt.id, opt.withLinyaps);
  await lockPorjectDir(
    id,
    async () => {
      if (opt.from) {
        if (!(await exists(opt.from))) {
          console.warn(
            `警告: 模板项目不存在, formDir=${JSON.stringify(opt.from)}`
          );
        }
        const yamlPath = joinRoot(LINGLONG_YAML, opt.from);
        const dependsList = joinRoot(DEP_LIST, opt.from);
        const sourcesList = joinRoot(SOURCES_LIST, opt.from);
        const tasks = [
          [sourcesList, () => opt.entryList.push(sourcesList)],
          [
            yamlPath,
            async () => {
              const form = await loadYAML<IProject>(
                joinRoot(LINGLONG_YAML, opt.from)
              );
              opt.name = opt.name ?? form.package?.name;
              opt.version = opt.version ?? form.package?.version;
              opt.description = opt.description ?? form.package?.description;
              opt.kind = opt.kind ?? form.package?.kind;
              opt.base = opt.base ?? form.base;
              opt.runtime = opt.runtime ?? form.runtime;
            },
          ],
          [
            dependsList,
            async () => {
              const depends = await loadPackages(dependsList, true);
              depends.forEach((item) => opt.depends.push(item));
            },
          ],
        ] as Array<[string, () => Promise<void> | void]>;
        await Promise.all(
          tasks.map(async ([file, resolve]) => {
            if (await exists(file)) {
              await resolve();
            }
          })
        );
      }
      const listEntries = await loadPackages(opt.entryList);
      const entries = opt.entry.concat(listEntries.flat());

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
      await Promise.all([
        savePackages(joinRoot(SOURCES_LIST, id), entries),
        savePackages(joinRoot(DEP_LIST, id), opt.depends),
        installAsset(DOT_GITIGNORE, opt.from, {
          root: id,
          mode: "644",
          rename: DOT_GITIGNORE_RENAME,
        }),
        installAsset(INSTALL_DEP_SCRIPT, opt.from, { root: id, mode: "755" }),
        installAsset(INSTALL_START_SCRIPT, opt.from, { root: id, mode: "755" }),
        installAsset(BUILD_SCRIPT, opt.from, { root: id, mode: "755" }),
        opt.authConf
          ? installFile(opt.authConf, { root: id, mode: "644" })
          : installAsset(AUTH_CONF, opt.from, { root: id, mode: "644" }),
        opt.includeListFile
          ? installFile(opt.includeListFile, { root: id, mode: "644" })
          : installAsset(DEP_INCLDUE_LIST, opt.from, { root: id, mode: "644" }),
        opt.excludeListFile
          ? installFile(opt.excludeListFile, { root: id, mode: "644" })
          : installAsset(DEP_EXCLUDE_LIST, opt.from, { root: id, mode: "644" }),
        opt.baseListFile
          ? installFile(opt.baseListFile, { root: id, mode: "644" })
          : installAsset(LINGLONG_BASE_PACKAGE_LIST, opt.from, {
              root: id,
              mode: "644",
            }),
        opt.runtimeListFile
          ? installFile(opt.runtimeListFile, { root: id, mode: "644" })
          : installAsset(LINGLONG_RUNTIME_PACKAGE_LIST, opt.from, {
              root: id,
              mode: "644",
            }),
      ]);
      console.log(
        `已创建项目 ${id}, 可通过以下命令进行初始化:\n cd ${id}\n ${BIN_NAME} update`
      );
    },
    opt.nolock
  );
};

export const command = new Command("create")
  .description("创建玲珑包工程")
  .argument("<id>", "包名")
  .option("-d,--depends <depends...>", "依赖列表", (x, y) => y.concat(x), [])
  .option("-e,--entry <entry...>", "APT源条目", (x, y) => y.concat(x), [])
  .option(
    "-f,--entry-list <FILE...>",
    "APT源条目文件",
    (x, y) => y.concat(x),
    []
  )
  .option("--auth-conf <FILE>", "APT auth.conf授权配置")
  .option("--include-list-file <FILE>", "强包含依赖列表文件")
  .option("--exclude-list-file <FILE>", "排除依赖列表文件")
  .option("--with-runtime", "引入默认org.deepin.Runtime")
  .option("--with-linyaps", "包名添加.linyaps后缀")
  .option("--boot <boot>", "启动文件路径", LINGLONG_BOOT_DEFAULT)
  .option("--name <name>", "应用名称", "App Name")
  .option("--kind <app|runtime>", "应用类型", "app")
  .option("--version <x.x.x.x>", "版本号", "0.0.0.1")
  .option("--description <TEXT>", "应用说明", "Description")
  .option("--base <package/version>", "基础依赖包")
  .option("--runtime <package/version>", "Runtime依赖包")
  .option("--base-list-file <FILE>", "Base环境包列表文件,用于筛选需下载的依赖")
  .option(
    "--runtime-list-file <FILE>",
    "Runtime环境包列表文件,用于用于筛选需下载的依赖"
  )
  .option("--from <DIR>", "以指定项目为模板获取文件")
  .action(create);

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
  resolveAsset,
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
  INSTALL_DEP_SCRIPT,
  INSTALL_START_SCRIPT,
  LINGLONG_BASE_DEFAULT,
  LINGLONG_BASE_PACKAGE_LIST,
  LINGLONG_BOOT_DEFAULT,
  LINGLONG_RUNTIME_DEFAULT,
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
  authConf: string[];
  fromDir?: string;
  includeListFile: string[];
  excludeListFile: string[];
}
export const create = async (rawId: string, opt: CLICreateOption) => {
  opt.id = rawId;
  const id = getLinyapsName(opt.id, opt.withLinyaps);
  await lockPorjectDir(
    id,
    async () => {
      if (opt.fromDir) {
        if (!(await exists(opt.fromDir))) {
          console.warn(
            `警告: 模板项目不存在, formDir=${JSON.stringify(opt.fromDir)}`
          );
        }
        const form = await loadYAML<IProject>(
          joinRoot(LINGLONG_YAML, opt.fromDir)
        );
        opt.name = opt.name ?? form.package?.name;
        opt.version = opt.version ?? form.package?.version;
        opt.kind = opt.kind ?? form.package?.kind;
        opt.base = opt.base ?? form.base;
        opt.runtime = opt.runtime ?? form.runtime;
        opt.description = opt.description ?? form.package.description;
        const dependsList = joinRoot(DEP_LIST, opt.fromDir);
        const authConf = joinRoot(AUTH_CONF, opt.fromDir);
        const sourcesList = joinRoot(SOURCES_LIST, opt.fromDir);
        const includeList = joinRoot(DEP_INCLDUE_LIST, opt.fromDir);
        const excludeList = joinRoot(DEP_EXCLUDE_LIST, opt.fromDir);
        await Promise.all(
          [
            [authConf, () => opt.authConf.push(authConf)] as const,
            [sourcesList, () => opt.entryList.push(sourcesList)] as const,
            [includeList, () => opt.includeListFile.push(includeList)] as const,
            [excludeList, () => opt.excludeListFile.push(excludeList)] as const,
          ].map(async ([file, resolve]) => {
            if (await exists(file)) {
              resolve();
            }
          })
        );
        const depends = await loadPackages(dependsList, true);
        depends.forEach((item) => opt.depends.push(item));
      }
      const listEntries = await loadPackages(opt.entryList);
      const entries = opt.entry.concat(listEntries.flat());

      const authConf = await loadPackages(opt.authConf);
      const includeList = await loadPackages(opt.includeListFile);
      const excludeList = await loadPackages(opt.excludeListFile);

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
      const baseListFile =
        opt.baseListFile || resolveAsset(LINGLONG_BASE_PACKAGE_LIST);
      const runtimeListFile =
        opt.runtimeListFile || resolveAsset(LINGLONG_RUNTIME_DEFAULT);
      await saveYAML<IProject>(yamlFile, proj);
      await Promise.all([
        savePackages(joinRoot(SOURCES_LIST, id), entries),
        savePackages(joinRoot(DEP_LIST, id), opt.depends),
        savePackages(joinRoot(AUTH_CONF, id), authConf),
        installAsset(INSTALL_DEP_SCRIPT, id),
        installAsset(INSTALL_START_SCRIPT, id),
        installAsset(BUILD_SCRIPT, id),
        installFile(baseListFile, id),
        (opt.runtime || opt.withRuntime || opt.runtimeListFile) &&
          installFile(runtimeListFile, id),
        includeList.length &&
          savePackages(joinRoot(DEP_INCLDUE_LIST, id), includeList),
        excludeList.length &&
          savePackages(joinRoot(DEP_EXCLUDE_LIST, id), excludeList),
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
  .option("--name <name>", "应用名称", "App Name")
  .option("--kind <app|runtime>", "应用类型", "app")
  .option("--version <x.x.x.x>", "版本号", "0.0.0.1")
  .option("--description <description>", "应用说明", "Description")
  .option("--base <package/version>", "基础依赖包")
  .option("--runtime <package/version>", "Runtime依赖包")
  .option(
    "--base-list-file <baseListFile>",
    "Base环境包列表文件,用于筛选需下载的依赖"
  )
  .option(
    "--runtime-list-file <runtimeListFile>",
    "Runtime环境包列表文件,用于用于筛选需下载的依赖"
  )
  .option("--from <fromDir>", "以指定项目为模板进行创建")
  .action(create);

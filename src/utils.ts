// Copyright (c) 2024 System233
//
// This software is released under the MIT License.
// https://opensource.org/licenses/MIT

import {
  access,
  chmod,
  constants,
  copyFile,
  mkdir,
  readFile,
  rm,
  writeFile,
} from "fs/promises";
import yaml from "yaml";
import { InstallOption, IProject } from "./interface.js";
import { plainToInstance } from "class-transformer";
import { validate, ValidationError } from "class-validator";
import { SOURCES_LIST, INSTALL_PATCH_SCRIPT, SHEBANG } from "./constant.js";
import { basename, join } from "path";
import { fileURLToPath } from "node:url";
import { APTAuthConf, loadAPTAuthConf } from "apt-cli";

export const getLinyapsName = (x: string, withLinyaps: boolean) =>
  !withLinyaps ? x : x.endsWith(".linyaps") ? x : `${x}.linyaps`;

export const loadYAML = async <T>(file: string) => {
  const buffer = await readFile(file, "utf8");
  return yaml.parse(buffer) as T;
};

export const saveYAML = async <T extends object = any>(
  file: string,
  data: T,
  type?: new () => T
) => {
  if (type) {
    data = await validateType(type, data);
  }
  await writeFile(file, yaml.stringify(data));
};

export const formatValidationError = (errors: ValidationError[]) => {
  // return errors.map(item=>item.toString()).join('\n')
  const format = (error: ValidationError, id?: string) => {
    const current = id ? `${id}.${error.property}` : error.property;
    if (error.constraints) {
      return `属性 ${current}: ${Object.values(error.constraints).join(",")}`;
    }
    return error.children.flatMap((item) => format(item, current));
  };
  return errors.flatMap((error) => format(error)).join("\n");
};
export const validateType = async <T extends object>(
  type: new () => T,
  data: T
) => {
  const instance = plainToInstance(type, data);
  const errors = await validate(instance);
  if (errors.length) {
    throw new Error(formatValidationError(errors));
  }
  return instance;
};
export const validateYAML = (project: IProject) =>
  validateType(IProject, project);

export const normalizeVersion = (version: string) => {
  const data = version.replaceAll(/[^\d\.]/g, "");
  const segments = data.split(".").slice(0, 4);
  if (segments.length < 4) {
    segments.splice(
      0,
      0,
      ...Array.from({ length: 4 - segments.length }).map((x) => "0")
    );
  }
  return segments.map((x) => parseInt(x)).join(".");
};

export const loadPackages = async (
  listFile: string | string[],
  noWarn?: boolean
): Promise<string[]> => {
  if (Array.isArray(listFile)) {
    const result = await Promise.all(
      listFile.map((item) => loadPackages(item, noWarn))
    );
    return result.flat();
  }
  try {
    const data = await readFile(listFile, "utf8");
    return data
      .split("\n")
      .map((x) => x.trim())
      .filter((x) => x.length && !x.startsWith("#"));
  } catch (err) {
    if (!noWarn) {
      console.warn(`无法加载: ${JSON.stringify(listFile)}`, err);
    }
    return [];
  }
};
export const resolveOrAsset = async (name: string) => {
  if (await exists(name)) {
    return name;
  }
  return resolveAsset(name);
};
export const resolveAsset = (name: string) =>
  join(fileURLToPath(import.meta.resolve(".")), "../assets", name);

export const joinRoot = (file: string, root?: string) =>
  root ? join(root, file) : file;

export const savePackages = async (listFile: string, packages: string[]) => {
  await writeFile(listFile, packages.join("\n"));
};

export const loadSourcesList = async (root?: string) => {
  const data = await loadPackages(joinRoot(SOURCES_LIST, root));
  return data.filter((item) => !item.startsWith("#"));
};
export const createPorjectDir = async (id: string) => {
  try {
    await mkdir(id);
  } catch (error) {
    console.error(`错误：创建项目失败，文件已存在: ${JSON.stringify(id)}`);
    process.exit(1);
  }
};
export const lockPorjectDir = async (
  id: string,
  cb: () => Promise<void>,
  nolock?: boolean
) => {
  if (nolock) {
    await cb();
    return;
  }
  await createPorjectDir(id);
  try {
    await cb();
  } catch (error) {
    console.error(error);
    await rm(id, { recursive: true });
    process.exit(1);
  }
};
export const exists = async (path: string) => {
  try {
    await access(path);
    return true;
  } catch (error) {
    return false;
  }
};
export const installFile = async (path: string, option?: InstallOption) => {
  const name = basename(path);
  const dest = joinRoot(option.rename ?? name, option.root);
  if (await exists(dest)) {
    return false;
  }
  await copyFile(path, dest, constants.COPYFILE_EXCL);
  if (option.mode) {
    await chmod(dest, option.mode);
  }
  return true;
};
export const installAsset = async (
  name: string,
  assetsDir?: string,
  option?: InstallOption
) => {
  if (assetsDir) {
    const path = join(assetsDir, name);
    if (await installFile(path, option)) {
      return true;
    }
  }
  const path = resolveAsset(name);
  return installFile(path, option);
};

export const installPatches = async (patches: string[], root?: string) => {
  const dest = joinRoot(INSTALL_PATCH_SCRIPT, root);
  const shebang = (await exists(dest)) ? "" : SHEBANG;

  await writeFile(dest, [].concat(shebang, patches).join("\n"), {
    flag: constants.O_APPEND | constants.O_CREAT | constants.O_WRONLY,
  });
  await chmod(dest, "755");
};

export const loadAuthConf = async (
  file: string | string[],
  noWarn?: boolean
): Promise<APTAuthConf[]> => {
  if (Array.isArray(file)) {
    const result = await Promise.all(
      file.map((item) => loadAuthConf(item, noWarn))
    );
    return result.flat();
  }
  try {
    return await loadAPTAuthConf(file, noWarn);
  } catch (error) {
    if (noWarn) {
      return [];
    }
    throw error;
  }
};

export const joinURL = (base: string, path: string) =>
  `${base}${base.endsWith("/") || path.startsWith("/") ? "" : "/"}${path}`;

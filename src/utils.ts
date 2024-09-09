// Copyright (c) 2024 System233
//
// This software is released under the MIT License.
// https://opensource.org/licenses/MIT

import { mkdir, readFile, rm, rmdir, writeFile } from "fs/promises";
import yaml from "yaml";
import { IProject } from "./interface.js";
import { plainToInstance } from "class-transformer";
import { validate, validateOrReject, ValidationError } from "class-validator";
import { parsePackageVersionString } from "apt-cli";
import {
  DEP_LIST,
  LINGLONG_BASE_PACKAGE_LIST,
  LINGLONG_RUNTIME_PACKAGE_LIST,
  SOURCES_LIST,
} from "./constant.js";
import { join } from "path";

export const getLinyapsName = (x: string) =>
  x.endsWith(".linyaps") ? x : `${x}.linyaps`;

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

export const loadPackages = async (listFile: string) => {
  try {
    const data = await readFile(listFile, "utf8");
    return data
      .split("\n")
      .map((x) => x.trim())
      .filter((x) => x.length);
  } catch (err) {
    console.warn(`无法加载: ${JSON.stringify(listFile)}`);
    return [];
  }
};

export const joinRoot = (file: string, root?: string) =>
  root ? join(root, file) : file;
export const savePackages = async (listFile: string, packages: string[]) => {
  await writeFile(listFile, packages.join("\n"));
};
export const loadRuntimePackages = () =>
  loadPackages(join(import.meta.dirname, "..", LINGLONG_RUNTIME_PACKAGE_LIST));
export const loadBasePackages = () =>
  loadPackages(join(import.meta.dirname, "..", LINGLONG_BASE_PACKAGE_LIST));

export const loadDepList = (root?: string) =>
  loadPackages(joinRoot(DEP_LIST, root));
export const saveDepList = (deps: string[], root?: string) =>
  savePackages(joinRoot(DEP_LIST, root), deps);

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

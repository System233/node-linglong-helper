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
import { InstallOption, IProject, ISource } from "./interface.js";
import { plainToInstance } from "class-transformer";
import { validate, ValidationError } from "class-validator";
import {
  createBzip2Stream,
  createXZStream,
  createGzipStream,
  streamToBuffer,
} from "apt-cli/dist/streams.js";
import { fetchBlob, FetchMetadataOption } from "apt-cli/dist/utils.js";
import { parseMetadata } from "apt-cli/dist/parsers.js";
import {
  SOURCES_LIST,
  INSTALL_PATCH_SCRIPT,
  SHEBANG,
  DEP_LIST_EXTERNAL,
} from "./constant.js";
import { basename, extname, join } from "path";
import { fileURLToPath } from "node:url";
import { APTAuthConf, loadAPTAuthConf } from "apt-cli";
import { createReadStream } from "fs";
import { createArchiveStream, IArchiveEntry } from "archive-stream";
import { Duplex, PassThrough } from "stream";
import { createHash } from "node:crypto";
import { createZstStream } from "./stream.js";
import { extract } from "tar-stream";

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
  const format = (error: ValidationError, id?: string): string | string[] => {
    const current = id ? `${id}.${error.property}` : error.property;
    if (error.constraints) {
      return `属性 ${current}: ${Object.values(error.constraints).join(",")}`;
    }
    return error.children?.flatMap((item) => format(item, current)) ?? [];
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
export const resolveOrAsset = async (name: string, root?: string) => {
  let fromName = name;
  if (root) {
    name = joinRoot(name, root);
  }
  if (await exists(fromName)) {
    return fromName;
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
  const dest = joinRoot(option?.rename ?? name, option?.root);
  if ((await exists(dest)) || !(await exists(path))) {
    return false;
  }
  await copyFile(path, dest, constants.COPYFILE_EXCL);
  if (option?.mode) {
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

  await writeFile(dest, [shebang, ...patches].join("\n"), {
    flag: constants.O_APPEND | constants.O_CREAT | constants.O_WRONLY,
  });
  await chmod(dest, "755");
};

export const loadAuthConf = async (
  file: string | string[] | undefined | null,
  noWarn?: boolean
): Promise<APTAuthConf[]> => {
  if (!file) {
    return [];
  }
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

export const uniqueFilter = <T>() => {
  const set = new Set<T>();
  return (item: T) => {
    if (set.has(item)) {
      return false;
    }
    set.add(item);
    return true;
  };
};

export const loadExternalPackages = async () => {
  const items = await loadPackages(DEP_LIST_EXTERNAL, true);
  return items.flatMap((item) => {
    const match = /(file|archive|git)(?:\[(.*?)\])?\+(\S+)/.exec(item);
    if (!match) {
      console.error("无效的外部依赖:", item);
      return [];
    }
    const [, kind, attrs, url] = match;
    const attr = attrs
      ? Object.fromEntries(attrs.split(/\s+/).map((attr) => attr.split("=")))
      : {};
    return {
      kind,
      version: attr.version,
      digest: attr.digest,
      commit: attr.commit,
      url,
    } as ISource;
  });
};

export const openDebStream = async (
  file: string,
  option?: FetchMetadataOption
) => {
  if (URL.canParse(file)) {
    return await fetchBlob(file, null, option);
  }
  return createReadStream(file);
};
export const createExtractControlStream = (file: string): Duplex => {
  const ext = extname(file);
  switch (ext.toLowerCase()) {
    case ".gz":
      return createGzipStream();
    case ".zst":
    case ".zstd":
      return createZstStream();
    case ".bz2":
    case ".bzip2":
      return createBzip2Stream();
    case ".xz":
      return createXZStream();
    case ".tar":
      return new PassThrough();
    default:
      throw new Error("不支持的控制文件类型: " + ext);
  }
};

export type ControlKeys =
  | "Package"
  | "Version"
  | "Section"
  | "Architecture"
  | "Depends"
  | "Maintainer"
  | "Homepage"
  | "Description";

export const fromDebFile = async (
  file: string,
  option?: FetchMetadataOption
) => {
  const stream = await openDebStream(file, option);
  const hash = createHash("sha1");
  stream.on("data", (chunk) => hash.update(chunk));
  const archive = stream.pipe(createArchiveStream());
  let control: Record<ControlKeys, string> | null = null;
  return new Promise<{ control: Record<ControlKeys, string>; hash: string }>(
    (resolve, reject) => {
      archive.on("data", (entry: IArchiveEntry) => {
        if (entry.name.startsWith("control.tar")) {
          const stream = createExtractControlStream(entry.name);
          const tar = extract();
          stream.pipe(tar);
          stream.write(entry.content);
          stream.end();
          tar.on("entry", async (header, stream, next) => {
            try {
              if (header.name == "./control") {
                const controlBuffer = await streamToBuffer(stream);
                control = parseMetadata<ControlKeys>(
                  controlBuffer.toString()
                )[0];
              }
              next();
            } catch (error) {
              next(error);
            }
          });
        }
      });
      archive.once("end", () => {
        if (!control) {
          throw new Error(`输入中找不到控制信息:${file}`);
        }
        resolve({
          hash: hash.digest("hex"),
          control,
        });
      });
      archive.once("error", reject);
    }
  );
};

export const isDebFile = async (id: string) => {
  if (URL.canParse(id) || (await exists(id))) {
    return true;
  }
  return false;
};

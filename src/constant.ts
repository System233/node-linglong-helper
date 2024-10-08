// Copyright (c) 2024 System233
//
// This software is released under the MIT License.
// https://opensource.org/licenses/MIT

export const BIN_NAME = "ll-helper";
export const DEP_LIST = "deps.list";
export const DEP_EXCLUDE_LIST = "deps.exclude.list";
export const DEP_INCLDUE_LIST = "deps.include.list";
export const DEP_LIST_GENERATED = "deps.generated.list";
export const DEP_LIST_ALL = "deps.all.list";
export const DEP_LIST_EXTERNAL = "deps.external.list";

export const DETECT_DEP_SCRIPT = "detect_dep.sh";
export const SOURCES_LIST = "sources.list";
export const AUTH_CONF = "auth.conf";
export const LINGLONG_YAML = "linglong.yaml";
export const LINGLONG_YAML_VERSION = "1.0";

export const LINGLONG_BASE_DEFAULT = "org.deepin.foundation/23.0.0";
export const LINGLONG_RUNTIME_DEFAULT = "org.deepin.Runtime/23.0.1";
export const LINGLONG_BOOT_DEFAULT = "bin/start.sh";

export const LINGLONG_RUNTIME_PACKAGE_LIST = "runtime.packages.list";
export const LINGLONG_BASE_PACKAGE_LIST = "base.packages.list";
export const BUILD_SCRIPT = "build.sh";
export const INSTALL_PATCH_SCRIPT = "install_patch.sh";
export const INSTALL_DEP_SCRIPT = "install_dep.sh";
export const INSTALL_START_SCRIPT = "install_start.sh";
export const DOT_GITIGNORE = ".gitignore";

export const LL_BUILDER_COMMAND =
  process.env.LL_BUILDER_COMMAND ?? "ll-builder";

export const SHEBANG = "#!/bin/bash";

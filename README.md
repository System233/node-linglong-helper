<!--
 Copyright (c) 2024 System233

 This software is released under the MIT License.
 https://opensource.org/licenses/MIT
-->

# ll-helper - 玲珑助手

关于如意玲珑，参见 https://linglong.dev/

## 功能&路线图

- [x] 创建玲珑项目
  - [x] 生成玲珑 DEB 转换项目
  - [x] 通过模板创建项目
  - [x] 可选 .linyaps 包名后缀
- [x] 依赖管理
  - [x] 筛选并更新 linglong.yaml 依赖项
  - [x] 指定查找依赖的 APT 源
  - [x] APT [auth.conf](https://manpages.debian.org/testing/apt/apt_auth.conf.5.en.html) 支持
  - [x] 指定 base/runime 依赖
  - [x] 指定 base/runtime 依赖包列表
  - [x] 自动检测是否需要引入 runime 依赖
  - [x] 自动化测试缺失依赖 (v0.2.0)
  - [x] 文件名=>包名查找器 (v0.2.0)
- [x] 图标处理
  - [x] 图标裁剪服务
  - [x] 图标裁剪命令
- [x] 模块化补丁
  - [x] glib
  - [x] ld (LD_LIBRARAY_PATH)
  - [x] icon
  - [x] java
  - [x] qt
  - [x] qpa
- [ ] 本地 DEB 输入
- [ ] 预下载 DEB（解决 ll-builder 不支持 auth.conf 的问题）
- [ ] 分离补丁仓库

## 安装&使用

```sh
sudo yarn global add linglong-helper #or npm add linglong-helper -g

ll-helper -h

Usage: ll-helper [options] [command]

Options:
  -h, --help              display help for command

Commands:
  create [options] <id>    创建玲珑包工程
  convert [options] <id>   创建DEB包转换项目
  update [options]         更新玲珑项目
  patch <name...>          添加应用补丁
  serve [options]          启动图标裁剪服务
  sharp [options] <input>  裁剪图片
  resolve [options]        自动化解决隐式依赖
  help [command]           display help for command
```

## 示例

```sh
ll-helper convert com.example.package -f sources.list --name "Example App Name" # 创建DEB转制项目
cd com.example.package.linyaps  # 切换到项目目录
ll-helper update                # 更新依赖项
# ll-helper patch ld            # 添加LD_LIBRARY_PATH补丁
ll-builder build                # 构建项目
ll-builder run                  # 测试运行
```

## 项目文件说明

| 名称                  | 必选        | 说明                                                                             |
| --------------------- | ----------- | -------------------------------------------------------------------------------- |
| deps.list             | 是          | 依赖包列表，忽略#开头注释                                                        |
| deps.all.list         | 自动生成    | 完整依赖列表                                                                     |
| deps.generated.list   | 自动生成    | 需要下载的依赖列表                                                               |
| auth.conf             | 否          | APT [auth.conf](https://manpages.debian.org/testing/apt/apt_auth.conf.5.en.html) |
| sources.list          | 否,自动生成 | APT 源定义列表                                                                   |
| base.packages.list    | 否,自动生成 | 基础包环境包列表                                                                 |
| runtime.packages.list | 否,自动生成 | Runtime 包环境包列表                                                             |
| env.sh                | 否          | 构建前环境变量配置                                                               |
| build.sh              | 是          | 构建脚本入口                                                                     |
| install_dep.sh        | 是          | 依赖安装脚本                                                                     |
| install_patch.sh      | 否          | 补丁安装脚本                                                                     |
| install_start.sh      | 是          | 程序入口生成脚本                                                                 |
| patch\_\*.sh          | 否          | 补丁脚本                                                                         |

## env.sh 构建变量

| 名称             | 说明                                            |
| ---------------- | ----------------------------------------------- |
| SHELL_CMD        | 应用入口文件，如 ELF、shell 脚本、python 脚本等 |
| SHELL_EXEC       | 执行命令使用的解释器                            |
| ENABLE_USR_PATCH | 若入口文件为脚本，修复其中/usr 路径             |

## 注意

- 不要使用 yarn ll-helper 方法运行，因为 CWD 不在当前目录。

## LICENSE

[MIT LICENSE](./LICENSE)

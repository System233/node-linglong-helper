<!--
 Copyright (c) 2024 System233
 
 This software is released under the MIT License.
 https://opensource.org/licenses/MIT
-->

# ll-helper - 玲珑助手

关于如意玲珑，参见 https://linglong.dev/ 

## 功能

- [x] 创建项目
- [x] 生成DEB转换项目
- [x] 依赖管理
  - [x] APT源配置
  - [x] 递归依赖分析 
- [ ] 本地DEB输入

## 安装&使用

```sh
sudo yarn global add linglong-helper #or npm add linglong-helper -g

npx ll-helper -h

Usage: ll-helper [options] [command]

Options:
  -h, --help              display help for command

Commands:
  create [options] <id>   创建玲珑包工程
  convert [options] <id>  创建DEB包转换项目
  update [options]        更新玲珑项目依赖
  help [command]          display help for command
```


## LICENSE

[MIT LICENSE](./LICENSE)
# Tabby 项目构建和发布指南

本文档说明如何使用 GitHub Actions 工作流程来构建和发布 Tabby Terminal 到你的私有仓库。

## 📋 工作流程概述

项目已配置了一个完整的 CI/CD 工作流程 (`.github/workflows/build-and-release.yml`)，支持：

- 🔍 代码检查和质量验证
- 🖥️ 多平台构建 (Windows、macOS、Linux)
- 🏗️ 多架构支持 (x64、ARM64)
- 📦 自动化发布到 GitHub Releases

## 🚀 触发方式

### 1. 自动触发

工作流程会在以下情况自动运行：

- **推送代码**到 `main` 或 `master` 分支
- **提交 Pull Request** 到 `main` 或 `master` 分支
- **推送标签** 格式为 `v*` (例如: `v1.0.0`)

### 2. 手动触发

你也可以手动触发构建：

1. 在 GitHub 仓库页面，点击 `Actions` 标签
2. 选择 `构建和发布到私有仓库` 工作流程
3. 点击 `Run workflow` 按钮
4. 选择是否创建发布版本
5. 点击 `Run workflow` 开始构建

## 📦 构建产物

工作流程会生成以下构建产物：

### Windows (x64 / ARM64)
- `*-setup-*.exe` - 安装版本
- `*-portable-*.zip` - 便携版本

### macOS (x86_64 / ARM64) 
- `*.dmg` - DMG 安装包
- `*.zip` - ZIP 压缩包

### Linux (x64 / ARM64)
- `*.AppImage` - 通用 Linux 应用
- `*.deb` - Debian/Ubuntu 包
- `*.rpm` - RedHat/CentOS/Fedora 包  
- `*.tar.gz` - 通用压缩包
- `*.pacman` - Arch Linux 包

## 🏷️ 发布版本

### 创建正式发布

要创建正式发布版本：

```bash
# 创建并推送标签
git tag v1.0.0
git push origin v1.0.0
```

这将触发完整的构建和发布流程，在 GitHub Releases 中创建新版本。

### 创建预发布版本

通过手动触发工作流程并选择"创建发布"，会生成带时间戳的预发布版本。

## ⚙️ 配置说明

### 必需的设置

工作流程使用以下 GitHub 配置：

- `GITHUB_TOKEN` - 自动提供，用于创建 releases
- 仓库需要启用 Actions 权限

### 可选配置

如果需要代码签名等高级功能，可以添加相应的 secrets：

- Windows 代码签名证书
- macOS 开发者证书  
- Linux 包签名密钥

## 🔧 本地构建

如果需要在本地进行构建测试：

```bash
# 安装依赖
npm i -g yarn
cd app && yarn
cd .. && yarn

# 构建类型定义
yarn run build:typings

# 构建前端
yarn run build

# 预打包插件
node scripts/prepackage-plugins.mjs

# 构建特定平台 (选择其一)
node scripts/build-windows.mjs  # Windows
node scripts/build-macos.mjs    # macOS  
node scripts/build-linux.mjs    # Linux
```

## 📁 文件结构

```
.github/
  workflows/
    build-and-release.yml     # 主要的构建发布工作流程

scripts/
  build-windows.mjs          # Windows 构建脚本
  build-macos.mjs            # macOS 构建脚本  
  build-linux.mjs            # Linux 构建脚本
  prepackage-plugins.mjs     # 插件预打包脚本
  vars.mjs                   # 构建变量配置

electron-builder.yml         # Electron 打包配置
package.json                 # 项目依赖和脚本
```

## 🔄 私有仓库同步

要将构建结果推送到你的私有仓库：

```bash
# 添加私有仓库 remote (如果还没有)
git remote add private git@github.com:dbds-team/my_tabby.git

# 推送到私有仓库
git push private main

# 推送标签到私有仓库
git push private --tags
```

## 🛠️ 故障排除

### 构建失败

1. **依赖安装失败**
   - 检查网络连接
   - 清理 yarn 缓存: `yarn cache clean`

2. **Rust 编译错误**  
   - 确保目标架构已安装: `rustup target list --installed`
   - 重新安装目标: `rustup target add <目标架构>`

3. **Electron 构建失败**
   - 检查 `electron-builder.yml` 配置
   - 验证签名证书设置

### 发布失败

1. **权限错误**
   - 确保仓库启用了 Actions 权限
   - 检查 `GITHUB_TOKEN` 权限

2. **文件上传失败**
   - 检查构建产物是否存在
   - 验证文件路径和权限

## 📞 联系支持

如有问题，请通过以下方式获取帮助：

- [提交 Issue](https://github.com/dbds-team/my_tabby/issues)
- [原项目文档](https://github.com/Eugeny/tabby)
- [Electron Builder 文档](https://www.electron.build/)

---

**最后更新**: $(date '+%Y-%m-%d')
**工作流程版本**: v1.0.0 
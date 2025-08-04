#!/usr/bin/env node
import shelljs from 'shelljs'
import fs from 'fs-extra'
import path from 'path'
import * as vars from './vars.mjs'

console.log('🤖 构建Android Hybrid应用...')

const androidDir = 'android-hybrid'
shelljs.rm('-rf', androidDir)
shelljs.mkdir('-p', androidDir)

// 首先构建Web版本
console.log('📦 构建Web版本...')
const buildResult = shelljs.exec('yarn run build')
if (buildResult.code !== 0) {
    console.error('❌ Web构建失败')
    process.exit(1)
}

// 检查构建输出目录
const distDir = 'app/dist'
if (!fs.existsSync(distDir)) {
    console.error('❌ 构建后未找到输出目录:', distDir)
    process.exit(1)
}

console.log('✅ Web构建成功，输出目录大小:', shelljs.exec(`du -sh ${distDir}`).stdout.trim())

// 创建Capacitor项目
console.log('⚡ 初始化Capacitor项目...')

const packageJson = {
  name: 'tabby-android',
  version: vars.version,
  description: 'Tabby Terminal for Android',
  scripts: {
    'build:web': 'echo "Web build already done"',
    'build:android': 'cap sync && cap build android',
    'run:android': 'cap run android'
  },
  dependencies: {
    '@capacitor/android': '^5.0.0',
    '@capacitor/app': '^5.0.0',
    '@capacitor/core': '^5.0.0',
    '@capacitor/filesystem': '^5.0.0',
    '@capacitor/keyboard': '^5.0.0',
    '@capacitor/splash-screen': '^5.0.0',
    '@capacitor/status-bar': '^5.0.0'
  },
  devDependencies: {
    '@capacitor/cli': '^5.0.0'
  }
}

fs.writeFileSync(`${androidDir}/package.json`, JSON.stringify(packageJson, null, 2))

// 复制构建输出到android-hybrid
console.log('📂 复制Web资源到Android项目...')
// 先创建www目录
shelljs.mkdir('-p', `${androidDir}/www`)
// 复制dist目录的内容（不是目录本身）
shelljs.cp('-r', `${distDir}/*`, `${androidDir}/www/`)
console.log('📦 复制后www目录大小:', shelljs.exec(`du -sh ${androidDir}/www`).stdout.trim())

// Capacitor配置
const capacitorConfig = {
  appId: 'org.tabby.terminal',
  appName: 'Tabby Terminal',
  webDir: 'www',
  server: {
    androidScheme: 'https',
    cleartext: true
  },
  android: {
    buildOptions: {
      minSdkVersion: 24,
      targetSdkVersion: 34
    }
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: '#1e1e1e',
      showSpinner: false
    },
    Keyboard: {
      resize: 'none'
    }
  }
}

fs.writeFileSync(`${androidDir}/capacitor.config.json`, JSON.stringify(capacitorConfig, null, 2))

// 创建index.html wrapper
const indexHtml = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="viewport-fit=cover, width=device-width, initial-scale=1.0, minimum-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <meta name="format-detection" content="telephone=no">
    <meta name="msapplication-tap-highlight" content="no">
    <title>Tabby Terminal</title>
    
    <style>
        body {
            margin: 0;
            padding: 0;
            background: #1e1e1e;
            color: #fff;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            overflow: hidden;
            -webkit-user-select: none;
            user-select: none;
        }
        
        #app {
            width: 100vw;
            height: 100vh;
            display: flex;
            flex-direction: column;
        }
        
        .terminal-container {
            flex: 1;
            overflow: hidden;
        }
        
        .loading {
            display: flex;
            align-items: center;
            justify-content: center;
            height: 100vh;
            flex-direction: column;
        }
        
        .spinner {
            border: 3px solid #444;
            border-top: 3px solid #0084ff;
            border-radius: 50%;
            width: 50px;
            height: 50px;
            animation: spin 1s linear infinite;
            margin-bottom: 20px;
        }
        
        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
    </style>
</head>
<body>
    <div id="app">
        <div class="loading">
            <div class="spinner"></div>
            <div>正在加载 Tabby Terminal...</div>
        </div>
    </div>
    
    <script type="module">
        import { Capacitor } from '@capacitor/core';
        import { StatusBar } from '@capacitor/status-bar';
        import { Keyboard } from '@capacitor/keyboard';
        import { App } from '@capacitor/app';
        
        // 隐藏状态栏
        if (Capacitor.isNativePlatform()) {
            StatusBar.hide();
            
            // 处理返回按钮
            App.addListener('backButton', ({ canGoBack }) => {
                if (!canGoBack) {
                    App.exitApp();
                }
            });
            
            // 键盘配置
            Keyboard.setAccessoryBarVisible({ isVisible: false });
        }
        
        // 加载Tabby
        window.addEventListener('DOMContentLoaded', () => {
            // 这里应该加载编译后的Tabby代码
            // 由于Tabby使用Electron API，需要适配层
            console.log('Tabby Terminal for Android');
            
            // 模拟终端界面
            document.getElementById('app').innerHTML = \`
                <div class="terminal-container">
                    <iframe src="../dist/index.html" 
                            style="width: 100%; height: 100%; border: none;"
                            sandbox="allow-scripts allow-same-origin allow-forms">
                    </iframe>
                </div>
            \`;
        });
    </script>
</body>
</html>`

fs.writeFileSync(`${androidDir}/index.html`, indexHtml)

// 创建构建脚本
const buildScript = `#!/bin/bash
set -e

echo "📱 构建Android应用..."

# 安装依赖
npm install

# 初始化Capacitor
npx cap init "Tabby Terminal" org.tabby.terminal --web-dir=../dist

# 添加Android平台
npx cap add android

# 同步Web资源
npx cap sync android

# 构建APK
echo "🔨 构建APK..."
cd android
./gradlew assembleDebug

echo "✅ APK构建完成！"
echo "📍 APK位置: android/app/build/outputs/apk/debug/"
`

fs.writeFileSync(`${androidDir}/build.sh`, buildScript)
shelljs.chmod('+x', `${androidDir}/build.sh`)

// 创建README
const readme = `# Tabby Terminal Android (Hybrid)

这是使用Capacitor构建的Tabby Terminal Android版本。

## 特性

- 基于Web技术的混合应用
- 支持基本的终端功能
- 触摸优化的界面
- 虚拟键盘支持

## 构建方法

### 前置要求
- Node.js 18+
- Android Studio
- Android SDK

### 构建步骤

1. 安装依赖：
\`\`\`bash
cd android-hybrid
npm install
\`\`\`

2. 构建应用：
\`\`\`bash
./build.sh
\`\`\`

3. 或手动构建：
\`\`\`bash
npx cap init "Tabby Terminal" org.tabby.terminal --web-dir=../dist
npx cap add android
npx cap sync android
npx cap open android  # 在Android Studio中打开
\`\`\`

## 限制

由于是Web-based应用，某些功能可能受限：
- 本地文件系统访问受限
- 无法直接访问系统终端
- 某些Electron特性不可用

## 建议

对于完整的终端体验，建议使用专门的Android终端应用如Termux。
`

fs.writeFileSync(`${androidDir}/README.md`, readme)

console.log('✅ Android Hybrid项目创建完成！')
console.log('📁 项目目录:', androidDir)
console.log('📖 查看README.md了解构建方法')
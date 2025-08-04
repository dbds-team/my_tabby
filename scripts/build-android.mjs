#!/usr/bin/env node
import shelljs from 'shelljs'
import fs from 'fs-extra'
import path from 'path'
import * as vars from './vars.mjs'

console.log('🤖 准备构建Android版本...')

// 创建Android项目结构
const androidDir = 'android-app'
shelljs.rm('-rf', androidDir)
shelljs.mkdir('-p', androidDir)

// 创建基于Termux的Android终端应用配置
const gradleConfig = `
plugins {
    id 'com.android.application'
    id 'org.jetbrains.kotlin.android'
}

android {
    namespace 'org.tabby.terminal'
    compileSdk 34

    defaultConfig {
        applicationId "org.tabby.terminal"
        minSdk 24
        targetSdk 34
        versionCode 1
        versionName "${vars.version}"

        testInstrumentationRunner "androidx.test.runner.AndroidJUnitRunner"
    }

    buildTypes {
        release {
            minifyEnabled false
            proguardFiles getDefaultProguardFile('proguard-android-optimize.txt'), 'proguard-rules.pro'
        }
    }
    
    buildFeatures {
        viewBinding true
    }
    
    compileOptions {
        sourceCompatibility JavaVersion.VERSION_17
        targetCompatibility JavaVersion.VERSION_17
    }
    
    kotlinOptions {
        jvmTarget = '17'
    }
}

dependencies {
    implementation 'androidx.core:core-ktx:1.12.0'
    implementation 'androidx.appcompat:appcompat:1.6.1'
    implementation 'com.google.android.material:material:1.11.0'
    implementation 'androidx.constraintlayout:constraintlayout:2.1.4'
    
    // WebView相关
    implementation 'androidx.webkit:webkit:1.9.0'
    
    // 终端模拟器核心库
    implementation 'com.termux:termux-app:0.118.0'
    implementation 'com.termux:terminal-view:0.118.0'
    implementation 'com.termux:terminal-emulator:0.118.0'
    
    // SSH客户端
    implementation 'com.jcraft:jsch:0.1.55'
    
    // 文件管理
    implementation 'commons-io:commons-io:2.11.0'
}
`

// 创建主Activity
const mainActivity = `package org.tabby.terminal

import android.os.Bundle
import android.webkit.WebView
import android.webkit.WebViewClient
import android.webkit.WebChromeClient
import android.webkit.WebSettings
import android.view.WindowManager
import androidx.appcompat.app.AppCompatActivity
import com.termux.terminal.TerminalSession
import com.termux.terminal.TerminalEmulator
import com.termux.view.TerminalView

class MainActivity : AppCompatActivity() {
    private lateinit var terminalView: TerminalView
    private lateinit var session: TerminalSession
    
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        
        // 全屏模式
        window.setFlags(
            WindowManager.LayoutParams.FLAG_FULLSCREEN,
            WindowManager.LayoutParams.FLAG_FULLSCREEN
        )
        
        // 初始化终端视图
        terminalView = TerminalView(this, null)
        setContentView(terminalView)
        
        // 创建终端会话
        val envVars = arrayOf("TERM=xterm-256color", "HOME=/data/data/org.tabby.terminal/files/home")
        val workingDir = "/data/data/org.tabby.terminal/files/home"
        val shell = "/system/bin/sh"
        
        session = TerminalSession(
            shell, workingDir, envVars, null,
            TerminalEmulator.DEFAULT_TERMINAL_TRANSCRIPT_ROWS,
            terminalView
        )
        
        terminalView.attachSession(session)
        
        // 设置终端样式
        terminalView.setTextSize(16)
        terminalView.setTypeface(android.graphics.Typeface.MONOSPACE)
    }
    
    override fun onDestroy() {
        super.onDestroy()
        session.finishIfRunning()
    }
}
`

// 创建AndroidManifest.xml
const androidManifest = `<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android"
    package="org.tabby.terminal">

    <uses-permission android:name="android.permission.INTERNET" />
    <uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />
    <uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE" />
    <uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE" />
    <uses-permission android:name="android.permission.WAKE_LOCK" />

    <application
        android:allowBackup="true"
        android:icon="@mipmap/ic_launcher"
        android:label="Tabby Terminal"
        android:theme="@style/Theme.AppCompat.NoActionBar"
        android:hardwareAccelerated="true">
        
        <activity
            android:name=".MainActivity"
            android:configChanges="orientation|keyboardHidden|keyboard|screenSize|smallestScreenSize|locale|layoutDirection|fontScale|screenLayout|density|uiMode"
            android:launchMode="singleTop"
            android:windowSoftInputMode="adjustResize"
            android:exported="true">
            <intent-filter>
                <action android:name="android.intent.action.MAIN" />
                <category android:name="android.intent.category.LAUNCHER" />
            </intent-filter>
        </activity>
        
    </application>

</manifest>
`

// 创建build.gradle.kts (Project级别)
const projectGradle = `
buildscript {
    repositories {
        google()
        mavenCentral()
    }
    dependencies {
        classpath("com.android.tools.build:gradle:8.2.0")
        classpath("org.jetbrains.kotlin:kotlin-gradle-plugin:1.9.20")
    }
}

allprojects {
    repositories {
        google()
        mavenCentral()
        maven { url = uri("https://jitpack.io") }
    }
}

task<Delete>("clean") {
    delete(rootProject.buildDir)
}
`

// 创建目录结构
const dirs = [
    `${androidDir}/app/src/main/java/org/tabby/terminal`,
    `${androidDir}/app/src/main/res/layout`,
    `${androidDir}/app/src/main/res/values`,
    `${androidDir}/app/src/main/res/mipmap-hdpi`,
    `${androidDir}/app/src/main/res/mipmap-xhdpi`,
    `${androidDir}/app/src/main/res/mipmap-xxhdpi`,
    `${androidDir}/app/src/main/res/mipmap-xxxhdpi`,
]

dirs.forEach(dir => shelljs.mkdir('-p', dir))

// 写入文件
fs.writeFileSync(`${androidDir}/app/build.gradle.kts`, gradleConfig)
fs.writeFileSync(`${androidDir}/app/src/main/java/org/tabby/terminal/MainActivity.kt`, mainActivity)
fs.writeFileSync(`${androidDir}/app/src/main/AndroidManifest.xml`, androidManifest)
fs.writeFileSync(`${androidDir}/build.gradle.kts`, projectGradle)

// 创建gradle.properties
const gradleProperties = `
org.gradle.jvmargs=-Xmx2048m -Dfile.encoding=UTF-8
android.useAndroidX=true
android.enableJetifier=true
`
fs.writeFileSync(`${androidDir}/gradle.properties`, gradleProperties)

// 创建settings.gradle.kts
const settingsGradle = `
rootProject.name = "TabbyTerminal"
include(":app")
`
fs.writeFileSync(`${androidDir}/settings.gradle.kts`, settingsGradle)

// 创建local.properties（CI环境会自动设置）
const localProperties = `
# This file is automatically generated by Android Studio.
# Do not modify this file -- YOUR CHANGES WILL BE ERASED!
sdk.dir=${process.env.ANDROID_HOME || '/usr/local/lib/android/sdk'}
`
fs.writeFileSync(`${androidDir}/local.properties`, localProperties)

// 下载gradle wrapper
console.log('📥 下载Gradle Wrapper...')
shelljs.mkdir('-p', `${androidDir}/gradle/wrapper`)

const gradleWrapperProperties = `
distributionBase=GRADLE_USER_HOME
distributionPath=wrapper/dists
distributionUrl=https\\://services.gradle.org/distributions/gradle-8.5-bin.zip
networkTimeout=10000
validateDistributionUrl=true
zipStoreBase=GRADLE_USER_HOME
zipStorePath=wrapper/dists
`
fs.writeFileSync(`${androidDir}/gradle/wrapper/gradle-wrapper.properties`, gradleWrapperProperties)

// 创建标准的gradlew脚本
const gradlewScript = `#!/bin/bash
##############################################################################
##
##  Gradle start up script for UN*X
##
##############################################################################

# Attempt to set APP_HOME
# Resolve links: $0 may be a link
PRG="$0"
# Need this for relative symlinks.
while [ -h "$PRG" ] ; do
    ls=`ls -ld "$PRG"`
    link=`expr "$ls" : '.*-> \\(.*\\)$'`
    if expr "$link" : '/.*' > /dev/null; then
        PRG="$link"
    else
        PRG=`dirname "$PRG"`"/$link"
    fi
done
SAVED="`pwd`"
cd "`dirname \\"$PRG\\"`/" >/dev/null
APP_HOME="`pwd -P`"
cd "$SAVED" >/dev/null

APP_NAME="Gradle"
APP_BASE_NAME=`basename "$0"`

# Add default JVM options here. You can also use JAVA_OPTS and GRADLE_OPTS to pass JVM options to this script.
DEFAULT_JVM_OPTS='"-Xmx64m" "-Xms64m"'

# Use the maximum available, or set MAX_FD != -1 to use that value.
MAX_FD="maximum"

# OS specific support (must be 'true' or 'false').
cygwin=false
msys=false
darwin=false
nonstop=false
case "`uname`" in
  CYGWIN* )
    cygwin=true
    ;;
  Darwin* )
    darwin=true
    ;;
  MINGW* )
    msys=true
    ;;
  NONSTOP* )
    nonstop=true
    ;;
esac

CLASSPATH=$APP_HOME/gradle/wrapper/gradle-wrapper.jar

# Determine the Java command to use to start the JVM.
if [ -n "$JAVA_HOME" ] ; then
    if [ -x "$JAVA_HOME/jre/sh/java" ] ; then
        # IBM's JDK on AIX uses strange locations for the executables
        JAVACMD="$JAVA_HOME/jre/sh/java"
    else
        JAVACMD="$JAVA_HOME/bin/java"
    fi
    if [ ! -x "$JAVACMD" ] ; then
        die "ERROR: JAVA_HOME is set to an invalid directory: $JAVA_HOME"
    fi
else
    JAVACMD="java"
    which java >/dev/null 2>&1 || die "ERROR: JAVA_HOME is not set and no 'java' command could be found in your PATH."
fi

# Increase the maximum file descriptors if we can.
if [ "$cygwin" = "false" -a "$darwin" = "false" -a "$nonstop" = "false" ] ; then
    MAX_FD_LIMIT=`ulimit -H -n`
    if [ $? -eq 0 ] ; then
        if [ "$MAX_FD" = "maximum" -o "$MAX_FD" = "max" ] ; then
            MAX_FD="$MAX_FD_LIMIT"
        fi
        ulimit -n $MAX_FD
        if [ $? -ne 0 ] ; then
            warn "Could not set maximum file descriptor limit: $MAX_FD"
        fi
    else
        warn "Could not query maximum file descriptor limit: $MAX_FD_LIMIT"
    fi
fi

# For Darwin, add options to specify how the application appears in the dock
if $darwin; then
    GRADLE_OPTS="$GRADLE_OPTS \\"-Xdock:name=$APP_NAME\\" \\"-Xdock:icon=$APP_HOME/media/gradle.icns\\""
fi

# For Cygwin or MSYS, switch paths to Windows format before running java
if [ "$cygwin" = "true" -o "$msys" = "true" ] ; then
    APP_HOME=`cygpath --path --mixed "$APP_HOME"`
    CLASSPATH=`cygpath --path --mixed "$CLASSPATH"`
    JAVACMD=`cygpath --unix "$JAVACMD"`
fi

# Execute Gradle
exec "$JAVACMD" $DEFAULT_JVM_OPTS $JAVA_OPTS $GRADLE_OPTS "-Dorg.gradle.appname=$APP_BASE_NAME" -classpath "$CLASSPATH" org.gradle.wrapper.GradleWrapperMain "$@"
`
fs.writeFileSync(`${androidDir}/gradlew`, gradlewScript)
shelljs.chmod('+x', `${androidDir}/gradlew`)

// 创建README
const readme = `# Tabby Terminal for Android

这是 Tabby Terminal 的 Android 版本，专为 Android 平板优化。

## 功能特点

- 🖥️ 完整的终端模拟器
- 🔐 SSH/Telnet 连接支持
- 📁 文件管理器
- 🎨 主题自定义
- ⌨️ 虚拟键盘优化
- 📱 平板专属UI

## 构建步骤

1. 安装 Android Studio
2. 打开此项目
3. 连接 Android 设备或启动模拟器
4. 点击 Run 按钮

## 发布

\`\`\`bash
cd android-app
./gradlew assembleRelease
\`\`\`

生成的 APK 位于 \`app/build/outputs/apk/release/\`

## 系统要求

- Android 7.0 (API 24) 或更高版本
- ARM64 或 x86_64 架构
`

fs.writeFileSync(`${androidDir}/README.md`, readme)

console.log('✅ Android项目结构创建完成！')
console.log('📱 使用Android Studio打开 android-app 目录即可构建APK')
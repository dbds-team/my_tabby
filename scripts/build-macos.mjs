#!/usr/bin/env node
/* eslint-disable @typescript-eslint/prefer-nullish-coalescing */
import { build as builder } from 'electron-builder'
import * as vars from './vars.mjs'

const isTag = (process.env.GITHUB_REF || '').startsWith('refs/tags/')

process.env.ARCH = process.env.ARCH || process.arch

if (process.env.GITHUB_HEAD_REF) {
    delete process.env.CSC_LINK
    delete process.env.CSC_KEY_PASSWORD
    process.env.CSC_IDENTITY_AUTO_DISCOVERY = 'false'
}

process.env.APPLE_ID ??= process.env.APPSTORE_USERNAME
process.env.APPLE_APP_SPECIFIC_PASSWORD ??= process.env.APPSTORE_PASSWORD

// 首先尝试构建 DMG 和 ZIP
builder({
    dir: true,
    mac: ['dmg', 'zip'],
    x64: process.env.ARCH === 'x86_64',
    arm64: process.env.ARCH === 'arm64',
    config: {
        extraMetadata: {
            version: vars.version,
            teamId: process.env.APPLE_TEAM_ID,
        },
        mac: {
            identity: process.env.CSC_LINK ? undefined : null,
            notarize: !!(process.env.APPLE_TEAM_ID && process.env.CSC_LINK),
        },
        npmRebuild: process.env.ARCH !== 'arm64',
        publish: process.env.KEYGEN_TOKEN ? [
            vars.keygenConfig,
            {
                provider: 'github',
                channel: `latest-${process.env.ARCH}`,
            },
        ] : undefined,
    },
    publish: (process.env.KEYGEN_TOKEN && isTag) ? 'always' : 'never',
}).catch(async e => {
    console.warn('DMG 构建失败，尝试仅构建 ZIP 文件:', e.message)
    
    // 如果 DMG 构建失败，尝试只构建 ZIP
    try {
        await builder({
            dir: true,
            mac: ['zip'],
            x64: process.env.ARCH === 'x86_64',
            arm64: process.env.ARCH === 'arm64',
            config: {
                extraMetadata: {
                    version: vars.version,
                    teamId: process.env.APPLE_TEAM_ID,
                },
                mac: {
                    identity: process.env.CSC_LINK ? undefined : null,
                    notarize: !!(process.env.APPLE_TEAM_ID && process.env.CSC_LINK),
                },
                npmRebuild: process.env.ARCH !== 'arm64',
                publish: process.env.KEYGEN_TOKEN ? [
                    vars.keygenConfig,
                    {
                        provider: 'github',
                        channel: `latest-${process.env.ARCH}`,
                    },
                ] : undefined,
            },
            publish: (process.env.KEYGEN_TOKEN && isTag) ? 'always' : 'never',
        })
        console.log('✅ ZIP 构建成功')
    } catch (zipError) {
        console.error('❌ ZIP 构建也失败了:', zipError)
        process.exit(1)
    }
})

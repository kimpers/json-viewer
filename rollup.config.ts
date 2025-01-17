/// <reference types="node" />
import { basename, resolve } from 'node:path'

import commonjs from '@rollup/plugin-commonjs'
import { nodeResolve } from '@rollup/plugin-node-resolve'
import replace from '@rollup/plugin-replace'
import type { ModuleFormat, OutputOptions, RollupCache, RollupOptions } from 'rollup'
import dts from 'rollup-plugin-dts'
import { defineRollupSwcOption, swc } from 'rollup-plugin-swc3'
import { fileURLToPath } from 'url'

let cache: RollupCache

const dtsOutput = new Set<[string, string]>()

const outputDir = fileURLToPath(new URL('dist', import.meta.url))

const external = [
  'styled-components',
  '@mui/styled-engine-sc',
  '@mui/icons-material',
  '@mui/material',
  '@mui/material/styles',
  'copy-to-clipboard',
  'zustand',
  'zustand/context',
  'zustand/middleware',
  'group-items',
  'react',
  'react/jsx-runtime',
  'react-dom',
  'react-dom/client'
]
const outputMatrix = (name: string, format: ModuleFormat[]): OutputOptions[] => {
  const baseName = basename(name)
  return format.flatMap((format) => ({
    file: resolve(outputDir, `${baseName}.${format === 'es' ? 'm' : ''}js`),
    sourcemap: false,
    name: 'JsonViewer',
    format,
    banner: `/// <reference types="./${baseName}.d.ts" />`,
    globals: external.reduce((object, module) => {
      object[module] = module
      return object
    }, {} as Record<string, string>)
  }))
}

const buildMatrix = (
  input: string,
  output: string,
  config: {
    format: ModuleFormat[]
    browser: boolean
    dts: boolean
  }
): RollupOptions => {
  if (config.dts) {
    dtsOutput.add([input, output])
  }
  return {
    input,
    output: outputMatrix(output, config.format),
    cache,
    external: config.browser ? [] : external,
    plugins: [
      config.browser &&
        replace({
          preventAssignment: true,
          'process.env.NODE_ENV': JSON.stringify('production'),
          'typeof window': JSON.stringify('object')
        }),
      commonjs(),
      nodeResolve(),
      swc(
        defineRollupSwcOption({
          jsc: {
            externalHelpers: true,
            parser: {
              syntax: 'typescript',
              tsx: true
            },
            transform: {
              react: {
                runtime: 'automatic'
              }
            }
          }
        })
      )
    ]
  }
}

const dtsMatrix = (): RollupOptions[] => {
  return [...dtsOutput.values()].flatMap(([input, output]) => ({
    input,
    cache,
    output: {
      file: resolve(outputDir, `${output}.d.ts`),
      format: 'es'
    },
    plugins: [dts()]
  }))
}

const build: RollupOptions[] = [
  buildMatrix('./src/index.tsx', 'index', {
    format: ['es', 'umd'],
    browser: false,
    dts: true
  }),
  buildMatrix('./src/browser.tsx', 'browser', {
    format: ['es', 'umd'],
    browser: true,
    dts: true
  }),
  ...dtsMatrix()
]

export default build

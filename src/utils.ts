import { readFileSync, existsSync, writeFileSync } from 'node:fs';
import { basename, dirname, isAbsolute, resolve, resolve as resolvePath } from 'node:path';

import colors from 'picocolors';
import { normalizePath } from 'vite';

import { cwd } from './helper';
import type { PluginJSON, RequiredOptions } from './options';

const requiredKeys = [
  'name',
  'pluginName',
  'description',
  'author',
  // 'homepage',
  'version',
  'logo',
  'features',
] as const;

const DOC_URL = 'https://www.u.tools/docs/developer/config.html#基本配置';

let pluginContext: Required<PluginJSON>

const validatePluginJson = (options: PluginJSON) => {

  if (!pluginContext.preload) console.warn("no preload file required")

  const pkg = JSON.parse(readFileSync(resolvePath(cwd, 'package.json'), 'utf8'))

  requiredKeys.forEach((key) => {
    if (!options[key]) {
      options[key] = pkg[key]
      if ('pluginName' === key) options[key] = options['name'].replace(/@\//, '_')
    }
    if (!options[key]) throw new Error(colors.red(`plugin ${key} is required,see: ${colors.bold(DOC_URL)}`));
  });
};


/**
*@description 获取 plugin json 文件
*/
export const getPluginJSON = (path?: string, reload?: boolean) => {
  // @ts-ignore
  if (reload) pluginContext = null
  if (pluginContext) return pluginContext;
  if (!path) throw new Error(`You should specify plugin.json file by configFile!`);

  const jsonFilePath = isAbsolute(path) ? path : resolvePath(cwd, path);
  try {
    pluginContext = JSON.parse(readFileSync(jsonFilePath, 'utf8'));
  } catch {
    throw new Error(`[@ver5/utools]: plugin.json JSON.parse error!`);
  }
  validatePluginJson(pluginContext);

  const jsonFileDir = dirname(jsonFilePath)
  const preloadEntryFile = resolvePath(jsonFileDir, normalizePath(pluginContext.preload));
  const logoFile = resolvePath(jsonFileDir, normalizePath(pluginContext.logo));
  if (!existsSync(preloadEntryFile)) throw new Error(`[@ver5/utools]: ${preloadEntryFile} dont exists, Please check if it exists!`);
  if (!existsSync(logoFile)) throw new Error(`[@ver5/utools]: ${logoFile} dont exists, Please check if it exists!`);

  pluginContext.preload = preloadEntryFile
  pluginContext.logo = logoFile
  return pluginContext;
};


/**
 * @description fs异步生产新的文件，与 preload 在同级目录
 */
export function buildFile(content: string, filename: string, options: RequiredOptions) {
  if (existsSync(resolvePath(cwd, 'tsconfig.json')) || options.autoType === true) {
    colors.green(`generate ${filename} for utools mode`)
    writeFileSync(resolve(dirname(getPluginJSON().preload), filename), content)
  }
}


/**
 * @description 生成 tsd 类型声明文件
 * @param {string} name window上的挂载名
 * @param {string[]} exportKeys 导出的变量名数组
 */
export function generateTypes(name: string, exportKeys: string[]) {
  let typesContent = `// generated by @ver5/vite-plugin-utools\n// DO NOT CHANGE THIS FILE!\n`
    + `/// <reference types="@ver5/vite-plugin-utools/utools" />\n\n`
  // console.log("generateTypes", name, exportKeys)

  const preloadFileNoExt = basename(getPluginJSON().preload.replace(/\.(t|j)s/, ''));

  typesContent += `interface Window {\n`
  if (name) {
    typesContent += `  ${name}: {\n`
      + exportKeys.map((key) => `    ${key}: typeof import('./${preloadFileNoExt}')['${key}']`).join("\n")
      + '\n  }\n'
    //     typesContent += `interface Window {
    //       preload: {
    //         post: typeof import('./preload/index')['post']
    //   initServer: typeof import('./preload/index')['initServer']
    //   API_MODEL_OPT: typeof import('./preload/index')['API_MODEL_OPT']
    //   retrieve: typeof import('./preload/index')['retrieve']
    //   DEFAULT_CONFIG: typeof import('./preload/index')['DEFAULT_CONFIG']
    //   update: typeof import('./preload/index')['update']
    // }
    //   }`
  }
  typesContent += `}`

  return typesContent
}

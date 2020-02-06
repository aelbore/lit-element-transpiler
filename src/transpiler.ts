import * as ts from 'typescript'
import * as fs from 'fs'
import * as path from 'path'

import { inlineImportStyles } from './inline-import-styles'
import { cssImportDeclation } from './css-import-declaration'
import { inlinePropertyDecorators } from './create-static-get-properties'
import { customElements } from './create-custom-elements-define'

export interface TSConfigOptions {
  compilerOptions?: ts.CompilerOptions
  transformers?: ts.CustomTransformers
}

/**
 * This will transpiler the code a
 * and inline the decorators and styles css/scss
 * @param filePath file path of the typescript or javascript file
 * @param code extract code of the file
 */
export function transpiler(filePath: string, code: string) {
  const transformers = {
    before: [
      customElements(),
      inlineImportStyles(filePath),
      cssImportDeclation(),
      inlinePropertyDecorators()
    ]
  }
  return transpile(code, { transformers })
}

/**
 * Synchronous transpile of the give string code
 * @param code extract code form the file
 * @param tsOptions typescript options
 */
export function transpile(code: string, tsOptions?: TSConfigOptions) {
  const { outputText, sourceMapText } = ts.transpileModule(code, {
    compilerOptions: { 
      module: ts.ModuleKind.ES2015, 
      target: ts.ScriptTarget.ES2018,
      skipLibCheck: true,
      skipDefaultLibCheck: true,
      strictNullChecks: false,
      sourceMap: true,
      ...(tsOptions?.compilerOptions || {})
    },
    transformers: {
      ...(tsOptions?.transformers || {})
    }
  }); 
  return { code: outputText, map: sourceMapText }
}

/**
 * Asyncchronous transpile of the give file path
 * @param filePath extract code form the file
 * @param tsOptions typescript options
 */
export async function transpileFile(filePath: string, tsOptions?: TSConfigOptions) { 
  const code = await fs.promises.readFile(path.resolve(filePath), 'utf-8')
  return transpile(code, tsOptions)
}
import * as ts from 'typescript'

import { inlinePropertyDecorators } from './create-static-get-properties'
import { customElements } from './create-custom-elements-define'
import { getImportStyles, transformStyles } from './transpiler-css'
import { StylePreprocessor, PostCssPreprocessor } from './css-preprocessors'
import { MagicString } from './libs'

/**
 * tsconfig and transformer options
 */
export interface TSConfigOptions {
  compilerOptions?: ts.CompilerOptions
  transformers?: ts.CustomTransformers
}

/**
 * Synchronous transpile of the give string code
 * @param code extract code form the file
 * @param tsOptions typescript options
 */
export function transpile(code: string, tsOptions?: TSConfigOptions) {
  const { outputText, sourceMapText } = ts.transpileModule(code, {
    compilerOptions: { 
      module: ts.ModuleKind.ESNext, 
      target: ts.ScriptTarget.ESNext,
      skipLibCheck: true,
      skipDefaultLibCheck: true,
      strictNullChecks: false,
      sourceMap: true,
      ...(tsOptions?.compilerOptions || {})
    },
    transformers: {
      ...(tsOptions?.transformers || {})
    }
  })
  return { code: outputText, map: sourceMapText }
}

/**
 * This will asynchronous transfile the file
 * @param file file path of the typescript or javascript file
 * @param content extract code of the file
 * @param opts transform options includes typescript compilerOptions and cssOptions
 */
export async function transform(file: string, 
  content: string, 
  opts?: {
    compilerOptions?: ts.CompilerOptions,
    cssOptions?: StylePreprocessor | PostCssPreprocessor
}) {
  const magicString = new MagicString(content)
  const styles = await getImportStyles(file, content, opts?.cssOptions)

  const { code, map } = transpile(magicString.toString(), {  
    compilerOptions: {
      ...(opts?.compilerOptions || {})
    },
    transformers: {
      before: [ 
        customElements(), 
        inlinePropertyDecorators(),
        transformStyles({ styles })
      ]
    }
  })

  return { code, map }
}
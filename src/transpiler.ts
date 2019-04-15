import * as ts from 'typescript'

import { inlineStyles } from './inline-css-transformer'
import { cssImportDeclation } from './css-import-declaration'
import { customElementDefine } from './element-define'

export function transpiler(filePath: string, code: string) {
  const { outputText, sourceMapText } = ts.transpileModule(code, {
    compilerOptions: { 
      module: ts.ModuleKind.ES2015, 
      target: ts.ScriptTarget.ES2018,
      skipLibCheck: true,
      skipDefaultLibCheck: true,
      strictNullChecks: false,
      sourceMap: true
    },
    transformers: { 
      before: [
        customElementDefine(),
        inlineStyles(filePath),
        cssImportDeclation()
      ]
    }
  }); 
  return { code: outputText, map: sourceMapText }
}
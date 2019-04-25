import * as ts from 'typescript'

import { inlineImportStyles } from './inline-import-styles'
import { cssImportDeclation } from './css-import-declaration'
import { inlinePropertyDecorators } from './create-static-get-properties'
import { customElements } from './create-custom-elements-define'

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
        customElements(),
        inlineImportStyles(filePath),
        cssImportDeclation(),
        inlinePropertyDecorators()
      ]
    }
  }); 
  return { code: outputText, map: sourceMapText }
}

export function transpile(filePath, code, transformers) {

  const { outputText, sourceMapText } = ts.transpileModule(code, {
    compilerOptions: { 
      module: ts.ModuleKind.ES2015, 
      target: ts.ScriptTarget.ES2018,
      skipLibCheck: true,
      skipDefaultLibCheck: true,
      strictNullChecks: false,
      sourceMap: true
    },
    ...transformers
  }); 
  return { code: outputText, map: sourceMapText }
}
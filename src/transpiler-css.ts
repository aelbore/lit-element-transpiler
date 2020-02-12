import * as ts from 'typescript'
import { getText } from './utils'

function findAllImportStyles(statements) {
  return statements.filter(statement => {
    return ts.isImportDeclaration(statement)
      && (!statement.hasOwnProperty('importClause'))
      && (getText(statement.moduleSpecifier as ts.Identifier) .includes('.css')
            || getText(statement.moduleSpecifier as ts.Identifier).includes('.scss'))
  })
}

async function removeAllImportStyles(importStyles, statements) {
  const importStyleNames = await Promise.all(importStyles.map(style => { 
    return getText(style.moduleSpecifier as ts.Identifier) 
  }))
  return statements.filter(statement => {
    return !(ts.isImportDeclaration(statement)
      && !statement.hasOwnProperty('importClause')
      && importStyleNames.includes(getText(statement.moduleSpecifier as ts.Identifier))
    )
  })
}

async function createReturnStatement(cssStyles: string[]) {
  async function createArrayLiteralStyles(cssStyles: string[]) {
    const elements = await Promise.all(cssStyles.map(cssStyle => {
      return createCSSTagTemplate(cssStyle)
    }))
    return ts.createArrayLiteral(elements)
  }
  
  function createCSSTagTemplate(template) {
    return ts.createTaggedTemplate(
      ts.createIdentifier('css'), 
      ts.createNoSubstitutionTemplateLiteral(template)
    )
  }

  return cssStyles.length > 1
    ? ts.createReturn(await createArrayLiteralStyles(cssStyles))
    : ts.createReturn(createCSSTagTemplate(cssStyles[0]))
}

async function createStaticGetStyle(cssStyles: string[]) {
  const styles = await createReturnStatement(cssStyles)
  return ts.createGetAccessor(undefined, 
    [ ts.createModifier(ts.SyntaxKind.StaticKeyword) ], 
    ts.createIdentifier('styles'), 
    [], 
    undefined, 
    ts.createBlock([ styles ])
  )
}

export async function inlineCss(code: string, file: string) {
  const compilerOptions: ts.CompilerOptions = { 
    module: ts.ModuleKind.ESNext, 
    target: ts.ScriptTarget.ESNext,
    skipLibCheck: true,
    skipDefaultLibCheck: true,
    strictNullChecks: false,
    sourceMap: true,
    allowJs: true
  }

  const sourceFile = ts.createSourceFile(file, code, ts.ScriptTarget.ESNext)

  //const program = ts.createProgram([ file ], compilerOptions)
  // const sourceFile = program.getSourceFile(file)
  
  const importStyles = findAllImportStyles(sourceFile.statements)
  console.log(importStyles)
  if (importStyles && importStyles.length > 0) { 
    const statements = await removeAllImportStyles(importStyles, sourceFile.statements)  
    sourceFile.statements = ts.createNodeArray([ ...statements ])
  }
  
  

  return sourceFile
  
  // return new Promise((resolve) => {
  //   program.emit(
  //     sourceFile,
  //     (fileName, content) => {
  //       resolve({ fileName, content })
  //     },
  //     undefined,
  //     undefined,
  //     undefined
  //   )
  // })
}
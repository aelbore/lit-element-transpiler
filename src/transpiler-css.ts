import * as ts from 'typescript'
import * as fs from 'fs'
import * as path from 'path'

import MagicString from 'magic-string'
import { getText, getImportClauseElement, updateImportClauseNameImports } from './utils'
import { CompileStyleOptions, StylePreprocessor, css } from './css-preprocessors'

function findAllImportDeclarations(statements: ts.NodeArray<ts.Statement>) {
  return statements.filter(statement => ts.isImportDeclaration(statement))
}

function findAllImportStyles(statements: ts.Statement[]) {
  return statements.filter((statement: ts.ImportDeclaration) => {
    const text = getText(statement.moduleSpecifier as ts.Identifier)
    return (!statement.importClause)
      && (text.includes('.css') || text.includes('.scss'))
  })
}

function getStyles(tsFile: string, 
  importStyles: ts.Statement[], 
  opts?: StylePreprocessor
) {
  const { resolve, dirname, extname } = path
  return Promise.all(importStyles.map(async (statement: ts.ImportDeclaration) => {
    const text = getText(statement.moduleSpecifier as ts.Identifier)
    const cssFullPath = resolve(dirname(tsFile), text.replace(/'/g, '').replace(/"/g, ''))
    const content = await fs.promises.readFile(cssFullPath, 'utf-8')
    if (extname(cssFullPath).includes('.scss')) {
      const preprocessor = await css(opts).process(content, cssFullPath)
      return preprocessor.css
    }
    return content
  }))
} 

function updateImportCssSpecifer(statements: ts.Statement[]) {
  for (const statement of statements) {
    if (ts.isImportDeclaration(statement) 
      && statement.hasOwnProperty('importClause') 
      && getText(statement.moduleSpecifier as ts.Identifier)
          .includes('lit-element')
    ) {
      const element = getImportClauseElement({ statement, text: 'css' })
      if (!element) {
        statement.importClause = updateImportClauseNameImports(
          statement.importClause, 'css'
        )         
        break
      }
    }
  }
}

async function removeAllImportStyles(importStyles: ts.Statement[], 
  statements: ts.NodeArray<ts.Statement>
) {
  const importStyleNames = await Promise.all(importStyles.map((style: ts.ImportDeclaration) => { 
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

  async function createReturn(styles: string[]) {
    const css = await createArrayLiteralStyles(cssStyles)
    return ts.createReturn(css)
  }
  
  function createCSSTagTemplate(template: string) {
    return ts.createTaggedTemplate(
      ts.createIdentifier('css'), 
      ts.createNoSubstitutionTemplateLiteral(template)
    )
  }

  return cssStyles.length > 1
    ? await createReturn(cssStyles)
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

async function addOrUpdateStaticGetStyle(cssStyles: string[], statements: ts.Statement[]) {
  return Promise.all(statements.map(async statement => {
    if (ts.isClassDeclaration(statement)) {   
      const node = await createStaticGetStyle(cssStyles)
      const members = statement.members.filter(member => {
        return !(ts.isGetAccessor(member) 
            && member.name.hasOwnProperty('text')
            && member.name.getText().includes(node.name.getText()))
      })
      members.unshift(node)
      statement.members = ts.createNodeArray(members)
    }
    return statement
  }))
}  

export async function inlineCss(options: CompileStyleOptions) {
  const { file, content, opts } = options
  const outFile = file.replace('.ts', '.js')

  const magicString = new MagicString(content)
  const map = magicString.generateMap({ 
    hires: false,
    includeContent: true,
    source: file,
    file: `${outFile}.map`
  })

  const sourceFile = ts.createSourceFile(file, content, ts.ScriptTarget.ES2015, false)

  const importStatements = findAllImportDeclarations(sourceFile.statements)
  if (importStatements.length > 0) {
    const importStyles = findAllImportStyles(importStatements)
    if (importStyles.length > 0) { 
      const [ statements, cssStyles ] = await Promise.all([
        removeAllImportStyles(importStyles, sourceFile.statements),
        getStyles(file, importStyles, opts)
      ])
      updateImportCssSpecifer(statements)
      const modifiedStatements = await addOrUpdateStaticGetStyle(cssStyles, statements) 
      sourceFile.statements = ts.createNodeArray(modifiedStatements)
    }
  }

  const printer = ts.createPrinter({
    newLine: ts.NewLineKind.LineFeed,
  });

  const code = printer.printFile(sourceFile)

  return { code, map }
}
import * as ts from 'typescript'
import * as fs from 'fs'
import * as path from 'path'

import { getText, getImportClauseElement, updateImportClauseNameImports } from './utils'
import { StylePreprocessor, css } from './css-preprocessors'

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

function removeAllImportStylesSync(importStyles: ts.Statement[], 
  statements: ts.NodeArray<ts.Statement>
) {
  const importStyleNames = importStyles.map((style: ts.ImportDeclaration) => { 
    return getText(style.moduleSpecifier as ts.Identifier) 
  })
  return statements.filter(statement => {
    return !(ts.isImportDeclaration(statement)
      && !statement.hasOwnProperty('importClause')
      && importStyleNames.includes(getText(statement.moduleSpecifier as ts.Identifier))
    )
  })
}

function createReturnStatementSync(cssStyles: string[]) {
  function createArrayLiteralStyles(cssStyles: string[]) {
    const elements = cssStyles.map(cssStyle => createCSSTagTemplate(cssStyle))
    return ts.createArrayLiteral(elements)
  }

  function createReturn(styles: string[]) {
    const css = createArrayLiteralStyles(styles)
    return ts.createReturn(css)
  }
  
  function createCSSTagTemplate(template: string) {
    return ts.createTaggedTemplate(
      ts.createIdentifier('css'), 
      ts.createNoSubstitutionTemplateLiteral(template)
    )
  }

  return cssStyles.length > 1
    ? createReturn(cssStyles)
    : ts.createReturn(createCSSTagTemplate(cssStyles[0]))
}

function createStaticGetStyleSync(cssStyles: string[]) {
  const styles = createReturnStatementSync(cssStyles)
  return ts.createGetAccessor(undefined, 
    [ ts.createModifier(ts.SyntaxKind.StaticKeyword) ], 
    ts.createIdentifier('styles'), 
    [], 
    undefined, 
    ts.createBlock([ styles ])
  )
}

function addOrUpdateStaticGetStyleSync(cssStyles: string[], 
  statements: ts.Statement[]
) {
  for (const statement of statements) {
    if (ts.isClassDeclaration(statement)) {   
      const node = createStaticGetStyleSync(cssStyles)
      const members = statement.members.filter(member => {
        return !(ts.isGetAccessor(member) 
            && member.name.hasOwnProperty('text')
            && member.name.getText().includes(node.name.getText()))
      })
      members.unshift(node)
      statement.members = ts.createNodeArray(members)
      break
    }
  }
}  

async function getStyles(tsFile: string, 
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

export async function getImportStyles(file: string, 
  content: string, 
  opts?: StylePreprocessor
) {
  let styles: string[] = []
  const sourceFile = ts.createSourceFile(file, content, ts.ScriptTarget.ESNext, false)
  const importStatements = findAllImportDeclarations(sourceFile.statements)
  if (importStatements.length > 0) {
    const importStyles = findAllImportStyles(importStatements)
    if (importStyles.length > 0) {
      styles = await getStyles(file, importStyles, opts)
    }
  }
  return styles
}

export function transformStyles({ styles }) {
  return (context: ts.TransformationContext) => {
    const visitor = (node: any) => {
      if (styles.length > 0 && Array.isArray(node.statements)) {
        const importStatements = findAllImportDeclarations(node.statements)
        const importStyles = findAllImportStyles(importStatements)
        const statements = removeAllImportStylesSync(importStyles, node.statements)
        updateImportCssSpecifer(statements)
        addOrUpdateStaticGetStyleSync(styles, statements) 
        node.statements = ts.createNodeArray(statements)
      } 
      return ts.visitEachChild(node, (child) => visitor(child), context)
    }
    return visitor
  }
}
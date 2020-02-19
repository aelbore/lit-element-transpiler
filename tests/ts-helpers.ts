import * as ts from 'typescript'
import * as fs from 'fs'

import { getText } from '../src/utils'

export interface GetAccessorFilter {
  modifierKind?: ts.SyntaxKind;
  name?: string;
}

export interface ClassDeclarationFilter {
  name?: string;
  extendsClass?: string;
}

export interface DecoratorFilter {
  decoratorNames?: string[]
}

export function getClassDeclarations(sourceFile: ts.SourceFile, filters?: ClassDeclarationFilter) {
  let classes = sourceFile.statements
    .filter(statement => ts.isClassDeclaration(statement))
    .map(statement => (statement as ts.ClassDeclaration))

  if (filters?.name) {
    classes = classes.filter(cls => {
      return getText(cls.name).includes(filters.name)
    })
  }

  if (filters?.extendsClass) {
    classes = classes.filter(cls => {
      return Array.isArray(cls.heritageClauses) 
        && cls.heritageClauses.find(heritageClause => {
            return Array.isArray(heritageClause.types)
              && heritageClause.types.find(type => {
                  return ts.isExpressionWithTypeArguments(type) 
                    && ts.isIdentifier(type.expression) 
                    && type.expression.getText().includes(filters.extendsClass)
                 })
          }) 
    })
  }

  return classes
}

export function getDecorators(classDeclarations: ts.ClassDeclaration[], filters?: DecoratorFilter) {
  let decorators: ts.Decorator[] = []

  classDeclarations
    .filter(cls => ts.isDecorator(cls))
    .forEach(cls => {
      decorators = decorators.concat(cls.decorators)
    })

  if (filters?.decoratorNames && filters.decoratorNames.length > 0) {
    decorators = decorators.filter(decorator => {
      let text: string
      if (ts.isCallExpression(decorator.expression)) {
        text = decorator.expression.expression.getText()
      }
      if (ts.isIdentifier(decorator.expression)) {
        text = decorator.expression.getText()
      }
      return filters.decoratorNames.includes(text)
    })
  }

  return decorators
}

export function getGetAccesors(classDeclarations: ts.ClassDeclaration[], filters?: GetAccessorFilter) {
  let getAccessors: ts.ClassElement[] = []

  classDeclarations.forEach(node => {
    if (Array.isArray(node.members) && node.members.length > 0) {
      const elements = node.members.filter(member => ts.isGetAccessor(member))
      getAccessors = getAccessors.concat(elements)
    }
  })

  if (filters?.modifierKind) {
    getAccessors = getAccessors.filter(member => {
      const modifier = member.modifiers.find(modifier => {
        return modifier.kind === filters.modifierKind
      }) 
      return (modifier !== undefined)
    })
  }

  if (filters?.name) {
    getAccessors = getAccessors.filter(member => {
      return getText(member.name as ts.Identifier).includes(filters.name)
    })
  }

  return getAccessors
}

export function getImportDeclarations(sourceFile: ts.SourceFile, filters?: {  moduleSpecifer?: string }) {
  let imports = sourceFile.statements
    .filter(statement => ts.isImportDeclaration(statement))
    .map(statement => (statement as ts.ImportDeclaration))

  if (filters?.moduleSpecifer) {
    imports = imports.filter(specifier => {
      const text = specifier.moduleSpecifier.hasOwnProperty('text')
        ? (specifier.moduleSpecifier as ts.Identifier).text
        : ''
      return text.includes(filters.moduleSpecifer) 
    })
  }

  return imports
}

export async function getImportClauseElements(importDeclation: ts.ImportDeclaration, bindingsKind: ts.SyntaxKind = ts.SyntaxKind.NamedImports) {
  let elements: ts.ImportSpecifier[] = []
  if (importDeclation.importClause) {
    switch (bindingsKind) {
      case ts.SyntaxKind.NamedImports:
        const namedImports = importDeclation.importClause.namedBindings as ts.NamedImports
        elements = await Promise.all(namedImports.elements.map(element => {
          return (element as ts.ImportSpecifier)
        }))
        break
    }
  }
  return elements
}

export async function getOutputSource(code: string) {
  const mockfs = await import('mock-fs')
  const fileName = './dist/output.js'

  mockfs.restore()
  mockfs({ 
    'dist': {} 
  })

  await fs.promises.writeFile(fileName, code)

  const program = ts.createProgram([ fileName ], {      
    module: ts.ModuleKind.ES2015, 
    target: ts.ScriptTarget.ES2018,
    skipLibCheck: true,
    skipDefaultLibCheck: true,
    strictNullChecks: false,
    sourceMap: false,
    allowJs: true
  })

  return program.getSourceFile(fileName)
}
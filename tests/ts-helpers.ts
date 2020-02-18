import * as ts from 'typescript'
import { transpile } from '../src/transpiler'

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

export function getNode(code: string) {
  let result: any
  function importDeclarations() {
    return (context: ts.TransformationContext) => {
      const visitor = (node: any) => {
        if (Array.isArray(node.statements)) {
          result = node
          return node
        }
        return ts.visitEachChild(node, (child) => visitor(child), context)
      }
      return visitor
    }
  }

  transpile(code, { 
    transformers: {
      before: [ importDeclarations() ]
    }
  })

  return result
}

export function getClassDeclarations(sourceFile: ts.SourceFile, filters?: ClassDeclarationFilter) {
  let classes = sourceFile.statements
    .filter(statement => ts.isClassDeclaration(statement))
    .map(statement => (statement as ts.ClassDeclaration))

  if (filters?.name) {
    classes = classes.filter(cls => {
      return (cls.name.hasOwnProperty('escapedText') 
        ? cls.name.escapedText.toString()
        : cls.name.hasOwnProperty('text')
           ? cls.name.text
           : ''
      ).includes(filters.name)
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
      return member.name.getText().includes(filters.name)
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

export async function getOutputSource(code: string) {
  const mockfs = await import('mock-fs')
  const fs = await import('fs')

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
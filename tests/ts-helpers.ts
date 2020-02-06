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

export function getClassDeclarations(code: string, filters?: ClassDeclarationFilter) {
  const results: ts.ClassDeclaration[] = []
  function classDeclarations() {
    return (context: ts.TransformationContext) => {
      const visitor = (node: ts.Node) => {
        if (ts.isClassDeclaration(node)) {
          results.push(node)
        }
        return ts.visitEachChild(node, (child) => visitor(child), context)
      }
      return visitor
    }
  }

  transpile(code, {
    transformers: {
      before: [ classDeclarations() ]
    }
  })

  let classes: ts.ClassDeclaration[] = [ ...results ]

  if (filters?.name) {
    classes = classes.filter(cls => cls.name.getText().includes(filters.name))
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

export function getImportDeclarations(code: string, filters?: {
  moduleSpecifer?: string
}) {
  const results = []
  function importDeclarations() {
    return (context: ts.TransformationContext) => {
      const visitor = (node: ts.Node) => {
        if (ts.isImportDeclaration(node)) {
          results.push(node)
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

  let imports = [ ...results ].map(result => (result as ts.ImportDeclaration))
  if (filters?.moduleSpecifer) {
    imports = imports.filter(specifier => specifier.getText().includes(filters.moduleSpecifer))
  }

  return imports
}
import * as ts from 'typescript'

function transpile(code: string, { transformers }) {
  return ts.transpileModule(code, {
    compilerOptions: { 
      module: ts.ModuleKind.ES2015, 
      target: ts.ScriptTarget.ES2018,
      skipLibCheck: true,
      skipDefaultLibCheck: true,
      strictNullChecks: false,
      sourceMap: false
    },
    transformers
  }); 
}

export function getAccessors(code: string, filters?: {
  kind?: ts.SyntaxKind,
  name?: string
}) {
  const results = []
  function getAllAccessors() {
    return (context: ts.TransformationContext) => {
      const visitor = (node: ts.Node) => {
        if (ts.isClassDeclaration(node) 
          && Array.isArray(node.members) 
          && node.members.length > 0) {
            let getAccessors = node.members.filter(member => ts.isGetAccessor(member))
            if (filters?.kind) {
              getAccessors = getAccessors.filter(member => {
                const modifier = member.modifiers.find(modifier => {
                  return modifier.kind === filters.kind
                }) 
                return (modifier !== undefined)
              })
            }
            if (filters?.name) {
              getAccessors = getAccessors.filter(member => {
                return member.name.getText().includes(filters.name)
              })
            }
            getAccessors.forEach(get => {
              results.push(get)
            })
        }
        return ts.visitEachChild(node, (child) => visitor(child), context)
      }
      return visitor
    }
  }

 transpile(code, { 
    transformers: {
      before: [ getAllAccessors() ]
    }
  })

  return results.map(result => (result as ts.ClassElement))
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
import * as ts from 'typescript'

export interface ImportClauseElementOptions {
  statement: ts.ImportDeclaration
  text?: string
  bindingsKind?: ts.SyntaxKind
}

export function getText(identifier: ts.Identifier) {
  return identifier.hasOwnProperty('escapedText')
    ? identifier.escapedText.toString()
    : identifier.text
}

export function updateImportClauseNameImports(node: ts.ImportClause, 
  names: string | string[]
) {
  const identifiers = Array.isArray(names) ? names: [ names ]
  const specifiers = identifiers.map(name => {
    return ts.createImportSpecifier(void 0, ts.createIdentifier(name))
  })
  return ts.updateImportClause(node, void 0, 
    ts.createNamedImports([ 
      ...(node.namedBindings as ts.NamedImports).elements, 
      ...specifiers 
    ])
  )
}

export function getImportClauseElement(options: ImportClauseElementOptions) {
  const { statement, bindingsKind, text } = options
  const elements = getImportClauseElements({ statement, bindingsKind })
  return elements.find(element => getText(element.name).includes(text))
}

export function getImportClauseElements(options: ImportClauseElementOptions) {  
  const { bindingsKind, statement } = options
  options.bindingsKind ? bindingsKind: ts.SyntaxKind.NamedImports

  if (statement.importClause) {
    const namedImports = statement.importClause.namedBindings as ts.NamedImports
    return namedImports.elements
  }

  const elements: ts.NodeArray<ts.ImportSpecifier> = ts.createNodeArray([])
  return elements
}
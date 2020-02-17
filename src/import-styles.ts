import * as ts from 'typescript'

export function findAllImportStyles(statements
  : (ts.ImportDeclaration | ts.ClassDeclaration)[]) {
  return statements.filter(statement => {
    return ts.isImportDeclaration(statement)
      && (statement.moduleSpecifier.getText().includes('.css')
            || statement.moduleSpecifier.getText().includes('.scss'))
  })
}

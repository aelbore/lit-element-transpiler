import * as ts from 'typescript'

function findCustomElementDecorator(statements) {
  return statements.find(statement => {
    return ts.isClassDeclaration(statement)
      && statement.decorators 
      && statement.decorators.length > 0
      /// TODO: check the exact decorator => use Array.find
      /// @ts-ignore
      && statement.decorators[0].expression.expression.getText().includes('customElement')
  })
}

function removeCustomElementDecorator(statements) {
  return statements.map(statement => {
    if (ts.isClassDeclaration(statement)) {
      /// remove @customElement decorator
      /// TODO: set the decorators to undefined
      /// @ts-ignore
      // statement.decorators = statement.decorators.filter(decorator => {
      //   /// @ts-ignore
      //   return !(decorator.expression.expression.getText().includes('customElement'))
      // })
      statement.decorators = undefined
    }
    return statement
  })
}

function createCustomElements(tagName: string, className: string) {
  const propertyAccess = ts.createPropertyAccess(
    ts.createIdentifier('customElements'), 
    ts.createIdentifier('define')
  )
  const expressionCall = ts.createCall(propertyAccess, undefined, [
    ts.createStringLiteral(tagName.replace(/'/gm, '')),
    ts.createIdentifier(className)
  ])
  return ts.createExpressionStatement(expressionCall)
}

export function customElements() {
  return (context: ts.TransformationContext) => {
    const visitor = (node) => {
      if (Array.isArray(node.statements)) {
        const customElement = findCustomElementDecorator(node.statements)
        if (customElement) {          
          /// assume that only 1 decorator and 1 argument
          /// @customElement('<argument>')
          /// tagName => argument
          const tagName = customElement.decorators[0].expression.arguments[0].getText()

          const statements = removeCustomElementDecorator(node.statements)
          //// assume customElements.define
          ///  is not exist
          statements.push(createCustomElements(tagName, customElement.name.text))

          node.statements = statements
        }
      }
      return ts.visitEachChild(node, (child) => visitor(child), context)
    }
    return visitor;
  }
}
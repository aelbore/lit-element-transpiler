import * as ts from 'typescript'
import { getText } from './utils'

function createPropertyAssignment(propertyMembers) {
  return propertyMembers.filter(property => {
    /// assume that property has only 1 decorator
    /// which is @property decorator
    return property.decorators[0].expression.expression.getText().includes('property')
  }).map(property => {
    const args = property.decorators[0].expression.arguments
    if (args.length === 0) {
      /// for now if the @property has no arguments
      /// default to { type: String }
      /// TODO: check the value then set the type 
      args.push(ts.createObjectLiteral(
        [ ts.createPropertyAssignment(ts.createIdentifier('type'), ts.createIdentifier('String'))  ]
      ))
    }
    return {
      name: property.name.getText(),
      properties: args[0]
    }
  }).map(property => {
    return ts.createPropertyAssignment(ts.createIdentifier(property.name), property.properties)
  })
}

function updateStaticGetProperties(node, propertyMembers) {
  const statements = node.body.statements.map(statement => {
    statement.expression.properties = [ 
      ...createPropertyAssignment(propertyMembers),
      ...statement.expression.properties
    ]
    return statement
  })

  return ts.updateGetAccessor(
    node, 
    undefined, 
    node.modifiers, 
    node.name,
    [], 
    undefined,
    ts.updateBlock(node.body, [ ...statements ]))
}

function createStaticGetProperties(propertyMembers) {
  const properties = createPropertyAssignment(propertyMembers)
  return ts.createGetAccessor(
    undefined, 
    [ ts.createModifier(ts.SyntaxKind.StaticKeyword) ], 
    ts.createIdentifier('properties'), 
    [], 
    undefined,
    ts.createBlock([ ts.createReturn(ts.createObjectLiteral(properties)) ]))
}

function getStaticProperties(members) {
  return members.find(member => {
    return ts.isGetAccessor(member) 
      && member.name['text'].includes('properties')
  })
}

function updateCreateProperties(members, node) {
  /// get the property decorators
  const propertyMembers = members.filter(member => {
    return ts.isPropertyDeclaration(member)
      && member.decorators 
      && member.decorators.length > 0
  })

  /// if there is no @property decorator
  /// don't create or update static get properties
  if (propertyMembers && propertyMembers.length > 0) {
    if (!node) {
      /// create static get properties
      return createStaticGetProperties(propertyMembers)
    } else {
      //// update static get properties
      return updateStaticGetProperties(node, propertyMembers)
    }
  }

  return null
}

function updateNodeMembers(members) {
  /// get the static get properties if exist
  const nodeProperties = getStaticProperties(members)  

  /// update or create the static get properties
  /// from @property decorators
  const properties = updateCreateProperties(members, nodeProperties)

  if (properties) {
    const propertyDeclarations = members
      .filter(member => ts.isPropertyDeclaration(member))
      .map(property => property.name.getText())

    //// remove property decorators
    members = members.filter(member => {
      return member.name && !propertyDeclarations.includes(member.name.text)
    })

    ///TODO: remove imports @property and customElement decorators

    /// remove static get properties
    if (nodeProperties) {
      members = members.filter(member => {
        const text = member.name.text
        return !(nodeProperties.name.getText().includes(text))
      })
    }

    members.push(properties)
  }

  return members
}

function removePropertyImportSpecifier(node: ts.ImportDeclaration) {
  const namedBindings = (node.importClause.namedBindings as ts.NamedImports)
  return ts.updateNamedImports(
    namedBindings, [ 
      ...namedBindings.elements.filter(element => {
          return !getText(element.name).includes('property')
         }) 
    ]
  )
}

export function inlinePropertyDecorators() {
  return context => {
    const visitor = (node) => {
      /// TODO: add condition to make sure class extends 
      if (ts.isClassDeclaration(node)) {
        node.members = updateNodeMembers(node.members)
      }
      if (ts.isImportDeclaration(node) && node.moduleSpecifier.getText().includes('lit-element')) {      
        //// if you are using rollup and treeshake is set to true
        ///  rollup will remove it if the `property` importSpecifier is not use
        node.importClause.namedBindings = removePropertyImportSpecifier(node)
      }
      return ts.visitEachChild(node, (child) => visitor(child), context)
    }
    return visitor
  }
}
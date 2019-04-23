import * as ts from 'typescript'
import * as path from 'path'
import * as fs from 'fs'

function createArrayLiteralStyles(cssStyles) {
  return ts.createArrayLiteral(
    cssStyles.map(cssStyle => createCSSTagTemplate(cssStyle))
  )
}

function createCSSTagTemplate(template) {
  return ts.createTaggedTemplate(
    ts.createIdentifier('css'), 
    ts.createNoSubstitutionTemplateLiteral(template)
  )
}

function createReturnStatement(cssStyles) {
  return cssStyles.length > 1
    ? ts.createReturn(createArrayLiteralStyles(cssStyles))
    : ts.createReturn(createCSSTagTemplate(cssStyles[0]))
}

function createGetAccessorStaticStyle(css) {
  return ts.createGetAccessor(undefined, 
    [ ts.createModifier(ts.SyntaxKind.StaticKeyword) ], 
    ts.createIdentifier('styles'), 
    [], 
    undefined, 
    ts.createBlock([ createReturnStatement(css) ])
  )
}

function updateGetAccessorStaticStyle(members, node, css) {
  const expression = (node.body.statements[0] as ts.ReturnStatement).expression
  
  members = members.filter(member => (!(member.getText().includes('styles'))))

  const returnBlock = ts.createReturn(ts.createArrayLiteral([ 
    expression, ...css.map(cssStyle => createCSSTagTemplate(cssStyle)) 
  ]))

  return [
    ts.createGetAccessor(node.decorators, 
      [ ts.createModifier(ts.SyntaxKind.StaticKeyword) ], 
      ts.createIdentifier('styles'), 
      [], 
      undefined, 
      ts.updateBlock(node.body, [ returnBlock ])
    ),
    ...members
  ]
}

function createStaticGetAccessor(statement, styles) {
  
  const styleStaticGet = statement.members.find(member => {
    return ts.isGetAccessor(member) 
      && member.name.hasOwnProperty('text')
      && member.name.getText().includes('styles')
  })

  if (styleStaticGet) {
    return updateGetAccessorStaticStyle(statement.members, styleStaticGet, styles)
  } 

  return [ ...statement.members, createGetAccessorStaticStyle(styles) ]
}

function getStatements(statements, styles) {
  return statements.map(statement => {
    if (ts.isClassDeclaration(statement)) {
      if (styles && styles.length > 0) {
        /// @ts-ignore
        statement.members = createStaticGetAccessor(statement, styles)
      }
    }
    return statement
  }) 
}

function buildSass(srcFile, sass) {
  const options = {
    data: fs.readFileSync(srcFile, 'utf8'),
    file: srcFile,
    outputStyle: 'compressed'
  }
  return sass.renderSync(options).css.toString() 
}

function compileStyle(statement, cssFullPath) {
  return statement.moduleSpecifier.getText().includes('.scss')
    ? buildSass(cssFullPath, require('node-sass'))
    : fs.readFileSync(cssFullPath, 'utf8') 
}

function getStyles(tsFilePath, statements) {
  const cssStatements = statements.filter(statement => {
    return ts.isImportDeclaration(statement) 
      && (statement.moduleSpecifier.getText().includes('.css')
        || statement.moduleSpecifier.getText().includes('.scss')) 
  })
  if (cssStatements) {
    return cssStatements
      .map(statement => {
        const cssRelativePath = statement.moduleSpecifier.getText().replace(/'/g, '')
        const cssFullPath = path.resolve(path.dirname(tsFilePath), cssRelativePath)
        return compileStyle(statement, cssFullPath)
      })   
  }
  return []
}

function removeImportStyles(statements) {
  return statements
    .filter(statement => {
      return !(ts.isImportDeclaration(statement) 
        && statement.moduleSpecifier.getText().includes('.css'))
    })
}

export function inlineStyles(tsFilePath) {
  return context => {
    const visitor = (node) => {
      if (Array.isArray(node.statements)) {
        node.statements = removeImportStyles(
          getStatements(node.statements, getStyles(tsFilePath, node.statements))
        )
      }
      return ts.visitEachChild(node, (child) => visitor(child), context);
    }
    return visitor
  }
}
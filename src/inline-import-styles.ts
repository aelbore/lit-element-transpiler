import * as ts from 'typescript'
import * as fs from 'fs'
import * as path from 'path'

function checkIfStaticGetStyleExist(statements) {
  let node;
  statements.forEach(statement => {
    if (ts.isClassDeclaration(statement)) {
      const member = statement.members.find(member => {
        return ts.isGetAccessor(member) 
          && member.name.hasOwnProperty('text')
          && member.name.getText().includes('styles')
      })
      if (member) {
        node = member
      }
    }
  })
  return node
}

function addOrUpdateStaticGetStyle(node, statements) {
  return statements.map(statement => {
    if (ts.isClassDeclaration(statement)) {
      /// remove if exist
      /// @ts-ignore
      statement.members = statement.members.filter(member => {
        return !(ts.isGetAccessor(member) 
            && member.name.hasOwnProperty('text')
            && member.name.getText().includes(node.name.getText()))
      })
      /// the the new or updated node
      /// @ts-ignore
      statement.members.push(node)
    }
    return statement
  })
}

function createReturnStatement(cssStyles) {
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

  return cssStyles.length > 1
    ? ts.createReturn(createArrayLiteralStyles(cssStyles))
    : ts.createReturn(createCSSTagTemplate(cssStyles[0]))
}

function createStaticGetStyle(cssStyles) {
  return ts.createGetAccessor(undefined, 
    [ ts.createModifier(ts.SyntaxKind.StaticKeyword) ], 
    ts.createIdentifier('styles'), 
    [], 
    undefined, 
    ts.createBlock([ createReturnStatement(cssStyles) ])
  )
}

function updateStaticGetStyle(cssStyles) {

}

function findAllImportStyles(statements) {
  return statements.filter(statement => {
    return ts.isImportDeclaration(statement)
      && (statement.moduleSpecifier.getText().includes('.css')
            || statement.moduleSpecifier.getText().includes('.scss'))
  })
}

function removeAllImportStyles(importStyles, statements) {
  const importStyleNames = importStyles.map(style => style.moduleSpecifier.getText())
  return statements.filter(statement => {
    return !(statement.hasOwnProperty('moduleSpecifier')
      && importStyleNames.includes(statement.moduleSpecifier.getText())
    )
  })
}

function createOrUpdateStaticGetStyle(statements, sourceFilePath, importStyles) {
  const staticGetStyleNode = checkIfStaticGetStyleExist(statements)

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

  function getStyles(importStyles) {
    return importStyles.map(statement => {
      const cssRelativePath = statement.moduleSpecifier.getText().replace(/'/g, '').replace(/"/g, '')
      const cssFullPath = path.resolve(path.dirname(sourceFilePath), cssRelativePath)
      return compileStyle(statement, cssFullPath)
    })
  }

  const cssStyles = getStyles(importStyles)

  return (!staticGetStyleNode) 
    ? createStaticGetStyle(cssStyles)
    : updateStaticGetStyle(cssStyles)
}

/**
 * Steps
 * 1 get all the import styles 
 * 2 if has import styles start creating static get styles
 * 3 remove all the import styles
 * 4 create or update static get styles
 * 5 override the existing statements
 */
export function inlineImportStyles(sourceFilePath) {
  return context => {
    const visitor = (node) => {
      if (Array.isArray(node.statements)) {
        const importStyles = findAllImportStyles(node.statements)
        if (importStyles && importStyles.length > 0) {
          const statements = removeAllImportStyles(importStyles, node.statements)
          const staticGetStyleNode = createOrUpdateStaticGetStyle(statements, sourceFilePath, importStyles)
          
          node.statements = addOrUpdateStaticGetStyle(staticGetStyleNode, statements)
        }
      }
      return ts.visitEachChild(node, (child) => visitor(child), context)
    }
    return visitor
  }
}
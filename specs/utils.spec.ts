import * as ts from 'typescript'
import * as mockfs from 'mock-fs'

import { expect } from 'aria-mocha'
import { getImportClauseElements, updateImportClauseNameImports } from '../src/utils'
import { getImportDeclarations } from './ts-helpers'

describe('utils', () => {
  let sourceFile: ts.SourceFile

  before(() => {
    const content = `
      import { LitElement } from 'lit-element'
      import './hello-world.css'

      class HelloWorld extends LitElement { }
    `

    mockfs({
      './src/hello-world.css': `
        h1 {
          color: red;
        }
      `
    })

    sourceFile = ts.createSourceFile('./src/hello-world.js', 
      content,
      ts.ScriptTarget.ES2015,
      false
    )
  })

  after(() => {
    mockfs.restore()
  })

  it('should [getImportClauseElements] without importClause and bindingsKind', () => {
    const statements = getImportDeclarations(sourceFile, { 
      moduleSpecifer: './hello-world.css'  
    })

    const elements = getImportClauseElements({ 
      statement: statements.pop(),
      bindingsKind: ts.SyntaxKind.NamedImports
    })
    expect(elements.length).equal(0)
  })

  it('should [updateImportClauseNameImports] with multiple specifier', () => {
    const statements = getImportDeclarations(sourceFile, { 
      moduleSpecifer: 'lit-element'  
    })
    const statement = statements.pop()
    
    statement.importClause = updateImportClauseNameImports(
      statement.importClause, 
      [ 'css', 'html' ]
    )

    const elements = getImportClauseElements({ statement })
    expect(elements.length).equal(3)
  })

})
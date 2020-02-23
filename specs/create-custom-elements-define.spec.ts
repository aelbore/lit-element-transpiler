import * as mockfs from 'mock-fs'
import * as ts from 'typescript'

import { expect } from 'aria-mocha'
import { transform } from '../src/transpiler'
import { getText } from '../src/utils'
import { promisify } from './ts-helpers'

describe('create-custom-elements-define', () => {
  let sourceFile: ts.SourceFile

  before(async () => {
    const content = `
      import { LitElement, html, css } from 'lit-element'
      import './hello-world.css'

      @customElement('hello-world')
      class HelloWorld extends LitElement { }    
    `
    mockfs({
      './src/hello-world.css':`
        h1 {
          color: red
        }
      `
    })

    const result = await transform('./src/hello-world.ts', content)
    sourceFile = ts.createSourceFile('./src/hello-world.js', 
      result.code, 
      ts.ScriptTarget.ES2015
    )
  })

  after(() => {
    mockfs.restore()
  })

  it('should remove [@customElement] decorator', () => {
    expect(sourceFile.decorators).toBeUndefined()
  })
  
  it('should transform [@customElement] decorator to customElements.define', async () => {
    const expressionStatements = sourceFile.statements.filter(statement => {
      return statement.kind === ts.SyntaxKind.ExpressionStatement
    })
    const statement = expressionStatements.pop() as ts.ExpressionStatement

    const argNames = [ 'hello-world', 'HelloWorld' ]
    const callExpression = statement.expression as ts.CallExpression
    expect(callExpression.arguments.length).equal(2)
    await Promise.all(callExpression.arguments.map(arg => {
      const text = (arg as ts.Identifier).text
      expect(argNames.includes(text)).toBeTrue()
    }))

    const propertAccess = callExpression.expression as ts.PropertyAccessExpression
    await Promise.all([
      promisify(() => expect(getText(propertAccess.name)).equal('define')),
      promisify(() => {
        expect(getText(propertAccess.expression as ts.Identifier)).equal('customElements')
      })
    ])
  })

  it('should have only 1 expression statement', async () => {
    const expressionStatements = sourceFile.statements.filter(statement => {
      return statement.kind === ts.SyntaxKind.ExpressionStatement
    })
    await Promise.all([
      promisify(() => expect(expressionStatements.length).equal(1)),
      promisify(() => {
        const statement = expressionStatements.pop() as ts.ExpressionStatement
        expect(statement.expression.kind).equal(ts.SyntaxKind.CallExpression)
      })
    ])
  })

})
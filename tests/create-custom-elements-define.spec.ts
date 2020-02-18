import * as mockfs from 'mock-fs'
import * as fs from 'fs'
import * as ts from 'typescript'

import { expect } from 'aria-mocha'
import { transpiler } from '../src/transpiler'
import { getOutputSource } from './ts-helpers'

describe('create-custom-elements-define', () => {

  afterEach(() => {
    mockfs.restore()
  })
  
  it('transform [@customElement] decorator to customElements.define', async () => {

    mockfs({
      './src/hello-world.ts': `
        import { LitElement, html, css } from 'lit-element'
        import './hello-world.css'

        @customElement('hello-world')
        class HelloWorld extends LitElement { }
      `,
      './src/hello-world.css':`
        h1 {
          color: red
        }
      `
    })
    

    const code = await fs.promises.readFile('./src/hello-world.ts', 'utf-8')
    const result = transpiler('./src/hello-world.ts', code)
    const sourceFile = await getOutputSource(result.code)

    expect(sourceFile.decorators).toBeUndefined()

    const expressionStatements = sourceFile.statements.filter(statement => {
      return statement.kind === ts.SyntaxKind.ExpressionStatement
    })
    expect(expressionStatements.length).equal(1)

    const statement = expressionStatements.pop() as ts.ExpressionStatement
    expect(statement.expression.kind).equal(ts.SyntaxKind.CallExpression)

    const argNames = [ 'hello-world', 'HelloWorld' ]
    const callExpression = statement.expression as ts.CallExpression
    expect(callExpression.arguments.length).equal(2)
    await Promise.all(callExpression.arguments.map(arg => {
      const text = (arg as ts.Identifier).text
      expect(argNames.includes(text)).toBeTrue()
    }))

    const propertAccess = callExpression.expression as ts.PropertyAccessExpression
    expect(propertAccess.name.text).equal('define')
    expect(
      (propertAccess.expression as ts.Identifier).text
    ).equal('customElements')
  })

})
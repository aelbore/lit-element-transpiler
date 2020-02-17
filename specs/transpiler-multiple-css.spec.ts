import * as mockfs from 'mock-fs'
import * as ts from 'typescript'

import { expect } from 'aria-mocha'
import { inlineCss } from '../src/transpiler-css'
import { getGetAccesors, getClassDeclarations, getStyleReturnStatement } from './ts-helpers'

describe('transpiler-multiple-css', () => {
  let sourceFile: ts.SourceFile

  before(async () => {
    const content = `
      import { LitElement, html } from 'lit-element'
      import './hello-world.css'
      import './others.css'

      class HelloWorld extends LitElement { }
    `
    
    mockfs({
      './src/hello-world.css':`
        h1 {
          color: red
        }
      `,
      './src/others.css':`
        h1 {
          color: blue
        }
      `
    })

    const result = await inlineCss({ file: './src/hello-world.ts', content })
    sourceFile = ts.createSourceFile('./src/hello-world.js', 
      result.code,
      ts.ScriptTarget.ES2015,
      false
    )
  })

  after(() => {
    mockfs.restore()
  })

  it('should inline multiple css', async () => {
    const classDeclarations = getClassDeclarations(sourceFile, { name: 'HelloWorld' })
    const accessors = getGetAccesors(classDeclarations)
    const returnStatement = getStyleReturnStatement(accessors.pop())

    expect(returnStatement.length).equal(2)
  })

})
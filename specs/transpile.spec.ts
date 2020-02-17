import * as mockfs from 'mock-fs'
import * as ts from 'typescript'

import { expect } from 'aria-mocha'
import { transform } from '../src/transpiler'
import { getClassDeclarations, getGetAccesors } from './ts-helpers'

describe('transpile', () => {

  afterEach(() => {
    mockfs.restore()
  })

  it('should transpile file', async () => {
    const content = `
      import { LitElement, html } from 'lit-element'
      import './hello-world.css'

      @customElement('hello-world')
      class HelloWorld extends LitElement { 
        
        @property() message

      } 
    `

    mockfs({
      './src/hello-world.css':`
        h1 {
          color: red
        }
      `
    })

    const result = await transform('./src/hello-world.ts', content)

    const sourceFile = ts.createSourceFile('./src/hello-world.js', 
      result.code, ts.ScriptTarget.ES2015, false
    )
    const classes = getClassDeclarations(sourceFile, {
      name: 'HelloWorld', extendsClass: 'LitElement'
    })
    const staticGetProperties = getGetAccesors(classes, {
      name: 'properties', modifierKind: ts.SyntaxKind.StaticKeyword
    })
    const staticGetStyle =getGetAccesors(classes, {
      name: 'styles', modifierKind: ts.SyntaxKind.StaticKeyword
    })

    expect(staticGetProperties.pop()).toBeDefined()
    expect(staticGetStyle.pop()).toBeDefined()
  })

})
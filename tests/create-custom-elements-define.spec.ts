import * as mockfs from 'mock-fs'
import * as fs from 'fs'

import { expect } from 'aria-mocha'
import { transpiler } from '../src/transpiler'
import {  getClassDeclarations, getDecorators } from './ts-helpers'

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

    const classDeclarations = getClassDeclarations(result.code, { name: 'HelloWorld' })
    const decorators = getDecorators(classDeclarations, { 
      decoratorNames: [ 'customElement' ] 
    })

    expect(decorators.length).equal(0)
  })

})
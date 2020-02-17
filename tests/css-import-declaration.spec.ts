import * as mockfs from 'mock-fs'
import * as fs from 'fs'
import * as ts from 'typescript'

import { expect } from 'aria-mocha'
import { transpiler } from '../src/transpiler'
import { getImportDeclarations } from './ts-helpers'

describe('css-import-declaration', () => {

  afterEach(() => {
    mockfs.restore()
  })

  it('should update existing moduleSpecifer [lit-element] with css importClause', async () => {
    const expectedElements = [ 'LitElement', 'html', 'css' ]

    mockfs({
      './src/hello-world.ts': `
        import { LitElement, html } from 'lit-element'
        import './hello-world.css'

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
    
    const imports = getImportDeclarations(result.code, { moduleSpecifer: 'lit-element' })
    expect(imports.length).equal(1)

    const litElementImport = imports.pop()
    const elements = (litElementImport.importClause.namedBindings as ts.NamedImports).elements

    expect(elements.length).equal(3)
    await Promise.all(elements.map(element => {
      expect(expectedElements.includes(element.name.getText()))
    }))
  })

  it('should not update existing moduleSpecifer [lit-element] with css importClause', async () => {
    const expectedElements = [ 'LitElement', 'html', 'css' ]

    mockfs({
      './src/hello-world.ts': `
        import { LitElement, html, css } from 'lit-element'
        import './hello-world.css'

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
    
    const imports = getImportDeclarations(result.code, { moduleSpecifer: 'lit-element' })
    expect(imports.length).equal(1)

    const litElementImport = imports.pop()
    const elements = (litElementImport.importClause.namedBindings as ts.NamedImports).elements

    expect(elements.length).equal(3)
    await Promise.all(elements.map(element => {
      expect(expectedElements.includes(element.name.getText()))
    }))
  })


})
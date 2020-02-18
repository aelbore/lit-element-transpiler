
import * as mockfs from 'mock-fs'
import * as fs from 'fs'
import * as ts from 'typescript'

import { expect } from 'aria-mocha'
import { getClassDeclarations, getGetAccesors, getImportDeclarations, getOutputSource } from './ts-helpers'
import { transpiler } from '../src/transpiler'

describe('inline-import-styles', () => {

  afterEach(() => {
    mockfs.restore()
  })

  it('should add or create static get styles getter in the class.', async () => {
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
    const sourceFile = await getOutputSource(result.code)

    const classDeclarations = getClassDeclarations(sourceFile, { name: 'HelloWorld' })
    const accessors = getGetAccesors(classDeclarations)

    /// it is expected to have only 1 getter
    expect(accessors.length).equal(1)
    
    /// test if the getter has styles name
    const staticGetAccessor = accessors.pop()
    expect((staticGetAccessor.name as ts.Identifier).escapedText.toString().includes('styles'))

    /// test if only 1 modifers
    /// modifier should only static keyword
    const modifiers = staticGetAccessor.modifiers.filter(modifier => {
      return modifier.kind === ts.SyntaxKind.StaticKeyword
    })
    expect(modifiers.length).equal(1)
  })

  it('should remove the style css/scss imports', async () => {
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
    const sourceFile = await getOutputSource(result.code)

    const imports = getImportDeclarations(sourceFile)
    expect(imports.length).equal(1)
    
    await Promise.all(imports.map(i =>  {
      expect(i.hasOwnProperty('importClause')).toBeTrue()
    }))
  })

})
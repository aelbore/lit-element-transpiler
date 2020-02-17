import * as mockfs from 'mock-fs'
import * as ts from 'typescript'

import { expect } from 'aria-mocha'

import { getText } from '../src/utils'
import { getImportDeclarations, getClassDeclarations, getGetAccesors } from './ts-helpers'

import { inlineCss } from '../src/transpiler-css'

describe('transpiler-css', () => {
  let sourceFile: ts.SourceFile

  before(async () => {
    const content = `
      import { LitElement, html } from 'lit-element'
      import './hello-world.css'

      class HelloWorld extends LitElement { }
    `
    
    mockfs({
      './src/hello-world.css':`
        h1 {
          color: red
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

  it('should add or create static get styles getter in the class.', async () => {
    const classDeclarations = getClassDeclarations(sourceFile, { name: 'HelloWorld' })
    const accessors = getGetAccesors(classDeclarations)

    /// it is expected to have only 1 getter
    expect(accessors.length).equal(1)
    
    /// test if the getter has styles name
    const staticGetAccessor = accessors.pop()
    const text = getText(staticGetAccessor.name as ts.Identifier)
    expect(text.includes('styles')).toBeTrue()

    /// test if only 1 modifers
    /// modifier should only static keyword
    const modifiers = staticGetAccessor.modifiers.filter(modifier => {
      return modifier.kind === ts.SyntaxKind.StaticKeyword
    })
    expect(modifiers.length).equal(1)
  })

  it('should remove the style css/scss imports', async () => {
    const imports = getImportDeclarations(sourceFile)
    expect(imports.length).equal(1)
    
    await Promise.all(imports.map(i =>  {
      expect(i.hasOwnProperty('importClause')).toBeTrue()
    }))
  })

  it('should not update existing moduleSpecifer [lit-element] with css importClause', async () => {
    const expectedElements = [ 'LitElement', 'html', 'css' ]
    
    const imports = getImportDeclarations(sourceFile, { moduleSpecifer: 'lit-element' })
    expect(imports.length).equal(1)

    const litElementImport = imports.pop()
    const elements = (litElementImport.importClause.namedBindings as ts.NamedImports).elements

    expect(elements.length).equal(3)
    await Promise.all(elements.map(element => {
      const text = getText(element.name)
      expect(expectedElements.includes(text))
    }))
  })

  it('should update existing moduleSpecifer [lit-element] with css importClause', async () => {
    const expectedElements = [ 'LitElement', 'html', 'css' ]

    const imports = getImportDeclarations(sourceFile, { moduleSpecifer: 'lit-element' })
    expect(imports.length).equal(1)

    const litElementImport = imports.pop()
    const elements = (litElementImport.importClause.namedBindings as ts.NamedImports).elements

    expect(elements.length).equal(3)
    await Promise.all(elements.map(element => {
      const text = getText(element.name)
      expect(expectedElements.includes(text))
    }))
  })

})
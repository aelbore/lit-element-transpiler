import * as mockfs from 'mock-fs'
import * as fs from 'fs'
import * as ts from 'typescript'

import { expect } from 'aria-mocha'
import { transpiler } from '../src/transpiler'
import { getOutputSource, getClassDeclarations, getGetAccesors } from './ts-helpers'

describe('create-static-get-properties', () => {

  afterEach(() => {
    mockfs.restore()
  })

  it('should transform @property decorator into static get properties', async () => {
    mockfs({
      './src/hello-world.ts': `
        import { LitElement, html, css } from 'lit-element'
        import './hello-world.css'

        @customElement('hello-world')
        class HelloWorld extends LitElement { 

          @property() firstName

        }
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

    /// it is expected to have only 2 getter
    /// styles and properties
    expect(accessors.length).equal(2)
    
    /// test if the getter has properties name
    const staticGetProperties = accessors.find(accessor => {
      return accessor.kind === ts.SyntaxKind.GetAccessor
        && (accessor.name as ts.Identifier).escapedText.toString().includes('properties')
        && accessor.modifiers.find(modifer => {
            return modifer.kind === ts.SyntaxKind.StaticKeyword
           })
    })
    expect(staticGetProperties).toBeDefined()
  })

  it('should remove @property decorator(s)', async () => {
    mockfs({
      './src/hello-world.ts': `
        import { LitElement, html, css } from 'lit-element'
        import './hello-world.css'

        @customElement('hello-world')
        class HelloWorld extends LitElement { 

          @property() firstName

        }
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
  })

  it('should add/update existing static get properties', async () => {
    const propertyAssignments = [  'firstName', 'message' ]

    mockfs({
      './src/hello-world.ts': `
        import { LitElement, html, css } from 'lit-element'
        import './hello-world.css'

        @customElement('hello-world')
        class HelloWorld extends LitElement { 

          @property() firstName

          static get properties() {
            return {
              message: { type: String }
            }
          }

        }
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

    const staticGetProperties = accessors.find(accessor => {
      return accessor.kind === ts.SyntaxKind.GetAccessor
        && (accessor.name as ts.Identifier).escapedText.toString().includes('properties')
        && accessor.modifiers.find(modifer => {
            return modifer.kind === ts.SyntaxKind.StaticKeyword
           })
    }) as ts.GetAccessorDeclaration
    const statement = staticGetProperties.body.statements.find(statement => {
      return statement.kind === ts.SyntaxKind.ReturnStatement
    })
    const expression = (statement as ts.ReturnStatement).expression as ts.ObjectLiteralExpression
    
    /// should 2 properties 
    //// firstName and message 
    expect(expression.properties.length).equal(2)

    /// test if property exist
    await Promise.all(expression.properties.map(property => {
      const text = property.name.hasOwnProperty('escapedText')
        ? (property.name as ts.Identifier).escapedText.toString()
        : property.name.getText()
      expect(propertyAssignments.includes(text)).toBeTrue()
    }))

  })

  xit('should remove property import clause element', () => {
    /// TODO:
  })

})
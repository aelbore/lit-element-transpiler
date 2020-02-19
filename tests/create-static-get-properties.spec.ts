import * as mockfs from 'mock-fs'
import * as fs from 'fs'
import * as ts from 'typescript'

import { expect } from 'aria-mocha'
import { transpiler } from '../src/transpiler'
import { getText } from '../src/utils'
import { getOutputSource, getClassDeclarations, getGetAccesors, getImportDeclarations, getImportClauseElements } from './ts-helpers'

describe('create-static-get-properties', () => {
  function getBodyStatementExpr(accessor: ts.GetAccessorDeclaration) {
    const statement = accessor.body.statements.find(statement => {
      return statement.kind === ts.SyntaxKind.ReturnStatement
    })
    return (statement as ts.ReturnStatement).expression as ts.ObjectLiteralExpression
  }

  async function getSourceFile() {
    const code = await fs.promises.readFile('./src/hello-world.ts', 'utf-8')
    const result = transpiler('./src/hello-world.ts', code)
    const sourceFile = await getOutputSource(result.code)
    return sourceFile
  }

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

    const sourceFile = await getSourceFile()
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
    const litElementSpecifiers = [ 'LitElement', 'html', 'css' ]

    mockfs({
      './src/hello-world.ts': `
        import { LitElement, html, property } from 'lit-element'
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

    const sourceFile = await getSourceFile()
    const imports = getImportDeclarations(sourceFile, { moduleSpecifer: 'lit-element' })
    const specifiers = await getImportClauseElements(imports.pop())

    expect(sourceFile.decorators).toBeUndefined()
    expect(specifiers.length).equal(litElementSpecifiers.length)
    await Promise.all(specifiers.map(specifier => {
      const text = getText(specifier.name as ts.Identifier)
      expect(litElementSpecifiers.includes(text)).toBeTrue()
    }))
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

    const sourceFile = await getSourceFile()
    const classDeclarations = getClassDeclarations(sourceFile, { name: 'HelloWorld' })
    const accessors = getGetAccesors(classDeclarations, { 
      modifierKind: ts.SyntaxKind.StaticKeyword, 
      name: 'properties' 
    })

    expect(accessors.length).equal(1)

    const staticGetProperties = accessors.pop() as ts.GetAccessorDeclaration    
    const expression = getBodyStatementExpr(staticGetProperties)
    
    /// should 2 properties 
    //// firstName and message 
    expect(expression.properties.length).equal(2)

    /// test if property exist
    await Promise.all(expression.properties.map(property => {
      const text = getText(property.name as ts.Identifier)
      expect(propertyAssignments.includes(text)).toBeTrue()
    }))

  })

  it('should get the options and have it in static get properties.', async () => {
    const propertyAssignments = {
      message: { type: 'String' },
      count: {
        type: 'Number',
        reflect: true
      },
      firstName: { type: 'String' }
    }

    mockfs({
      './src/hello-world.ts': `
        import { LitElement, html } from 'lit-element'
        import './hello-world.css'

        @customElement('hello-world')
        class HelloWorld extends LitElement { 

          @property() firstName
          @property({ type: Number, reflect: true }) count

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

    const sourceFile = await getSourceFile()
    const classDeclarations = getClassDeclarations(sourceFile, { name: 'HelloWorld' })
    const accessors = getGetAccesors(classDeclarations, { 
      modifierKind: ts.SyntaxKind.StaticKeyword, 
      name: 'properties' 
    })

    const staticGetProperties = accessors.pop() as ts.GetAccessorDeclaration    
    const expression = getBodyStatementExpr(staticGetProperties)
    const propertyAssignmentKeys = Object.keys(propertyAssignments)

    expect(classDeclarations.pop().decorators).toBeUndefined()
    expect(expression.properties.length).equal(3)
    await Promise.all(propertyAssignmentKeys.map(async value => {      
      const find = <ts.PropertyAssignment>expression.properties.find(property => {
        return getText(property.name as ts.Identifier).includes(value)
      })
      expect(find).toBeDefined()

      const props = find.initializer as ts.ObjectLiteralExpression
      const keys = Object.keys(propertyAssignments[value])
      
      /// test if transform property is same as the actual
      expect(props.properties.length).equal(keys.length)

      /// test if transform property keys is same as actual keys
      await Promise.all(keys.map(key => {
        const propKey = props.properties.find(property => {
          return getText(property.name as ts.Identifier).includes(key) 
        })
        expect(propKey).toBeDefined()
      }))
    }))

  })

})
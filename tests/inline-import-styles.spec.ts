import * as ts from 'typescript'
import { expect } from 'aria-mocha'

import { findAllImportStyles } from '../src/import-styles'

describe('import-styles', () => {
  const transpile = (code: string, { transformers }) => {
    return ts.transpileModule(code, {
      compilerOptions: { 
        module: ts.ModuleKind.ES2015, 
        target: ts.ScriptTarget.ES2018,
        skipLibCheck: true,
        skipDefaultLibCheck: true,
        strictNullChecks: false,
        sourceMap: false
      },
      transformers
    }); 
  }

  it('should [findAllImportStyles]', () => {

    function inlineImportStyles() {
      return context => {
        const visitor = (node) => {
          if (Array.isArray(node.statements)) {
            const importStyles = findAllImportStyles(node.statements)
            expect(Array.from(importStyles).length).equal(1)
          }
          return ts.visitEachChild(node, (child) => visitor(child), context)
        }
        return visitor
      }
    }

    const code = `
      import { LitElement, html } from 'lit-element'
      import './styles.css'

      class HelloWorld extends LitElement {}
    `

    transpile(code, { 
      transformers: {
        before: [ inlineImportStyles() ]
      }
    })
  })

})
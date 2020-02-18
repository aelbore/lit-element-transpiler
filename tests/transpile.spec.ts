import * as mockfs from 'mock-fs'
import * as fs from 'fs'
import * as ts from 'typescript'

import { expect } from 'aria-mocha'
import { transpileFile } from '../src/transpiler'

describe('transpile', () => {

  afterEach(() => {
    mockfs.restore()
  })

  it('should transpile file', async () => {
    mockfs({
      'dist': {},
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

    const output = await transpileFile('./src/hello-world.ts', {
      compilerOptions: {
        module: ts.ModuleKind.ES2015, 
        target: ts.ScriptTarget.ES2018,
        skipLibCheck: true,
        skipDefaultLibCheck: true,
        strictNullChecks: false,
        sourceMap: true
      }
    })

    await fs.promises.writeFile('./dist/output.js', output.code)
    expect(fs.existsSync('./dist/output.js')).toBeTrue()
  })

})
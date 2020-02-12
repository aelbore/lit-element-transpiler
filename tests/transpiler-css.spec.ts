import * as mockfs from 'mock-fs'
import * as fs from 'fs'
import * as ts from 'typescript'
import { inlineCss } from '../src/transpiler-css'

describe('transpiler-css', () => {

  after(() => {
    mockfs.restore()
  })

  it('should transpile import css/scss', async () => {
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

    const content = await fs.promises.readFile('./src/hello-world.ts', 'utf-8')

    const result = await inlineCss(content, './src/hello-world.ts')
    //console.log(result)
  })

})
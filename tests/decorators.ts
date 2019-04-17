import * as path from 'path'
import * as fs from 'fs'
import * as util from 'util'

import { transpiler } from '../src/transpiler'
import { mkdirp, clean } from 'aria-fs'

import { expect } from 'chai'

const writeFile = util.promisify(fs.writeFile)
const readFile = util.promisify(fs.readFile)

const SOURCE_FILE = path.resolve('demo/decorators/hello-world.js')
const OUTPUT_FILE = SOURCE_FILE.replace('demo', 'dist')
const OUTPUT_BASE_DIR = path.dirname(OUTPUT_FILE)

describe('Decorators', () => {
  let content
  
  beforeEach(async () => {
    content = await readFile(SOURCE_FILE, 'utf-8')
    mkdirp(OUTPUT_BASE_DIR)
  })

  afterEach(async () => {
    await clean('dist')
  })

  it('should have customElements.define', async () => { 
    const mapFilePath = OUTPUT_FILE + '.map'

    const result = transpiler(SOURCE_FILE, content)
    await Promise.all([ 
      writeFile(OUTPUT_FILE, result.code), writeFile(mapFilePath, result.map) 
    ])
        
    expect(fs.existsSync(OUTPUT_FILE)).to.true
    expect(fs.existsSync(mapFilePath)).to.true
    expect(fs.readFileSync(OUTPUT_FILE, 'utf-8'))
      .includes(`customElements.define("hello-world", HelloWorld);`)
  })

})
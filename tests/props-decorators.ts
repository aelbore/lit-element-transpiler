import * as path from 'path'
import * as fs from 'fs'
import * as util from 'util'

import { mkdirp, clean } from 'aria-fs'

import { expect } from 'chai'
import { transpiler } from '../src/transpiler'

const readFile = util.promisify(fs.readFile)

const SOURCE_FILE = path.resolve('fixtures/props-decorators.js')
const OUTPUT_FILE = SOURCE_FILE.replace('fixtures', 'dist/decorators')
const OUTPUT_BASE_DIR = path.dirname(OUTPUT_FILE)

describe('PropsDecorators', () => {
  let content
  
  beforeEach(async () => {
    content = await readFile(SOURCE_FILE, 'utf-8')
    mkdirp(OUTPUT_BASE_DIR)
  })

  afterEach(async () => {
    await clean('dist')
  })

  it('should transform to static get properties', async () => { 
    const result = transpiler(SOURCE_FILE, content)
    
    expect(result.code).contains('name: { type: String }')
    expect(result.code).contains('message: { type: String }')
    expect(result.code).contains('static get properties() {')
    expect(result.code).contains('checked: { type: Boolean, notify: true }')
  })

})
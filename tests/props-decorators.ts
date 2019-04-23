import * as path from 'path'
import * as fs from 'fs'
import * as util from 'util'

import { transpile } from '../src/transpiler'
import { mkdirp, clean } from 'aria-fs'
import { propsDecorators } from '../src/props-decorators'

import { expect } from 'chai'
import { customElementDefine } from '../src/element-define';
import { inlineStyles } from '../src/inline-css-transformer';
import { cssImportDeclation } from '../src/css-import-declaration'

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
    const result = transpile(SOURCE_FILE, content, {
      transformers: {
        before: [ 
          propsDecorators(),
          customElementDefine(),
          inlineStyles(SOURCE_FILE),
          cssImportDeclation()
        ]
      }
    })

    expect(result.code).contains('name: { type: String }')
    expect(result.code).contains('message: { type: String }')
    expect(result.code).contains('static get properties() {')
    expect(result.code).contains('checked: { type: Boolean, notify: true }')
  })

})
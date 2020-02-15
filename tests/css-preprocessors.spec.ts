import * as fs from 'fs'
import * as autoprefixer from 'autoprefixer'
import * as postcssNested from 'postcss-nested'
import * as cssnano from 'cssnano'

import { expect } from 'aria-mocha'
import { css, SassPreprocessor, PostCssPreprocessor } from '../src/css-preprocessors'

describe('css-preprocessors', () => {

  describe('node-sass', () => {
    let content: string, file: string

    before(async () => {
      file = './fixtures/hello-world.scss'
      content = await fs.promises.readFile(file, 'utf-8')
    })

    it('should build or compile scss file', async () => {
      const expected = '.level-one{--display: block;display:var(--display)}.level-one .level-one-one{color:red}'
  
      const result = await css().process(content, file)
    
      expect(result.css.replace('\n', '').replace('\r', ''))
        .equal(expected)
    })

    it('should have sourcemap', async () => {
      const options: SassPreprocessor = {
        sourcemap: true
      }

      const result = await css(options).process(content, file)
      expect(result.map).notEqual('')
    })

  })

  describe('postcss', () => {
    let content: string, file: string

    before(async () => {
      file = './fixtures/hello-world.scss'
      content = await fs.promises.readFile(file, 'utf-8')
    })    

    it('should build or compile scss file', async () => {
      const scssVarLike = require('postcss-simple-vars')
      const expected = '.level-one{--display:block;display:var(--display)}.level-one .level-one-one{color:red}'

      const options: PostCssPreprocessor = {
        preprocessor: 'postcss',
        plugins: [ autoprefixer(), postcssNested(), scssVarLike(), cssnano() ]
      }
      
      const result = await css(options).process(content, file)
      expect(result.css).equal(expected)
    })

    it('should have sourcemap', async () => {
      const scssVarLike = require('postcss-simple-vars')

      const options: PostCssPreprocessor = {
        preprocessor: 'postcss',
        map: { 
          inline: false 
        },
        plugins: [ autoprefixer(), postcssNested(), scssVarLike(), cssnano() ]
      }

      const result = await css(options).process(content, file)
      expect(result.map).notEqual('')
    })
  
  })

})

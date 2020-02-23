import * as path from 'path'

export type SassOutputStyle = 'nested' | 'expanded' | 'compact' | 'compressed'

export interface CompileStyleOptions {
  content: string;
  file: string;
  opts?: SassPreprocessor | PostCssPreprocessor
}

export interface StylePreprocessor {
  preprocessor?: 'node-sass' | 'postcss'
}

export interface SassPreprocessor extends StylePreprocessor {
  sourcemap?: boolean | string
  sourceMapEmbed?: boolean
  outputStyle?: SassOutputStyle
}

export interface PostCssPreprocessor extends StylePreprocessor {
  plugins?: any[]
  map?: boolean | { inline?: boolean }
}

async function buildSass(options?: CompileStyleOptions) {
  const opts = (options.opts ? (options.opts as SassPreprocessor): {})
  const hasSourceMap = opts.sourcemap ? true: false
  const sassOpts = {
    data: options.content,
    file: options.file,
    outputStyle: 'compressed',
    sourceMap: opts.sourcemap,
    sourceMapContents: hasSourceMap,
    omitSourceMapUrl: hasSourceMap, 
    outFile: (opts.sourcemap && !opts.sourceMapEmbed) ? path.basename(options.file): '',
    ...(opts || {})
  }
  const sass = await import('node-sass')
  const result = sass.renderSync(sassOpts)
  return { 
    css: result.css.toString(),
    map: result.map ? result.map.toJSON(): ''
  }
}

async function buildPostCss(options?: CompileStyleOptions) {
  const { file, content } = options
  const opts = options.opts as PostCssPreprocessor
  const postcss = require('postcss')
  const { css, map } = await postcss([ ...(opts.plugins || []) ])
    .process(content, { 
      from: file,
      map: opts.map
    })
  return {
    css,
    map: map ? map.toJSON(): ''
  }
}

function process(css: string, file: string, opts?: StylePreprocessor) {
  const options = { content: css, file, opts }
  switch (opts.preprocessor) {
    case 'postcss':
      return buildPostCss(options)
    default:
      return buildSass(options)
  }
}

export function css(options: StylePreprocessor = { 
  preprocessor: 'node-sass'
}) {
  return {
    process: (css: string, file: string) => process(css, file, options)
  }
}
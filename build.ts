import { bundle, clean, TSRollupConfig } from 'aria-build'

(async function() {

  const options: TSRollupConfig = {
    input: './src/index.ts',
    external: [ 
      'typescript' 
    ],
    output: {
      file: 'dist/lit-element-transpiler.js',
      format: 'cjs'
    },
    tsconfig: {
      compilerOptions: {
        declaration: true
      }
    }
  }

  await clean('dist')
  await bundle(options)
})()
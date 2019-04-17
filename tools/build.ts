import * as path from 'path'
import * as fs from 'fs'
import * as util from 'util'

import { rollup } from 'rollup'
import { clean } from 'aria-fs'

const writeFile = util.promisify(fs.writeFile)
const rename = util.promisify(fs.rename);
const copyFile = util.promisify(fs.copyFile)

const typescript2 = require('rollup-plugin-typescript2');
const resolve = require('rollup-plugin-node-resolve')

const INPUT_FILE = 'src/index.ts'
const OUTPUT_FILE = 'dist/lit-element-transpiler.js'

function rollupBuild({ inputOptions, outputOptions }) {
  return rollup(inputOptions).then(bundle => bundle.write(outputOptions));
}

async function copyPackageFile() {
  const FILE_NAME = 'package.json';
  const pkg = require(`../${FILE_NAME}`);
  delete pkg.scripts;
  delete pkg.devDependencies;
  return writeFile(`dist/${FILE_NAME}`, JSON.stringify(pkg, null, 2))
}

async function copyReadmeFile() {
  return copyFile(path.resolve('README.md'), path.resolve('dist/README.md'))
}

async function renameTypings() {
  return rename('dist/index.d.ts', 'dist/lit-element-transpiler.d.ts') 
}

const rollupConfig = {
  inputOptions: {
    treeshake: true,
    input: INPUT_FILE,
    external: [ 'path', 'typescript', 'fs' ],
    plugins: [
      typescript2({
        tsconfigDefaults: { 
          compilerOptions: { 
            target: 'es2015', 
            module: 'esNext', 
            moduleResolution: 'node',
            declaration: true,
            lib: [ "dom", "es2015", "es2017" ]
          },
          exclude: [
            "examples/**/*",
            "tools/**/*"
          ],
          include: [ INPUT_FILE ]
        },
        check: false,
        cacheRoot: path.join(path.resolve(), 'node_modules/.tmp/.rts2_cache'), 
        useTsconfigDeclarationDir: false
      }),    
      resolve()
    ],
    onwarn (warning) {
      if (warning.code === 'THIS_IS_UNDEFINED') { return; }
      console.log("Rollup warning: ", warning.message);
    }
  },
  outputOptions: {
    sourcemap: false,
    file: OUTPUT_FILE,
    format: 'cjs'
  }
}

clean('dist')
  .then(() => rollupBuild(rollupConfig))
  .then(() => Promise.all([ copyPackageFile(), renameTypings(), copyReadmeFile() ]))
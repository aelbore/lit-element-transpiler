import { symlinkDir } from 'aria-build'

(async function() {
  await symlinkDir('./dist', 
    './node_modules/lit-element-transpiler'
  )
  await symlinkDir('./node_modules', 
    './packages/rollup-plugin-inline-lit-element/node_modules'
  )
})()
import { symlinkDir } from 'aria-build'

(async function() {

  await Promise.all([
    symlinkDir('./dist',  './node_modules/lit-element-transpiler'),
    symlinkDir('./node_modules', 
      './packages/rollup-plugin-inline-lit-element/node_modules'
    ),
    symlinkDir('./node_modules', 
      './packages/inline-lit-element-loader/node_modules'
    )
  ])

})()
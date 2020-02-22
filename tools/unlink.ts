import { unlinkDir } from 'aria-build'

(async function() {
  await Promise.all([
    unlinkDir('./node_modules/lit-element-transpiler'),
    unlinkDir('./packages/rollup-plugin-inline-lit-element/node_modules'),
    unlinkDir('./packages/inline-lit-element-loader/node_modules')
  ])
})()
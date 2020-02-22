  npm --prefix ./packages/rollup-plugin-inline-lit-element run build &&
  npm --prefix ./packages/rollup-plugin-inline-lit-element run link.loader &&
  npm --prefix ./packages/rollup-plugin-inline-lit-element run build.counter &&
  npm --prefix ./packages/rollup-plugin-inline-lit-element run build.counter.decorators &&

  npm --prefix ./packages/inline-lit-element-loader run bundle &&
  npm --prefix ./packages/inline-lit-element-loader run link.loader &&
  npm --prefix ./packages/inline-lit-element-loader run build.counter &&
  npm --prefix ./packages/inline-lit-element-loader run build.counter.decorators
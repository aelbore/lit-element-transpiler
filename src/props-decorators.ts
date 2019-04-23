import * as ts from 'typescript'
import { updateNodeMembers } from './create-static-get-properties';

export function propsDecorators() {
  return context => {
    const visitor = (node) => {
      if (ts.isClassDeclaration(node)) {
        if (node.heritageClauses && node.heritageClauses.length > 0) {          
          if (node.heritageClauses[0].types[0].expression.getText().includes('LitElement')) {
            /// @ts-ignore
            node.members = updateNodeMembers(node.members)
          }
        }
      }
      return ts.visitEachChild(node, (child) => visitor(child), context)
    }
    return visitor
  }
}
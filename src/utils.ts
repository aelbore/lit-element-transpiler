import * as ts from 'typescript'

export function getText(identifier: ts.Identifier) {
  return identifier.hasOwnProperty('escapedText')
    ? identifier.escapedText.toString()
    : identifier.text
}
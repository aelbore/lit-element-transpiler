[![Coverage Status](https://coveralls.io/repos/github/aelbore/lit-element-transpiler/badge.svg?branch=master)](https://coveralls.io/github/aelbore/lit-element-transpiler?branch=master)
[![Build Status](https://travis-ci.com/aelbore/lit-element-transpiler.svg?branch=master)](https://travis-ci.com/aelbore/lit-element-transpiler)
[![npm version](https://badge.fury.io/js/lit-element-transpiler.svg)](https://www.npmjs.com/package/lit-element-transpiler)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](https://opensource.org/licenses/MIT)

# lit-element-transpiler
LitElement code transpiler (import css and scss file and inline to your component also transpile decorators to native javascript)

Getting Started
------------
  ```
  git clone https://github.com/aelbore/lit-element-transpiler.git
  npm install
  ```

Installation
------------
  ```
    npm install --save-dev lit-element-transpiler
  ```

Usage
------------
* Code
  ``` typescript
    import * as mockfs from 'mock-fs'
    import * as fs from 'fs'

    import { transform } from 'lit-element-transpiler'

    mockfs({
      './src/hello-world.ts': `
        import { LitElement, html, customElement, property } from 'lit-element'
        import './hello-world.css'

        @customElement('hello-world')
        class HelloWorld extends LitElement { 
          
          @property() message

        } 
      `
      './src/hello-world.css':`
        h1 {
          color: red
        }
      `
    })

    const content = await fs.promises.readFile('./src/hello-world.ts', 'utf-8')
    const { code, map } = await transform('./src/hello-world.ts', content)
  ```
  
* Output
  ```typescript
    import { LitElement, css } from 'lit-element'

    class HelloWorld extends LitElement { 
      static get properties() {
        return {
          message: { type: String }
        }
      }

      static get styles() {
        return css `
          h1 { color: red }
        `
      }
    } 

    customElements.define('hello-world', HelloWorld)
  ```
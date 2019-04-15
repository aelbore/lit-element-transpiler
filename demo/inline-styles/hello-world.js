import { LitElement, html } from 'lit-element'
import './hello-world.css'

export class HelloWorld extends LitElement {

  static get properties() {
    return {
      message: { type: String }
    }
  }

  render() {
    return html `<h1>Hello ${this.message}</h1>`
  }

}

customElements.define('hello-world', HelloWorld)
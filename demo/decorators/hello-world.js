import { LitElement, html, customElement } from 'lit-element'

@customElement('hello-world')
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
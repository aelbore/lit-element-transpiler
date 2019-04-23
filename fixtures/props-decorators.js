import { LitElement, html, property, customElement } from 'lit-element'
import './props-decorators.css'

@customElement('props-decorators')
class PropsDecorators extends LitElement {

  @property({ type: Boolean, notify: true }) 
  checked = true

  @property() name = ''

  static get properties() {
    return {
      message: { type: String }
    }
  }

  render() {
    return html `<h1>Hello ${this.message}</h1>`
  }

}
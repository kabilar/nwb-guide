

import { html } from 'lit';
import { openLink } from '../../../links.js';
import { docu_lottie } from '../../../../assets/lotties/documentation-lotties.js';
import { Page } from '../Page.js';

import globals from '../../../../scripts/globals.js'
const { startLottie } = globals;

export class DocumentationPage extends Page {

  constructor(...args) {
    super(...args)
  }

  updated(){
    let doc_lottie = (this ?? this.shadowRoot).querySelector("#documentation-lottie");

    startLottie(doc_lottie, docu_lottie);


  }

  render() {
    return html`
<section
  id="documentation-section"
  class="section js-section u-category-menu"
>
  <div class="documentation_container">
    <div class="document_container">
      <div class="doc_container">
        <div class="dc_con">
          <h1 class="doc_header">Documentation</h1>
          <hr class="docu_divide" />
          <div class="document-content" style="justify-content: center">
            <div id="documentation-lottie" class="documentation-lottie_style"></div>
          </div>
          <div class="docu-content-container">
            <h2 class="document_text">
              We have created a documentation page for each feature in SODA. You can find the
              documentation site by clicking on the button below:
            </h2>
            <div class="button_container_contact">
              <button
                id="doc-btn"
                class="view_doc_button sodaVideo-button"
                style="margin-top: 1rem"
                @click="${() => {
                  openLink(
                    "https://docs.sodaforsparc.io/docs/getting-started/organize-and-submit-sparc-datasets-with-soda"
                  );
                }}"
              >
                View the Documentation
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</section>
    `;
  }
};

customElements.get('nwbguide-documentation-page') || customElements.define('nwbguide-documentation-page',  DocumentationPage);

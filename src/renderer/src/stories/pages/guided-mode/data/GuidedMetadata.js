import { html } from "lit";
import { JSONSchemaForm } from "../../../JSONSchemaForm.js";

import { InstanceManager } from "../../../InstanceManager.js";
import { ManagedPage } from "./ManagedPage.js";
import { Modal } from "../../../Modal";

import { validateOnChange } from "../../../../validation/index.js";
import { createResults } from "./utils.js";

export class GuidedMetadataPage extends ManagedPage {
    constructor(...args) {
        super(...args);
    }

    form;
    footer = {
        onNext: async () => {
            this.save();
            for (let { form } of this.forms) await form.validate(); // Will throw an error in the callback
            this.onTransition(1);
        },
    };

    createForm = ({ subject, session, info }) => {
        const results = createResults({ subject, info }, this.info.globalState);

        const instanceId = `sub-${subject}/ses-${session}`;

        const form = new JSONSchemaForm({
            identifier: instanceId,
            mode: "accordion",
            schema: this.info.globalState.schema.metadata[subject][session],
            results,
            ignore: ["Ecephys", "source_script", "source_script_file_name"],
            conditionalRequirements: [
                {
                    name: "Subject Age",
                    properties: [
                        ["Subject", "age"],
                        ["Subject", "date_of_birth"],
                    ],
                },
            ],
            validateOnChange,
            onlyRequired: false,
            onStatusChange: (state) => {
                const indicator = this.manager.shadowRoot.querySelector(
                    `li[data-instance='sub-${subject}/ses-${session}']`
                );
                const currentState = Array.from(indicator.classList).find((c) => c !== "item");
                if (currentState) indicator.classList.remove(currentState);
                indicator.classList.add(state);
            },
        });

        return {
            subject,
            session,
            form,
        };
    };

    render() {
        this.forms = this.mapSessions(this.createForm);

        let instances = {};
        this.forms.forEach(({ subject, session, form }) => {
            if (!instances[`sub-${subject}`]) instances[`sub-${subject}`] = {};
            instances[`sub-${subject}`][`ses-${session}`] = form;
        });

        this.manager = new InstanceManager({
            header: "File Metadata",
            instanceType: "Session",
            instances,

            controls: [
                {
                    name: "Preview",
                    onClick: async (key, el) => {
                        let [subject, session] = key.split("/");
                        if (subject.startsWith("sub-")) subject = subject.slice(4);
                        if (session.startsWith("ses-")) session = session.slice(4);

                        const [{ file, result }] = await this.runConversions({ stub_test: true }, [
                            { subject, session },
                        ]).catch((e) => this.notify(e.message, "error"));

                        const modal = new Modal({
                            header: file,
                            open: true,
                            onClose: () => modal.remove(),
                        });

                        modal.insertAdjacentHTML("beforeend", `<pre>${result}</pre>`);
                        document.body.appendChild(modal);
                    },
                },
            ],
        });

        return html`
            <div id="guided-mode-starting-container" class="guided--main-tab">
                <div class="guided--panel" id="guided-intro-page" style="flex-grow: 1">
                    <div class="guided--section">${this.manager}</div>
                </div>
            </div>
        `;
    }
}

customElements.get("nwbguide-guided-metadata-page") ||
    customElements.define("nwbguide-guided-metadata-page", GuidedMetadataPage);

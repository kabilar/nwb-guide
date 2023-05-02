import { html } from "lit";
import { JSONSchemaForm } from "../JSONSchemaForm.js";
import { Page } from "./Page.js";
import { validateOnChange } from "../../validation/index.js";

export function schemaToPages(schema, globalStatePath, options) {
    return Object.entries(schema.properties)
        .filter(([_, value]) => value.properties)
        .map(([key, value]) => {
            const optionsCopy = { ...options };
            if (optionsCopy.required && optionsCopy.required[key])
                optionsCopy.required = {
                    [key]: optionsCopy.required[key],
                };
            // Only bring requirements from the current page
            else delete optionsCopy.required;

            const page = new GuidedFormPage({
                label: key,
                key,
                section: this.info.section,
                globalStatePath,
                formOptions: {
                    ...optionsCopy,
                    schema: { properties: { [key]: value } },
                },
            });

            delete schema.properties[key];

            if (optionsCopy.ignore && optionsCopy.ignore.includes(key)) return null;
            return page;
        })
        .filter((page) => page);
}

export class GuidedFormPage extends Page {
    constructor(...args) {
        super(...args);
        if (!this.info.globalStatePath) this.info.globalStatePath = [];
        if (!this.info.formOptions) this.info.formOptions = {};
        if (!this.info.formOptions.schema) this.info.formOptions.schema = {};
        if (!this.info.formOptions.results) this.info.formOptions.results = {};
    }

    footer = {
        onNext: async () => {
            await this.form.validate();

            this.onTransition(1);
        },
    };

    render() {
        const key = this.info.key;
        const temp = this.info.globalStatePath
            ? this.info.globalStatePath.reduce((acc, key) => acc[key] ?? (acc[key] = {}), this.info.globalState)
            : {};
        const results = { [key]: temp[key] ?? (temp[key] = {}) };

        const form = (this.form = new JSONSchemaForm({
            ...this.info.formOptions,
            results,
            validateOnChange,
        }));

        form.style.width = "100%";

        return html`
            <div id="guided-mode-starting-container" class="guided--main-tab" data-parent-tab-name="Dataset Structure">
                <div class="guided--panel" id="guided-intro-page" style="flex-grow: 1">
                    <div class="title">
                        <h1 class="guided--text-sub-step">Data Formats</h1>
                    </div>
                    <div class="guided--section">${form}</div>
                </div>
            </div>
        `;
    }
}

customElements.get("nwbguide-guided-form-page") || customElements.define("nwbguide-guided-form-page", GuidedFormPage);

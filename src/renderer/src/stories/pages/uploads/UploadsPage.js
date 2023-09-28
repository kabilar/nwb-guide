import { html } from "lit";
import { JSONSchemaForm } from "../../JSONSchemaForm.js";
import { Page } from "../Page.js";
import { onThrow } from "../../../errors";

const folderPathKey = "filesystem_paths";
import dandiUploadSchema from "../../../../../../schemas/json/dandi/upload.json";
import dandiStandaloneSchema from "../../../../../../schemas/json/dandi/standalone.json";
const dandiSchema = merge(dandiStandaloneSchema, merge(dandiUploadSchema, {}), { arrays: true });

import { Button } from "../../Button.js";
import { global } from "../../../progress/index.js";
import { merge } from "../utils.js";

import { run } from "../guided-mode/options/utils.js";
import { notyf } from "../../../dependencies/globals.js";
import Swal from "sweetalert2";
import { Modal } from "../../Modal";
import { DandiResults } from "../../DandiResults.js";

export const isStaging = (id) => parseInt(id) >= 100000;

export async function uploadToDandi(info, type = "project" in info ? "project" : "") {
    const { dandiset_id } = info;

    const staging = isStaging(dandiset_id); // Automatically detect staging IDs

    const whichAPIKey = staging ? "staging_api_key" : "main_api_key";
    const api_key = global.data.DANDI?.api_keys?.[whichAPIKey];

    if (!api_key) {
        await Swal.fire({
            title: `Your DANDI API key (${whichAPIKey}) is not configured.`,
            html: "Edit your settings to include this value.",
            icon: "warning",
            confirmButtonText: "Go to Settings",
        });

        return this.to("settings");
    }

    const result = await run(
        type ? `upload/${type}` : "upload",
        {
            ...info,
            staging,
            api_key,
        },
        { title: "Uploading to DANDI" }
    ).catch((e) => {
        notyf.open({
            type: "error",
            message: e.message,
        });
        throw e;
    });

    if (result)
        notyf.open({
            type: "success",
            message: `${
                info.project ?? `${info[folderPathKey].length} filesystem entries`
            } successfully uploaded to Dandiset ${dandiset_id}`,
        });

    return result;
}

export class UploadsPage extends Page {
    constructor(...args) {
        super(...args);
    }

    render() {
        const globalState = (global.data.uploads = global.data.uploads ?? {});
        const defaultButtonMessage = "Upload Files";

        const button = new Button({
            label: defaultButtonMessage,
            onClick: async () => {
                await this.form.validate(); // Will throw an error in the callback
                await uploadToDandi.call(this, { ...global.data.uploads });
                global.data.uploads = {};
                global.save();

                const modal = new Modal({ open: true });
                modal.header = "DANDI Upload Summary";
                const summary = new DandiResults({ id: globalState.dandiset_id });
                summary.style.padding = "25px";
                modal.append(summary);

                document.body.append(modal);

                this.requestUpdate();
            },
        });

        // NOTE: API Keys and Dandiset IDs persist across selected project
        this.form = new JSONSchemaForm({
            results: globalState,
            schema: dandiSchema,
            sort: ([k1]) => {
                if (k1 === folderPathKey) return -1;
            },
            onUpdate: ([id]) => {
                if (id === folderPathKey) {
                    for (let key in dandiSchema.properties) {
                        const input = this.form.getInput([key]);
                        if (key !== folderPathKey && input.value) input.updateData(""); // Clear the results of the form
                    }
                }

                global.save();
            },
            onThrow,
        });

        return html`
            <div style="display: flex; align-items: end; justify-content: space-between; margin-bottom: 10px;">
                <h1 style="margin: 0;">DANDI Uploads</h1>
            </div>
            <p>This page allows you to upload folders with NWB files to the DANDI Archive.</p>
            <hr />

            <div>
                ${this.form}
                <hr />
                ${button}
            </div>
        `;
    }
}

customElements.get("nwbguide-uploads-page") || customElements.define("nwbguide-uploads-page", UploadsPage);

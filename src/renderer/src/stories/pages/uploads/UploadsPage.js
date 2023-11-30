import { html } from "lit";
import { until } from "lit/directives/until.js";

import { JSONSchemaForm } from "../../JSONSchemaForm.js";
import { Page } from "../Page.js";
import { onThrow } from "../../../errors";

const folderPathKey = "filesystem_paths";
import dandiUploadSchema, {
    addDandiset,
    ready,
    regenerateDandisets,
} from "../../../../../../schemas/dandi-upload.schema";
import dandiStandaloneSchema from "../../../../../../schemas/json/dandi/standalone.json";
const dandiSchema = merge(dandiUploadSchema, structuredClone(dandiStandaloneSchema), { arrays: true });

import dandiCreateSchema from "../../../../../../schemas/json/dandi/create.json";

import { Button } from "../../Button.js";
import { global } from "../../../progress/index.js";
import { merge } from "../utils.js";

import { run } from "../guided-mode/options/utils.js";
import { Modal } from "../../Modal";
import { DandiResults } from "../../DandiResults.js";

import dandiGlobalSchema from "../../../../../../schemas/json/dandi/global.json";
import { JSONSchemaInput } from "../../JSONSchemaInput.js";
import { header } from "../../forms/utils";

import { validateDANDIApiKey } from "../../../validation/dandi";

import * as dandi from "dandi";

import keyIcon from "../../assets/key.svg?raw";

import { isStaging, validate, willCreate } from "./utils";
import { createFormModal } from "../../forms/GlobalFormModal";

export async function createDandiset(results = {}) {
    let notification;

    const notify = (message, type) => {
        if (notification) this.dismiss(notification);
        return (notification = this.notify(message, type));
    };

    const modal = new Modal({
        header: "Create a Dandiset",
    });

    const content = document.createElement("div");
    Object.assign(content.style, {
        padding: "25px",
        paddingBottom: "0px",
    });

    const form = new JSONSchemaForm({
        schema: dandiCreateSchema,
        results,
    });

    content.append(form);
    modal.append(content);

    modal.onClose = async () => notify("Dandiset was not created.", "error");

    return new Promise((resolve) => {
        const button = new Button({
            label: "Create",
            primary: true,
            onClick: async () => {
                await form.validate().catch(() => {
                    const message = "Please fill out all required fields";
                    notify("Dandiset was not set", "error");
                    throw message;
                });

                const staging = form.resolved.staging;
                const api_key = await getAPIKey.call(this, staging);

                const apiStaging = new dandi.API({ token: api_key, type: staging ? "staging" : undefined });
                await apiStaging.init();

                const res = await apiStaging.create(
                    form.resolved.title,
                    form.resolved.metadata,
                    form.resolved.embargo_status
                );

                const id = res.identifier;

                notify(`Dandiset <b>${id}</b> was created`, "success");

                await addDandiset(res);

                const input = this.form.getInput(["dandiset"]);
                input.updateData(id);
                input.requestUpdate();

                this.save();

                resolve(res);
            },
        });

        modal.footer = button;

        modal.open = true;

        document.body.append(modal);
    }).finally(() => {
        modal.remove();
    });
}

async function getAPIKey(staging = false) {
    const whichAPIKey = staging ? "staging_api_key" : "main_api_key";
    const DANDI = global.data.DANDI;
    let api_key = DANDI?.api_keys?.[whichAPIKey];

    const errors = await validateDANDIApiKey(api_key, staging);

    const isInvalid = !errors || errors.length;

    if (isInvalid) {
        const modal = new Modal({
            header: `${api_key ? "Update" : "Provide"} your ${header(whichAPIKey)}`,
            open: true,
        });

        const input = new JSONSchemaInput({
            path: [whichAPIKey],
            info: dandiGlobalSchema.properties.api_keys.properties[whichAPIKey],
        });

        input.style.padding = "25px";

        modal.append(input);

        let notification;

        const notify = (message, type) => {
            if (notification) this.dismiss(notification);
            return (notification = this.notify(message, type));
        };

        modal.onClose = async () => notify("The updated DANDI API key was not set", "error");

        api_key = await new Promise((resolve) => {
            const button = new Button({
                label: "Save",
                primary: true,
                onClick: async () => {
                    const value = input.value;
                    if (value) {
                        const errors = await validateDANDIApiKey(input.value, staging);
                        if (!errors || !errors.length) {
                            modal.remove();

                            merge(
                                {
                                    DANDI: {
                                        api_keys: {
                                            [whichAPIKey]: value,
                                        },
                                    },
                                },
                                global.data
                            );

                            global.save();
                            resolve(value);
                        } else {
                            notify(errors[0].message, "error");
                            return false;
                        }
                    } else {
                        notify("Your DANDI API key was not set", "error");
                    }
                },
            });

            modal.footer = button;

            document.body.append(modal);
        });
    }

    return api_key;
}

export async function uploadToDandi(info, type = "project" in info ? "project" : "") {
    const { dandiset } = info;

    if (willCreate(dandiset)) {
        await createDandiset.call(this, { title: dandiset });
        await this.save();
    }

    const dandiset_id = dandiset;

    const staging = isStaging(dandiset_id); // Automatically detect staging IDs

    const api_key = await getAPIKey.call(this, staging);

    const payload = {
        dandiset_id,
        ...info.additional_settings,
        staging,
        api_key,
    };

    if (info.project) payload.project = info.project;
    else payload.filesystem_paths = info.filesystem_paths;

    const result = await run(type ? `upload/${type}` : "upload", payload, {
        title: "Uploading your files to DANDI",
    }).catch((e) => {
        this.notify(e.message, "error");
        throw e;
    });

    if (result)
        this.notify(
            `${
                info.project ?? `${info[folderPathKey].length} filesystem entries`
            } successfully uploaded to Dandiset ${dandiset_id}`,
            "success"
        );

    return result;
}

export class UploadsPage extends Page {
    header = {
        title: "DANDI Uploads",
        subtitle: "This page allows you to upload folders with NWB files to the DANDI Archive.",
        controls: [
            new Button({
                icon: keyIcon,
                label: "API Keys",
                onClick: () => {
                    this.#globalModal.form.results = structuredClone(global.data.DANDI.api_keys);
                    this.#globalModal.open = true;
                },
            }),
        ],
    };

    constructor(...args) {
        super(...args);
    }

    #globalModal = null;

    connectedCallback() {
        super.connectedCallback();

        const modal = (this.#globalModal = createFormModal.call(this, {
            header: "DANDI API Keys",
            schema: dandiGlobalSchema.properties.api_keys,
            onSave: async (form) => {
                const apiKeys = form.resolved;
                merge(apiKeys, global.data.DANDI.api_keys);
                global.save();
                await regenerateDandisets();
                const input = this.form.getInput(["dandiset "]);
                input.requestUpdate();
            },
            validateOnChange: async (name, parent) => {
                const value = parent[name];
                if (name.includes("api_key")) return await validateDANDIApiKey(value, name.includes("staging"));
            },
        }));
        document.body.append(modal);
    }

    disconnectedCallback() {
        super.disconnectedCallback();
        this.#globalModal.remove();
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
                const summary = new DandiResults({ id: globalState.dandiset });
                summary.style.padding = "25px";
                modal.append(summary);

                document.body.append(modal);

                this.requestUpdate();
            },
        });

        const promise = ready.cpus
            .then(() => ready.dandisets)
            .then(() => {
                // NOTE: API Keys and Dandiset IDs persist across selected project
                return (this.form = new JSONSchemaForm({
                    results: globalState,
                    schema: dandiSchema,
                    sort: ([k1]) => {
                        if (k1 === folderPathKey) return -1;
                    },
                    onUpdate: ([id]) => {
                        if (id === folderPathKey) {
                            const keysToUpdate = ["dandiset"];
                            keysToUpdate.forEach((k) => {
                                const input = this.form.getInput([k]);
                                if (input.value) input.updateData("");
                            });
                        }

                        global.save();
                    },
                    onThrow,

                    validateOnChange: validate,
                }));
            })
            .catch((e) => html`<p>${e}</p>`);

        return html`
            ${until(
                promise.then((form) => {
                    return html`
                        ${form}
                        <hr />
                        ${button}
                    `;
                }),
                html`<p>Loading form contents...</p>
                    <p />`
            )}
        `;
    }
}

customElements.get("nwbguide-uploads-page") || customElements.define("nwbguide-uploads-page", UploadsPage);

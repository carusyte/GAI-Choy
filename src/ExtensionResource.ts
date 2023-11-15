import { ExtensionContext, OutputChannel, SecretStorage, window } from "vscode";

export default class ExtensionResource {
    private static _instance: ExtensionResource;
    private static _output: OutputChannel;
    private static _secrets: SecretStorage;

    constructor() {}

    static init(context: ExtensionContext): void {
        if (ExtensionResource._instance){
            return;
        }
        ExtensionResource._instance = new ExtensionResource();
        ExtensionResource._secrets = context.secrets;
        ExtensionResource._output = window.createOutputChannel("GAI Choy");
    }
    
    static get instance(): ExtensionResource{
        return ExtensionResource._instance;
    }

    static get secretStorage(): SecretStorage {
        return ExtensionResource._secrets;
    }

    static get outputChannel(): OutputChannel {
        return ExtensionResource._output;
    }

    async logMessage(msg?: string): Promise<void> {
        if (msg) {
            let now = new Date().toLocaleString();
            ExtensionResource._output.appendLine(`[${now}] ${msg}`);
        }
    }

    async storeApiKey(token?: string): Promise<void> {
        /*
        Update values in the extensionContext's secret storage.
        */
        if (token) {
            ExtensionResource._secrets.store("gaichoy.aoai_api_key", token);
        }
    }

    async getApiKey(): Promise<string | undefined> {
        /*
        Retrieve data from secret storage.
        */
        return await ExtensionResource._secrets.get("gaichoy.aoai_api_key");
    }
}
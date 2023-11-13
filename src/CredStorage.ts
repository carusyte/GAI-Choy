import { ExtensionContext, SecretStorage } from "vscode";

export default class CredStorage {
    private static _instance: CredStorage;

    constructor(private secretStorage: SecretStorage) { }

    static init(context: ExtensionContext): void {
        /*
        Create instance of new CredStorage.
        */
        CredStorage._instance = new CredStorage(context.secrets);
    }

    static get instance(): CredStorage {
        /*
        Getter of our AuthSettings existing instance.
        */
        return CredStorage._instance;
    }

    async storeApiKey(token?: string): Promise<void> {
        /*
        Update values in the extensionContext's secret storage.
        */
        if (token) {
            this.secretStorage.store("gaichoy.aoai_api_key", token);
        }
    }

    async getApiKey(): Promise<string | undefined> {
        /*
        Retrieve data from secret storage.
        */
        return await this.secretStorage.get("gaichoy.aoai_api_key");
    }
}
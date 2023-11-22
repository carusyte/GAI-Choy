import { ExtensionContext, OutputChannel, SecretStorage, window, workspace } from "vscode";

export enum LogType {
    debug = "DBG",
    info = "INF",
    warning = "WRN",
    error = "ERR",
    fatal = "FTL"
}

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

    async logMessage(msg?: string, logType: LogType = LogType.info): Promise<void> {
        // if msg is null or empty string, return immediately
        if (!msg) {
            return;
        }
        // if extension configuration GAIChoy.EnableDebugMessage is false and the logType is debug, return immediately
        const enableDebugMessage = workspace.getConfiguration("GAIChoy").get("EnableDebugMessage") as boolean;
        if (!enableDebugMessage && logType === LogType.debug) {
            return;
        }
        // log the message to the output channel
        let now = new Date().toLocaleString();
        ExtensionResource._output.appendLine(`[${now}][${logType}] ${msg}`);
    }

    async debugMessage(msg?: string): Promise<void> {
        console.debug(msg);
        this.logMessage(msg, LogType.debug);
    }

    async errorMessage(msg?: string): Promise<void> {
        console.error(msg);
        this.logMessage(msg, LogType.error);
    }

    async infoMessage(msg?: string): Promise<void> {
        console.info(msg);
        this.logMessage(msg, LogType.info);
    }

    async warningMessage(msg?: string): Promise<void> {
        console.warn(msg);
        this.logMessage(msg, LogType.warning);
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
import { CancellationToken, InlineCompletionContext, InlineCompletionItem, InlineCompletionItemProvider, InlineCompletionList, Position, ProviderResult, Range, TextDocument, window, workspace, StatusBarItem, InlineCompletionTriggerKind } from "vscode";
import { postCompletion } from "./RequestCompletion";
import { sleep } from "./Utils";
import * as path from 'path';

export class CodeShellCompletionProvider implements InlineCompletionItemProvider {

    private statusBar: StatusBarItem;

    constructor(statusBar: StatusBarItem) {
        this.statusBar = statusBar;
    }

    //@ts-ignore
    // because ASYNC and PROMISE
    public async provideInlineCompletionItems(document: TextDocument, position: Position, context: InlineCompletionContext, token: CancellationToken): ProviderResult<InlineCompletionItem[] | InlineCompletionList> {
        let autoTriggerEnabled = workspace.getConfiguration("GAIChoy").get("AutoTriggerCompletion") as boolean;
        if (context.triggerKind === InlineCompletionTriggerKind.Automatic) {
            if (!autoTriggerEnabled) {
                return Promise.resolve(([] as InlineCompletionItem[]));
            }
            let delay = workspace.getConfiguration("GAIChoy").get("AutoCompletionDelay") as number;
            await sleep(1000 * delay);
            if (token.isCancellationRequested) {
                return Promise.resolve(([] as InlineCompletionItem[]));
            }
        }

        const fimPrefixCode = this.getFimPrefixCode(document, position);
        const fimSuffixCode = this.getFimSuffixCode(document, position);
        if (this.isNil(fimPrefixCode) && this.isNil(fimSuffixCode)) {
            return Promise.resolve(([] as InlineCompletionItem[]));
        }

        this.statusBar.text = "$(loading~spin)";
        this.statusBar.tooltip = "GAI Choy - Working";
        const fileName = path.basename(document.fileName);
        return postCompletion(fileName, fimPrefixCode, fimSuffixCode).then((response) => {
            this.statusBar.text = "$(light-bulb)";
            this.statusBar.tooltip = `GAI Choy - Ready`;
            if (token.isCancellationRequested || !response || this.isNil(response.trim())) {
                return Promise.resolve(([] as InlineCompletionItem[]));
            }
            return [new InlineCompletionItem(response, new Range(position, position))];
        }).catch((error) => {
            console.error(error);
            this.statusBar.text = "$(alert)";
            this.statusBar.tooltip = "GAI Choy - Error";
            window.setStatusBarMessage(`${error}`, 10000);
            const outputChannel = window.createOutputChannel("GAI Choy");
            outputChannel.appendLine("caught error trying to perform code completion");
            outputChannel.appendLine(error);
            outputChannel.show(true);
            return Promise.resolve(([] as InlineCompletionItem[]));
        }).finally(() => {
        });
    }

    private getFimPrefixCode(document: TextDocument, position: Position): string {
        const firstLine = Math.max(position.line - 100, 0);
        const range = new Range(firstLine, 0, position.line, position.character);
        return document.getText(range).trim();
    }

    private getFimSuffixCode(document: TextDocument, position: Position): string {
        const startLine = position.line + 1;
        const endLine = Math.min(startLine + 10, document.lineCount);
        const range = new Range(position.line, position.character, endLine, 0);
        return document.getText(range).trim();
    }

    private isNil(value: String | undefined | null): boolean {
        return value === undefined || value === null || value.length === 0;
    }
    
}

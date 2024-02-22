import { CancellationToken, InlineCompletionContext, InlineCompletionItem, InlineCompletionItemProvider, InlineCompletionList, Position, ProviderResult, Range, TextDocument, window, workspace, StatusBarItem, InlineCompletionTriggerKind } from "vscode";
import { postCompletion } from "./RequestCompletion";
import { sleep } from "./Utils";
import * as path from 'path';
import ExtensionResource, { LogType } from "./ExtensionResource";

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
            let indentedResponse = this.indent(response, document, position);
            return [new InlineCompletionItem(indentedResponse, new Range(position, position))];
        }).catch((error) => {
            this.statusBar.text = "$(alert)";
            this.statusBar.tooltip = "GAI Choy - Error";
            window.setStatusBarMessage(`${error}`, 10000);
            window.showErrorMessage(`${error}`);
            const xres = ExtensionResource.instance;
            xres.errorMessage("caught error trying to perform code completion");
            xres.errorMessage(error);
            return Promise.resolve(([] as InlineCompletionItem[]));
        }).finally(() => {
        });
    }

    private indent(snippet: string, document: TextDocument, position: Position): string{
        //Indent each line of input snippet with the required indentation.
        //Needed indentation can be inferred from the curent line of the document.
        let lines = snippet.split("\n");
        let currentLine = document.lineAt(position.line).text;
        if (currentLine === null || currentLine === ""){
            return snippet;
        }
        // infer how many indentation (either whitespaces or tabs or both) is in current line
        let indentations = currentLine.match(/^\s*/) as RegExpMatchArray;
        if (indentations === null || indentations.length === 0){
            return snippet;
        }
        let indentation = indentations[0];
        // prepend indentation to each lines except the first line.
        let indentedLines = lines.map((line, index) => {
            if (index === 0){
                return line;
            }
            // if the line contains leading whitespace with length equal or greater than indentation,
            // that probably indicates the line has already been indented properly, and we can skip prepending
            // excessive indentation in this case.
            let leadingWhitespace = line.match(/^\s*/);
            if (leadingWhitespace && leadingWhitespace[0].length >= indentation.length) {
                return line;
            }
            return indentation + line;
        });
        return indentedLines.join("\n");
    }

    private getFimPrefixCode(document: TextDocument, position: Position): string {
        const modelEnv = workspace.getConfiguration("GAIChoy").get("RunEnvForLLMs") as string;
        
        if ("Azure OpenAI" === modelEnv){
            const range = new Range(0, 0, position.line, position.character);
            return document.getText(range);
        }

        const firstLine = Math.max(position.line - 100, 0);
        const range = new Range(firstLine, 0, position.line, position.character);
        return document.getText(range).trim();
    }

    private getFimSuffixCode(document: TextDocument, position: Position): string {
        const modelEnv = workspace.getConfiguration("GAIChoy").get("RunEnvForLLMs") as string;

        if ("Azure OpenAI" === modelEnv) {
            const range = new Range(position.line, position.character, document.lineCount, 0);
            return document.getText(range);
        }

        const startLine = position.line + 1;
        const endLine = Math.min(startLine + 10, document.lineCount);
        const range = new Range(position.line, position.character, endLine, 0);
        return document.getText(range).trim();
    }

    private isNil(value: String | undefined | null): boolean {
        return value === undefined || value === null || value.length === 0;
    }
    
}

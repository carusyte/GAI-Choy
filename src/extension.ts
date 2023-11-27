// The module "vscode" contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from "vscode";
import { CodeShellCompletionProvider } from "./CodeShellCompletionProvider";
import { CodeShellWebviewViewProvider } from "./CodeShellWebviewViewProvider";
import { translate } from "./LanguageHelper";
import ExtensionResource from "./ExtensionResource";

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export async function activate(context: vscode.ExtensionContext) {
	ExtensionResource.init(context);
	ExtensionResource.instance.infoMessage("Initializing...");
	registerCompleteionExtension(context);
	registerWebviewViewExtension(context);
	registerSecretStorage(context);
	ExtensionResource.instance.infoMessage("GAI Choy is ready.");
}

// This method is called when your extension is deactivated
export function deactivate() { }


function registerWebviewViewExtension(context: vscode.ExtensionContext) {
	const provider = new CodeShellWebviewViewProvider(context);

	// Register the provider with the extension's context

	context.subscriptions.push(
		vscode.window.registerWebviewViewProvider(CodeShellWebviewViewProvider.viewId, provider, {
			webviewOptions: { retainContextWhenHidden: true }
		}),
		vscode.commands.registerCommand("gaichoy.explain_this_code", () => provider.executeCommand("gaichoy.explain_this_code")),
		vscode.commands.registerCommand("gaichoy.improve_this_code", () => provider.executeCommand("gaichoy.improve_this_code")),
		vscode.commands.registerCommand("gaichoy.clean_this_code", () => provider.executeCommand("gaichoy.clean_this_code")),
		vscode.commands.registerCommand("gaichoy.generate_comment", () => provider.executeCommand("gaichoy.generate_comment")),
		vscode.commands.registerCommand("gaichoy.generate_unit_test", () => provider.executeCommand("gaichoy.generate_unit_test")),
		vscode.commands.registerCommand("gaichoy.check_performance", () => provider.executeCommand("gaichoy.check_performance")),
		vscode.commands.registerCommand("gaichoy.check_security", () => provider.executeCommand("gaichoy.check_security")),
		vscode.commands.registerCommand('gaichoy.clear_chat_history', async () => {
			vscode.window.showWarningMessage("Confirm to delete all chat history?", "Confirm", "Cancel").then(
				choice => {
					if (choice === "Confirm"){
						provider.clearChatHistory();
					}
				}
			);
		})
	);
}

function registerCompleteionExtension(context: vscode.ExtensionContext) {
	const statusBar = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left);
	statusBar.name = "GAI Choy";
	statusBar.text = "$(lightbulb)";
	statusBar.tooltip = `GAI Choy - Ready`;

	const completionStatusCallback = (enabled: boolean) => async () => {
		const configuration = vscode.workspace.getConfiguration();
		const target = vscode.ConfigurationTarget.Global;
		configuration.update("GAIChoy.AutoTriggerCompletion", enabled, target, false).then(console.error);
		// var msg = enabled ? translate("auto_completion") : translate("disable_auto_completion");
		// vscode.window.showInformationMessage(msg);
		statusBar.show();
	};

	context.subscriptions.push(
		vscode.languages.registerInlineCompletionItemProvider(
			{ pattern: "**" }, new CodeShellCompletionProvider(statusBar)
		),

		vscode.commands.registerCommand("gaichoy.auto_completion_enable", completionStatusCallback(true)),
		vscode.commands.registerCommand("gaichoy.auto_completion_disable", completionStatusCallback(false)),
		statusBar
	);

	if (vscode.workspace.getConfiguration("GAIChoy").get("AutoTriggerCompletion")) {
		vscode.commands.executeCommand("gaichoy.auto_completion_enable");
	} else {
		vscode.commands.executeCommand("gaichoy.auto_completion_disable");
	}
}

function registerSecretStorage(context: vscode.ExtensionContext) {
	const cs = ExtensionResource.instance;

	vscode.commands.registerCommand('gaichoy.set_api_key', async () => {
		const apiKey: string = await vscode.window.showInputBox({
			password: true,
			title: "Enter API Key"
		}) ?? '';

		await cs.storeApiKey(apiKey);
	});
}


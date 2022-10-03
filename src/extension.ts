import * as vscode from 'vscode';
import { CadqueryViewer } from './viewer';
import { CadqueryController } from "./controller";
import { version as cq_vscode_version } from "./version";

export function activate(context: vscode.ExtensionContext) {

	//	Commands

	context.subscriptions.push(
		vscode.commands.registerCommand('cadquery-viewer.cadqueryViewer', () => {
			const editor = vscode.window?.activeTextEditor?.document;
			const column = vscode.window?.activeTextEditor?.viewColumn;
			new CadqueryController(context);
			if (editor !== undefined){
				vscode.window.showTextDocument(editor, column);
			}
		})
	);

	//	Register Web view

	vscode.window.registerWebviewPanelSerializer(CadqueryViewer.viewType, {
		async deserializeWebviewPanel(webviewPanel: vscode.WebviewPanel, state: any) {
			CadqueryViewer.revive(webviewPanel, context.extensionUri);
		}
	});
}

export function deactivate() { }

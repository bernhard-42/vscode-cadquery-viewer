import * as vscode from 'vscode';
import { CadqueryViewer } from './viewer';
import { CadqueryController } from "./controller";

export function activate(context: vscode.ExtensionContext) {

	console.log('CadQuery Viewer" is active');
	let cadqueryController = new CadqueryController(context);

	/*
	 *	Commands
	 */

	context.subscriptions.push(
		vscode.commands.registerCommand('cadquery-viewer.cadqueryViewer', () => {
			console.log("CadQuery initialized");
		})
	);

	/*
	 *	Register Web view
	 */

	vscode.window.registerWebviewPanelSerializer(CadqueryViewer.viewType, {
		async deserializeWebviewPanel(webviewPanel: vscode.WebviewPanel, state: any) {
			CadqueryViewer.revive(webviewPanel, context.extensionUri);
		}
	});
}

export function deactivate() { 
	
}

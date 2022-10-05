import * as vscode from "vscode";
import { CadqueryViewer } from "./viewer";
import { CadqueryController } from "./controller";
import { version as cq_vscode_version } from "./version";
import * as output from './Output';

const URL =
	"https://github.com/bernhard-42/vscode-cadquery-viewer/releases/download";
var terminal: vscode.Terminal;

export function activate(context: vscode.ExtensionContext) {
	//	Commands

	context.subscriptions.push(
		vscode.commands.registerCommand(
			"cadquery-viewer.cadqueryViewer",
			() => {
				const editor = vscode.window?.activeTextEditor?.document;
				const column = vscode.window?.activeTextEditor?.viewColumn;

				output.show();
				
				// already open terminal to ensure, conda env is selected
				terminal = vscode.window.createTerminal(
					"Cadquery Viewer installation"
				);

				const controller = new CadqueryController(context, terminal);

				if (editor !== undefined) {
					vscode.window.showTextDocument(editor, column);
				}
				output.debug("Command cadqueryViewer registered");
			}
		)
	);

	context.subscriptions.push(
		vscode.commands.registerCommand(
			"cadquery-viewer.installPythonModule",
			() => {
				terminal.show(true);
				terminal.sendText(
					`pip install ${URL}/v${cq_vscode_version}/cq_vscode-${cq_vscode_version}-py3-none-any.whl`
				);
				output.debug("Command installPythonModule registered");
			}
		)
	);

	//	Register Web view

	vscode.window.registerWebviewPanelSerializer(CadqueryViewer.viewType, {
		async deserializeWebviewPanel(
			webviewPanel: vscode.WebviewPanel,
			state: any
		) {
			CadqueryViewer.revive(webviewPanel, context.extensionUri);
		}
	});
}

export function deactivate() {
	output.debug("CadQuery Viewer extension deactivated");
}

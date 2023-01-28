import * as vscode from "vscode";
import { CadqueryViewer } from "./viewer";
import { CadqueryController } from "./controller";
import { version as cq_vscode_version } from "./version";
import * as output from './output';
import { createLibraryManager } from "./libraryManager";
import { inquiry, getEditor, getPythonPath } from "./utils";
import { pipList } from "./system/shell";
import { TerminalExecute } from "./system/terminal";

import { execSync } from 'child_process';


// const URL = "https://github.com/bernhard-42/vscode-cadquery-viewer/releases/download";

// let x = new LibraryManagerProvider();

// let cmds: string[][] = [];
// x.getInstallLibs().forEach((lib: string) => {
// 	x.getInstallLibMgrs(lib).forEach((mgr: string) => {
// 		cmds.push(x.getInstallLibCmds(lib, mgr));
// 	});
// });

let libraryManager = createLibraryManager();
libraryManager.refresh("");

export function activate(context: vscode.ExtensionContext) {

	var terminal: vscode.Terminal;

	//	Commands
	context.subscriptions.push(
		vscode.commands.registerCommand(
			"cadquery-viewer.cadqueryViewer",
			async () => {

				output.show();

				let useDefault = true;
				let port = 3939;

				while (true) {
					if (!useDefault) {
						let value = await vscode.window.showInputBox({
							prompt: `Port ${port} in use, select another port`,
							placeHolder: "1024 .. 49152",
							validateInput: text => {
								let port = Number(text);
								if (Number.isNaN(port)) {
									return "Not a valid number";
								} else if (port < 1024 || port > 49151) {
									return "Number out of range";
								}
								return null;
							}
						});
						if (value === undefined) {
							output.error("Cancelling");
							break;
						}

						port = Number(value);
					}
					const editor = vscode.window?.activeTextEditor?.document;
					if (editor === undefined) {
						output.error("No editor open");
						vscode.window.showErrorMessage("No editor open");

						break;
					}
					const column = vscode.window?.activeTextEditor?.viewColumn;

					const controller = new CadqueryController(context, port);

					if (controller.isStarted()) {
						if (terminal === undefined) {
							// already open terminal to ensure, conda env is selected
							terminal = vscode.window.createTerminal(
								{ name: "Cadquery Viewer installation" }
							);
						}
						controller.setTerminal(terminal);

						vscode.window.showTextDocument(editor, column);

						if (port !== 3939) {
							vscode.window.showWarningMessage(`In Python first call cq_vscode's "set_port(${port})"`);
						}
						output.show();
						output.debug("Command cadqueryViewer registered");
						controller.logo();
						break;
					} else {
						output.info(`Restarting ...`);
						useDefault = false;
					}
				}

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

	context.subscriptions.push(vscode.commands.registerCommand(
		"cadquery-viewer.installLibrary", async (library) => {
			let managers = libraryManager.getInstallLibMgrs(library.label);
			let manager = await inquiry(`Select package manager to install "${library.label}"`, managers);
			if (manager === "") {
				return;
			}
			let commands = libraryManager.getInstallLibCmds(library.label, manager);

			let python = await getPythonPath();
			let reply = await vscode.window.showQuickPick(["yes", "no"], {
				placeHolder: `Use python interpreter "${python}"?`
			}) || "";
			if (reply === "") {
				return;
			}

			if ((python === "python") || reply === "no") {
				await vscode.commands.executeCommand("python.setInterpreter");
				python = await getPythonPath();
			}

			let terminal = new TerminalExecute("Installing... ");
			try {
				await terminal.execute(commands);
				libraryManager.refresh(manager);

			} catch (e: any) {
				output.error(e.message);
			}
		}
	));

	context.subscriptions.push(vscode.commands.registerCommand(
		"cadquery-viewer.paste-imports", (library) => {

		}
	));

	context.subscriptions.push(vscode.commands.registerCommand(
		'cadquery-viewer.refresh-libraries', () => libraryManager.refresh("")
	));

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
	CadqueryViewer.currentPanel?.dispose();
}

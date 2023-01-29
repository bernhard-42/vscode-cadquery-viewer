import * as vscode from "vscode";
import { CadqueryViewer } from "./viewer";
import { CadqueryController } from "./controller";
import * as output from './output';
import { createLibraryManager, Library, LibraryManagerProvider } from "./libraryManager";
import { createStatusManager, Status } from "./statusManager";
import { inquiry, getEditor, getPythonPath } from "./utils";
import { TerminalExecute } from "./system/terminal";




async function installLib(libraryManager: LibraryManagerProvider, library: Library) {
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

export function activate(context: vscode.ExtensionContext) {

	var terminal: vscode.Terminal;

	let statusManager = createStatusManager();
	statusManager.refresh("");

	let libraryManager = createLibraryManager(statusManager);
	libraryManager.refresh("");

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

					const controller = new CadqueryController(context, port, statusManager);

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
						statusManager.refresh(port.toString());

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
			async () => {
				let library = new Library("cq_vscode", "", "", "", "", "", vscode.TreeItemCollapsibleState.None);
				await installLib(libraryManager, library);
				statusManager.installed = true;
				statusManager.refresh("");
				output.debug("Command installPythonModule registered");
			}
		)
	);

	context.subscriptions.push(vscode.commands.registerCommand(
		"cadquery-viewer.installLibrary", async (library) => {
			await installLib(libraryManager, library);
		}
	));

	context.subscriptions.push(vscode.commands.registerCommand(
		"cadquery-viewer.pasteImports", (library) => {

		}
	));

	context.subscriptions.push(vscode.commands.registerCommand(
		'cadquery-viewer.refreshLibraries', () => libraryManager.refresh("")
	));

	context.subscriptions.push(vscode.commands.registerCommand(
		'cadquery-viewer.refreshStatus', () => statusManager.refresh("")
	));

	context.subscriptions.push(vscode.commands.registerCommand(
		'cadquery-viewer.openViewer', () => statusManager.openViewer()
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

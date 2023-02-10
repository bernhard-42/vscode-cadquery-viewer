/*
   Copyright 2023 Bernhard Walter
  
   Licensed under the Apache License, Version 2.0 (the "License");
   you may not use this file except in compliance with the License.
   You may obtain a copy of the License at
  
      http://www.apache.org/licenses/LICENSE-2.0
  
   Unless required by applicable law or agreed to in writing, software
   distributed under the License is distributed on an "AS IS" BASIS,
   WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   See the License for the specific language governing permissions and
   limitations under the License.
*/

import * as vscode from "vscode";
import * as output from "./output";
import { CadqueryController } from "./controller";
import { CadqueryViewer } from "./viewer";
import { createLibraryManager, installLib, Library } from "./libraryManager";
import { createStatusManager } from "./statusManager";
import { download } from "./examples";
import { getCurrentFolder } from "./utils";

export async function activate(context: vscode.ExtensionContext) {
    let controller: CadqueryController;

    let statusManager = createStatusManager();
    statusManager.refresh("");

    let libraryManager = createLibraryManager(statusManager);
    libraryManager.refresh();

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
                            validateInput: (text:string) => {
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

                    controller = new CadqueryController(
                        context,
                        port,
                        statusManager
                    );

                    if (controller.isStarted()) {
                        vscode.window.showTextDocument(editor, column);

                        if (port !== 3939) {
                            vscode.window.showWarningMessage(
                                `In Python first call cq_vscode's "set_port(${port})"`
                            );
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
            "cadquery-viewer.installLibrary",
            async (library: Library) => {
                await installLib(libraryManager, library.label);
                if (["cadquery", "build123d"].includes(library.label)) {
                    vscode.window.showInformationMessage(`Depending on your os, the first import of ${library.label} can take several seconds`);
                }
            }
        )
    );

    context.subscriptions.push(
        vscode.commands.registerCommand(
            "cadquery-viewer.downloadExamples",
            async (library: Library) => {
                let root = getCurrentFolder();
                if (root === "") {
                    vscode.window.showInformationMessage("First open a file in your project");
                    return;
                }
                const input = await vscode.window.showInputBox({"prompt": "Select target folder", "value":root});
                if (input === undefined) {
                    return;
                }
                await download(library.getParent(), input);
            }
        )
    );

    context.subscriptions.push(
        vscode.commands.registerCommand(
            "cadquery-viewer.installIPythonExtension",
            async (library: Library) => {
                let reply =
                    (await vscode.window.showQuickPick(["yes", "no"], {
                        placeHolder: `Install the VS Code extension "HoangKimLai.ipython"?`
                    })) || "";
                if (reply === "" || reply === "no") {
                    return;
                }

                vscode.window.showInformationMessage(
                    "Installing VS Code extension 'HoangKimLai.ipython' ..."
                );

                await vscode.commands.executeCommand(
                    "workbench.extensions.installExtension",
                    "HoangKimLai.ipython"
                );

                vscode.window.showInformationMessage(
                    "VS Code extension 'HoangKimLai.ipython' installed"
                );
                statusManager.hasIpythonExtension = true;
                statusManager.refresh(statusManager.port);
            }
        )
    );

    context.subscriptions.push(
        vscode.commands.registerCommand(
            "cadquery-viewer.installPythonModule",
            async () => {
                await installLib(libraryManager, "cq_vscode");
            }
        )
    );

    context.subscriptions.push(
        vscode.commands.registerCommand(
            "cadquery-viewer.pasteSnippet",
            (library: Library) => {
                libraryManager.pasteImport(library.label);
            }
        )
    );

    context.subscriptions.push(
        vscode.commands.registerCommand(
            "cadquery-viewer.ipythonRunCell",
            () => {
                vscode.commands.executeCommand("ipython.runCellAndMoveToNext");
            }
        )
    );

    context.subscriptions.push(
        vscode.commands.registerCommand(
            "cadquery-viewer.refreshLibraries",
            () => libraryManager.refresh()
        )
    );

    context.subscriptions.push(
        vscode.commands.registerCommand(
            "cadquery-viewer.preferences",
            () => vscode.commands.executeCommand("workbench.action.openSettings", "CadQuery Viewer")
        )
    );

    context.subscriptions.push(
        vscode.commands.registerCommand("cadquery-viewer.refreshStatus", () =>
            statusManager.refresh("")
        )
    );

    context.subscriptions.push(
        vscode.commands.registerCommand("cadquery-viewer.openViewer", async () => {
            statusManager.openViewer();
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand(
            "cadquery-viewer.restartIpython",
            async () => {
                let terminals = vscode.window.terminals;
                terminals.forEach((terminal:any) => {
                    if (terminal.name === "IPython") {
                        terminal.dispose();
                    }
                });

                if (!statusManager.hasIpythonExtension) {
                    vscode.window.showErrorMessage(
                        "Extension 'HoangKimLai.ipython' not installed"
                    );
                } else {
                    vscode.commands.executeCommand("ipython.createTerminal");
                }
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

    vscode.workspace.onDidChangeConfiguration((event:any) => {
        let affected = event.affectsConfiguration(
            "python.defaultInterpreterPath"
        );
        if (affected) {
            let pythonPath =
                vscode.workspace.getConfiguration("python")[
                "defaultInterpreterPath"
                ];
            libraryManager.refresh(pythonPath);
            controller.dispose();
            CadqueryViewer.currentPanel?.dispose();
        }
    });

    const extension = vscode.extensions.getExtension('ms-python.python')!;
    await extension.activate();
    extension?.exports.settings.onDidChangeExecutionDetails((event: any) => {
        let pythonPath = extension.exports.settings.getExecutionDetails().execCommand[0];
        libraryManager.refresh(pythonPath);
        controller.dispose();
        CadqueryViewer.currentPanel?.dispose();
    });
}

export function deactivate() {
    output.debug("CadQuery Viewer extension deactivated");
    CadqueryViewer.currentPanel?.dispose();
}

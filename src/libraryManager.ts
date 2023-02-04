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

import * as fs from "fs";
import * as path from "path";
import * as vscode from "vscode";
import { version as cq_vscode_version } from "./version";
import * as output from "./output";
import { getPythonPath, getEditor, inquiry, getWorkspaceRoot } from "./utils";
import { execute } from "./system/shell";
import { StatusManagerProvider } from "./statusManager";
import { TerminalExecute } from "./system/terminal";

const URL =
    "https://github.com/bernhard-42/vscode-cadquery-viewer/releases/download";

function sanitize(lib: string) {
    return lib.replace("-", "_");
}

export async function installLib(
    libraryManager: LibraryManagerProvider,
    library: string
) {
    let managers = libraryManager.getInstallLibMgrs(library);
    let manager: string;
    if (managers.length > 1) {
        manager = await inquiry(
            `Select package manager to install "${library}"`,
            managers
        );
        if (manager === "") {
            return;
        }
    } else {
        manager = managers[0];
    }

    let python = await getPythonPath();
    let reply =
        (await vscode.window.showQuickPick(["yes", "no"], {
            placeHolder: `Use python interpreter "${python}"?`
        })) || "";
    if (reply === "" || reply === "no") {
        return;
    }

    python = await getPythonPath();

    if (python === "python") {
        vscode.window.showErrorMessage("Select Python Interpreter first!");
        return;
    }

    let commands = await libraryManager.getInstallLibCmds(library, manager);

    if (libraryManager.terminal?.terminal === undefined) {
        libraryManager.terminal = new TerminalExecute(
            `Installing ${commands.join(";")} ... `
        );
    }
    await libraryManager.terminal.execute(commands);
    libraryManager.refresh();
}

export class LibraryManagerProvider
    implements vscode.TreeDataProvider<Library>
{
    statusManager: StatusManagerProvider;
    installCommands: any = {};
    codeSnippets: any = {};
    installed: Record<string, string[]> = {};
    terminal: TerminalExecute | undefined;

    constructor(statusManger: StatusManagerProvider) {
        this.statusManager = statusManger;
        this.readConfig();
    }
    
    readConfig() {        
        this.installCommands =
            vscode.workspace.getConfiguration("CadQueryViewer")[
            "installCommands"
            ];
        this.codeSnippets =
            vscode.workspace.getConfiguration("CadQueryViewer")[
            "codeSnippets"
            ];
    }

    private _onDidChangeTreeData: vscode.EventEmitter<
        Library | undefined | null | void
    > = new vscode.EventEmitter<Library | undefined | null | void>();

    readonly onDidChangeTreeData: vscode.Event<
        Library | undefined | null | void
    > = this._onDidChangeTreeData.event;

    async refresh(pythonPath: string | undefined = undefined) {
        this.readConfig();
        await this.findInstalledLibraries(pythonPath);
        this._onDidChangeTreeData.fire();
    }

    addLib(lib: string, manager: string, version: string, path: string) {
        this.installed[lib] = [manager, version, path];
    }

    getInstallLibs() {
        return Object.keys(this.installCommands).sort();
    }

    getInstallLibMgrs(lib: string) {
        let managers = Object.keys(this.installCommands[lib]);
        let filteredManagers: string[] = [];

        managers.forEach((manager: string) => {
            const cwd = getWorkspaceRoot() || ".";
            const poetryLock = fs.existsSync(path.join(cwd, "poetry.lock"));
            if (manager === "poetry" && !poetryLock) {
                // ignore
            } else {
                filteredManagers.push(manager);
            }
        });
        return filteredManagers;
    }

    async getInstallLibCmds(lib: string, manager: string) {
        let commands: string[] = this.installCommands[lib][manager];
        let python = await getPythonPath();
        let substCmds: string[] = [];
        commands.forEach((command: string) => {
            if (lib === "cq_vscode") {
                command = command.replace("{cq_vscode_version}", cq_vscode_version);
            };

            if (manager === "pip") {
                substCmds.push(
                    command.replace("{python}", python)
                );

            } else if (manager === "conda" || manager === "mamba") {
                let paths = python.split(path.sep);
                let env = paths[paths.length - 3];
                substCmds.push(
                    command.replace("{conda_env}", env)
                );
            } else {
                substCmds.push(command);
            }
        });
        return substCmds;
    }

    async findInstalledLibraries(pythonPath: string | undefined) {
        let installLibs = this.getInstallLibs();
        let python: string;
        if (pythonPath === undefined) {
            python = await getPythonPath();
        } else {
            python = pythonPath;
        }

        this.installed = {};

        try {
            let command = `${python} -m pip list -v --format json`;
            let allLibs = execute(command);
            let libs = JSON.parse(allLibs);
            libs.forEach((lib: any) => {
                if (installLibs.includes(sanitize(lib["name"]))) {
                    let editablePath = lib["editable_project_location"];
                    this.installed[sanitize(lib["name"])] = [
                        lib["version"],
                        lib["installer"],
                        editablePath === undefined
                            ? lib["location"]
                            : editablePath,
                        editablePath !== undefined
                    ];
                }
            });
        } catch (error: any) {
            vscode.window.showErrorMessage(error.message);
        }
    }

    getImportLibs() {
        return Object.keys(this.codeSnippets);
    }

    getImportLibCmds(lib: string) {
        return this.codeSnippets[lib];
    }

    pasteImport(library: string) {
        const editor = getEditor();
        if (editor !== undefined) {
            if ((library === "cq_vscode") && (this.statusManager.getPort() === "")) {
                vscode.window.showErrorMessage("Cadquery viewer not running");
            } else {
                let importCmd = Object.assign([], this.codeSnippets[library]);
                if (library === "cq_vscode") {
                    importCmd.push(`set_port(${this.statusManager.getPort()})`);
                }
                let snippet = new vscode.SnippetString(importCmd.join("\n") + "\n");
                editor?.insertSnippet(snippet);
            }
        } else {
            vscode.window.showErrorMessage("No editor open");
        }
    }

    getTreeItem(element: Library): vscode.TreeItem {
        return element;
    }

    getChildren(element?: Library): Thenable<Library[]> {
        if (element) {
            if (Object.keys(this.installed).includes(element.label)) {
                let editable = this.installed[element.label][3];
                let manager = editable
                    ? "n/a"
                    : this.installed[element.label][1];
                let location = this.installed[element.label][2];
                let p = location.split(path.sep);
                let env = editable ? location : p[p.length - 4];

                let libs: Library[] = [];
                libs.push(
                    new Library(
                        "installer",
                        { "installer": manager },
                        vscode.TreeItemCollapsibleState.None
                    )
                );
                libs.push(
                    new Library(
                        "environment",
                        { "location": location, "env": env },
                        vscode.TreeItemCollapsibleState.None
                    )
                );
                libs.push(
                    new Library(
                        "editable",
                        { "editable": editable },
                        vscode.TreeItemCollapsibleState.None
                    )
                );
                return Promise.resolve(libs);
            } else {
                return Promise.resolve([]);
            }
        } else {
            let libs: Library[] = [];
            this.getInstallLibs().forEach((lib: string) => {
                let installed = Object.keys(this.installed).includes(lib);

                let version = installed
                    ? this.installed[sanitize(lib)][0]
                    : "n/a";

                let state = installed
                    ? vscode.TreeItemCollapsibleState.Expanded
                    : vscode.TreeItemCollapsibleState.None;

                libs.push(new Library(lib, { "version": version }, state));

                if (lib === "cq_vscode") {
                    this.statusManager.installed = version !== "n/a";
                    this.statusManager.setLibraries(
                        Object.keys(this.installed)
                    );
                    this.statusManager.refresh(this.statusManager.getPort());
                }
            });

            return Promise.resolve(libs);
        }
    }
}

export class Library extends vscode.TreeItem {
    constructor(
        public readonly label: string,
        private options: Record<string, string>,
        public readonly collapsibleState: vscode.TreeItemCollapsibleState
    ) {
        super(label, collapsibleState);

        if (options.version !== undefined) {
            this.tooltip = `${this.label}-${options.version}`;
            this.description = options.version;
            this.contextValue = "library";
        } else if (options.installer !== undefined) {
            this.tooltip = options.installer;
            this.description = options.installer;
        } else if (options.location !== undefined) {
            this.tooltip = options.location;
            this.description = options.env;
        } else if (options.editable !== undefined) {
            this.tooltip = options.editable ? "editable" : "non-editable";
            this.description = options.editable.toString();
        }
    }
}

export function createLibraryManager(statusManager: StatusManagerProvider) {
    const libraryManager = new LibraryManagerProvider(statusManager);
    vscode.window.registerTreeDataProvider("cadquerySetup", libraryManager);
    vscode.window.createTreeView("cadquerySetup", {
        treeDataProvider: libraryManager
    });

    output.info("Successfully registered CadqueryViewer Library Manager");

    return libraryManager;
}

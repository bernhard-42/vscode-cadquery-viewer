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
    library: Library
) {
    let managers = libraryManager.getInstallLibMgrs(library.label);
    let manager: string;
    if (managers.length > 1) {
        manager = await inquiry(
            `Select package manager to install "${library.label}"`,
            managers
        );
        if (manager === "") {
            return;
        }
    } else {
        manager = managers[0];
    }

    let commands = libraryManager.getInstallLibCmds(library.label, manager);

    let python = await getPythonPath();
    let reply =
        (await vscode.window.showQuickPick(["yes", "no"], {
            placeHolder: `Use python interpreter "${python}"?`
        })) || "";
    if (reply === "") {
        return;
    }

    if (python === "python" || reply === "no") {
        vscode.window.showErrorMessage("Select Python Interpreter first!");
        return;
    }

    let patchedCommands: string[] = [];
    commands.forEach((command) => {
        if (manager === "pip") {
            patchedCommands.push(
                command.replace("pip install ", `${python} -m pip install `)
            );
        } else if (manager === "conda" || manager === "mamba") {
            let paths = python.split(path.sep);
            let env = paths[paths.length - 3];
            patchedCommands.push(
                command.replace(` install `, ` install -y -n ${env} `)
            );
        }
    });

    let terminal = new TerminalExecute(
        `Installing ${patchedCommands.join(";")} ... `
    );
    await terminal.execute(patchedCommands);
    libraryManager.refresh();
}

export class LibraryManagerProvider
    implements vscode.TreeDataProvider<Library>
{
    statusManager: StatusManagerProvider;
    installCommands: any = {};
    codeSnippets: any = {};
    installed: Record<string, string[]> = {};

    constructor(statusManger: StatusManagerProvider) {
        this.statusManager = statusManger;
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

    getInstallLibCmds(lib: string, mgr: string) {
        let cmds: string[] = this.installCommands[lib][mgr];
        if (lib === "cq_vscode") {
            let substCmds: string[] = [];
            cmds.forEach((cmd: string) => {
                substCmds.push(cmd.replace("{version}", cq_vscode_version));
            });
            return substCmds;
        } else {
            return cmds;
        }
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
            let importCmd = Object.assign([], this.codeSnippets[library]);
            if (library === "cq_vscode") {
                importCmd.push(`set_port(${this.statusManager.port})`);
            }
            let snippet = new vscode.SnippetString(importCmd.join("\n") + "\n");
            editor?.insertSnippet(snippet);
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
                        "",
                        manager,
                        "",
                        "",
                        "",
                        vscode.TreeItemCollapsibleState.None
                    )
                );
                libs.push(
                    new Library(
                        "environment",
                        "",
                        "",
                        location,
                        env,
                        "",
                        vscode.TreeItemCollapsibleState.None
                    )
                );
                libs.push(
                    new Library(
                        "editable",
                        "",
                        "",
                        "",
                        "",
                        editable,
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
                libs.push(new Library(lib, version, "", "", "", "", state));
                if (lib === "cq_vscode") {
                    this.statusManager.installed = version !== "n/a";
                    this.statusManager.setLibraries(
                        Object.keys(this.installed)
                    );
                    this.statusManager.refresh("");
                }
            });

            return Promise.resolve(libs);
        }
    }
}

export class Library extends vscode.TreeItem {
    constructor(
        public readonly label: string,
        private version: string,
        private installer: string,
        private location: string,
        private env: string,
        private editable: string,
        public readonly collapsibleState: vscode.TreeItemCollapsibleState
    ) {
        super(label, collapsibleState);

        if (version !== "") {
            this.tooltip = `${this.label}-${this.version}`;
            this.description = this.version;
            this.contextValue = "library";
        } else if (installer !== "") {
            this.tooltip = this.installer;
            this.description = this.installer;
        } else if (location !== "") {
            this.tooltip = this.location;
            this.description = env;
        } else if (editable !== "") {
            this.tooltip = editable ? "editable" : "non-editable";
            this.description = this.editable.toString();
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

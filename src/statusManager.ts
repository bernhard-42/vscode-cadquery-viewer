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
import { version as cq_vscode_version } from "./version";
import * as output from "./output";
import { ipythonExtensionInstalled } from "./utils";

const URL =
    "https://github.com/bernhard-42/vscode-cadquery-viewer/releases/download";

export class StatusManagerProvider implements vscode.TreeDataProvider<Status> {
    installed: boolean = false;
    libraries: string[] = [];
    running: boolean = false;
    port: string = "";
    version: string = "";
    hasIpythonExtension: boolean = false;

    constructor() {
        this.version = cq_vscode_version;
        this.hasIpythonExtension = ipythonExtensionInstalled();
    }

    private _onDidChangeTreeData: vscode.EventEmitter<
        Status | undefined | null | void
    > = new vscode.EventEmitter<Status | undefined | null | void>();

    readonly onDidChangeTreeData: vscode.Event<
        Status | undefined | null | void
    > = this._onDidChangeTreeData.event;

    async refresh(port: string) {
        if (port !== "") {
            this.port = port;
            this.running = true;
        } else {
            this.running = false;
            this.port = "";
        }
        this._onDidChangeTreeData.fire();
    }

    getPort() {
        return this.port;
    }

    setLibraries(libraries: string[]) {
        this.libraries = Object.assign([], libraries);
    }

    getTreeItem(element: Status): vscode.TreeItem {
        return element;
    }

    getChildren(element?: Status): Thenable<Status[]> {
        if (element) {
            let status: Status[] = [];
            if (element.label === "cq_vscode") {
                status.push(
                    new Status(
                        "port",
                        { "port": this.port },
                        vscode.TreeItemCollapsibleState.None
                    )
                );
            } else if (element.label === "ipython") {
                status.push(
                    new Status(
                        "extension",
                        {
                            "extension": (this.hasIpythonExtension) ? "installed" : "not installed",
                            "ipython": this.hasIpythonExtension
                        },
                        vscode.TreeItemCollapsibleState.None
                    )
                );
            }
            return Promise.resolve(status);
        } else {
            let status: Status[] = [];
            if (this.installed) {
                let state = this.running
                    ? vscode.TreeItemCollapsibleState.Expanded
                    : vscode.TreeItemCollapsibleState.None;
                status.push(
                    new Status(
                        "cq_vscode",
                        { "running": this.running ? "RUNNING" : "STOPPED" },
                        state
                    )
                );
                this.libraries.sort().forEach((lib) => {
                    if (lib !== "cq_vscode") {
                        status.push(
                            new Status(
                                lib,
                                { "ipython": this.hasIpythonExtension },
                                (lib === "ipython")
                                    ? vscode.TreeItemCollapsibleState.Expanded
                                    : vscode.TreeItemCollapsibleState.None
                            )
                        );
                    }
                });
            }
            return Promise.resolve(status);
        }
    }

    async openViewer() {
        await vscode.commands.executeCommand("cadquery-viewer.cadqueryViewer");
    }
}

export class Status extends vscode.TreeItem {
    constructor(
        public readonly label: string,
        private options: Record<string, string | boolean>,
        public readonly collapsibleState: vscode.TreeItemCollapsibleState
    ) {
        super(label, collapsibleState);
        if (label === "cq_vscode") {
            this.contextValue = "status";

        } else if (label === "ipython") {
            this.contextValue = options.ipython ? "open" : "missing";

        } else {
            this.contextValue = "library";
        }

        if (options.running !== undefined) {
            this.description = options.running;
            this.tooltip =
                options.running === "RUNNING"
                    ? "CadQuery Viewer is running"
                    : "CadQuery Viewer is stopped";

        } else if (options.port !== undefined) {
            this.contextValue = "port";
            this.description = options.port;
            this.tooltip = `CadQuery viewer is listening on port ${options.port}`;

        } else if (options.extension !== undefined) {
            this.contextValue = options.ipython ? "ipythonExtInstalled" : "ipythonExtMissing";
            this.description = options.extension;
            this.tooltip = `IPython extension is ${options.extension}`;
        }
    }
}

export function createStatusManager() {
    const statusManager = new StatusManagerProvider();
    vscode.window.registerTreeDataProvider("cadqueryStatus", statusManager);
    vscode.window.createTreeView("cadqueryStatus", {
        treeDataProvider: statusManager
    });

    output.info("Successfully registered CadqueryViewer Status Manager");

    return statusManager;
}

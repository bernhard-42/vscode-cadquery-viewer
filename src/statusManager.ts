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

const URL =
    "https://github.com/bernhard-42/vscode-cadquery-viewer/releases/download";

export class StatusManagerProvider implements vscode.TreeDataProvider<Status> {
    installed: boolean = false;
    libraries: string[] = [];
    running: boolean = false;
    port: string = "3939";
    version: string = "";

    constructor() {
        this.version = cq_vscode_version;
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
        }
        this._onDidChangeTreeData.fire();
    }
    
    setLibraries(libraries:string[]) {
        this.libraries = Object.assign([], libraries);
    }

    getTreeItem(element: Status): vscode.TreeItem {
        return element;
    }

    getChildren(element?: Status): Thenable<Status[]> {
        if (element) {
            let status: Status[] = [];
            status.push(
                new Status(
                    "port",
                    "",
                    this.port,
                    vscode.TreeItemCollapsibleState.None
                )
            );
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
                        this.running ? "RUNNING" : "STOPPED",
                        "",
                        state
                    )
                );
                this.libraries.forEach((lib) => {
                    status.push(
                        new Status(
                            lib,
                            "",
                            "",
                            vscode.TreeItemCollapsibleState.None
                        )
                    );
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
        private running: string,
        private port: string,
        public readonly collapsibleState: vscode.TreeItemCollapsibleState
    ) {
        super(label, collapsibleState);

        if (running !== "") {
            this.contextValue = "status";
            this.description = this.running;
            this.tooltip =
                this.running === "RUNNING"
                    ? "CadQuery Viewer is running"
                    : "CadQuery Viewer is stopped";
        } else if (port !== "") {
            this.contextValue = "port";
            this.tooltip = this.port;
            this.description = this.port;
        } else {
            this.contextValue = "library";
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

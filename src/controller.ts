/* eslint-disable @typescript-eslint/naming-convention */
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
import { CadqueryViewer } from "./viewer";
import { template } from "./display";
import { createServer, IncomingMessage, Server, ServerResponse } from "http";
import * as output from "./output";
import { logo } from "./logo";
import { StatusManagerProvider } from "./statusManager";

var serverStarted = false;

function decode(data: any) {
    function convert(obj: any) {
        let fa = new Float32Array(Uint8Array.from(Buffer.from(obj.buffer, 'hex')).buffer);
        return Array.from(fa);
    }

    function walk(obj: any) {
        var type = null;
        for (var attr in obj) {
            if (attr === "parts") {
                for (var i in obj.parts) {
                    walk(obj.parts[i]);
                }

            } else if (attr === "type") {
                type = obj.type;

            } else if (attr === "shape") {
                if (type === "shapes") {
                    if (obj.shape.ref === undefined) {
                        obj.shape.vertices = convert(obj.shape.vertices);
                        obj.shape.normals = convert(obj.shape.normals);
                        obj.shape.edges = convert(obj.shape.edges);
                    }
                } else {
                    obj.shape = convert(obj.shape);
                }
            }
        }
    }
    data.data.instances.forEach((instance: any) => {
        instance.vertices = convert(instance.vertices);
        instance.normals = convert(instance.normals);
        instance.edges = convert(instance.edges);
        instance.triangles = Uint32Array.from(instance.triangles);
    });
    walk(data.data.shapes);
}


export class CadqueryController {
    server: Server | undefined;
    statusController: StatusManagerProvider;
    view: vscode.Webview | undefined;
    port: number;

    constructor(
        private context: vscode.ExtensionContext,
        port: number,
        statusController: StatusManagerProvider
    ) {
        this.port = port;
        this.statusController = statusController;

        if (!serverStarted) {
            if (this.startCommandServer(this.port)) {
                output.info("Starting web server ...");
                serverStarted = true;
                CadqueryViewer.createOrShow(this.context.extensionUri, this);
                CadqueryViewer.currentPanel?.update(template());

                let panel = CadqueryViewer.currentPanel;
                this.view = panel?.getView();
            }
        }
    }

    public isStarted(): boolean {
        return serverStarted;
    }

    public logo() {
        var data = JSON.parse(logo);
        this.view?.postMessage(data);
    }

    public startCommandServer(port: number): boolean {
        this.server = createServer(
            (req: IncomingMessage, res: ServerResponse) => {
                let response = "";
                if (req.method === "GET") {
                    response = "Only POST supported\n";
                    res.writeHead(200, {
                        "Content-Length": response.length,
                        "Content-Type": "text/plain"
                    });
                    res.end(response);
                } else if (req.method === "POST") {
                    var json = "";
                    req.on("data", (chunk: string) => {
                        json += chunk;
                    });

                    req.on("end", () => {
                        output.debug("Received a new model");
                        var data = JSON.parse(json);
                        if (data.type === "data") {
                            decode(data);
                        }
                        this.view?.postMessage(data);
                        output.debug("Posted model to view");
                        response = "done";

                        res.writeHead(201, { "Content-Type": "text/plain" });
                        res.end(response);
                    });
                }
            }
        );
        this.server.on("error", (error) => {
            let msg = "";
            if (error.message.indexOf("EADDRINUSE") > 0) {
                output.info(
                    `Port ${this.port} alread in use, please choose another port`
                );
            } else {
                vscode.window.showErrorMessage(`${error}`);
            }
        });
        this.server.on("listening", () => {
            output.info(
                `CadQuery Viewer is initialized, command server is running on port ${this.port}`
            );
        });
        this.server.listen(port);
        return this.server.address() !== null;
    }

    public dispose() {
        output.debug("CadqueryController dispose");

        this.server?.close();
        serverStarted = false;
        output.info("Server is shut down");
        this.statusController.refresh("<none>");
    }
}

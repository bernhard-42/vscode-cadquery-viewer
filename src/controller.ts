/* eslint-disable @typescript-eslint/naming-convention */
import * as vscode from 'vscode';
import { CadqueryViewer } from './viewer';
import { template } from "./display";
import { createServer, IncomingMessage, Server, ServerResponse } from "http";

var serverStarted = false;

export class CadqueryController {
    server: Server | undefined;
    view: vscode.Webview | undefined;

    constructor(private context: vscode.ExtensionContext) {
        CadqueryViewer.createOrShow(this.context.extensionUri, this);
        let panel = CadqueryViewer.currentPanel;
        this.view = panel?.getView();

        CadqueryViewer.currentPanel?.update(template());

        if (!serverStarted) {
            this.startCommandServer();
            serverStarted = true;
        }
    }

    public startCommandServer() {
        this.server = createServer((req: IncomingMessage, res: ServerResponse) => {
            let response = "";
            if (req.method === "GET") {

                response = 'Only POST supported\n';
                res.writeHead(200, { "Content-Length": response.length, "Content-Type": "text/plain" });
                res.end(response);

            } else if (req.method === "POST") {

                var data = "";
                req.on("data", (chunk) => {
                    data += chunk;
                });

                req.on("end", () => {
                    this.view?.postMessage(data);
                    response = data.length.toString();

                    res.writeHead(201, { "Content-Type": "text/plain" });
                    res.end(response);
                });
            }
            }
        );
        try {
            this.server.listen(3939);
            console.log(
                "CadQuery Viewer is initialized, command server is running on port 3939"
            );
        } catch (error: any) {
            vscode.window.showErrorMessage(error.toString());
        }
    }

    public dispose() {
        console.log("CadqueryController dispose");

        this.server?.close();
        serverStarted = false;
        console.log("Server is shut down");
    }
}
}
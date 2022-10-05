/* eslint-disable @typescript-eslint/naming-convention */
import * as vscode from "vscode";
import { CadqueryViewer } from "./viewer";
import { template } from "./display";
import { createServer, IncomingMessage, Server, ServerResponse } from "http";
import * as output from './Output';

var serverStarted = false;

export class CadqueryController {
    server: Server | undefined;
    view: vscode.Webview | undefined;
    terminal: vscode.Terminal | undefined;

    constructor(private context: vscode.ExtensionContext, terminal: vscode.Terminal) {
        CadqueryViewer.createOrShow(this.context.extensionUri, this);
        let panel = CadqueryViewer.currentPanel;
        this.view = panel?.getView();
        this.terminal = terminal;

        CadqueryViewer.currentPanel?.update(template());

        if (!serverStarted) {
            output.info("Starting web server ...")
            this.startCommandServer();
            serverStarted = true;
        }
    }

    public startCommandServer() {
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
                    var data = "";
                    req.on("data", (chunk) => {
                        data += chunk;
                    });

                    req.on("end", () => {
                        output.debug("Received a new model");
                        this.view?.postMessage(data);
                        output.debug("Posted model to view");
                        response = data.length.toString();

                        res.writeHead(201, { "Content-Type": "text/plain" });
                        res.end(response);
                    });
                }
            }
        );
        try {
            this.server.listen(3939);
            output.info(
                "CadQuery Viewer is initialized, command server is running on port 3939"
            );
        } catch (error: any) {
            vscode.window.showErrorMessage(error.toString());
        }
    }

    public dispose() {
        output.debug("CadqueryController dispose");

        this.server?.close();
        serverStarted = false;
        output.info("Server is shut down");

        this.terminal?.dispose();
        output.info("Installation terminal is disposed");
    }
}

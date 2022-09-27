import * as vscode from 'vscode';
import { CadqueryViewer } from './viewer';
import { template } from "./display";
import { createServer, IncomingMessage, Server, ServerResponse } from "http";

export class CadqueryController {
    server: any = undefined;

    constructor(private context: vscode.ExtensionContext) {
        console.log("CadqueryController activated");

        CadqueryViewer.createOrShow(this.context.extensionUri, this);
        let panel = CadqueryViewer.currentPanel;
        let view = panel?.getView();
        
        CadqueryViewer.currentPanel?.update(template({}));
        
        this.server = createServer(function (req: IncomingMessage, res: ServerResponse) {
            let response = "";
            if (req.method === "GET") {

                response = 'Only POST supported\n';
                var contentLength = response.length;
                // eslint-disable-next-line @typescript-eslint/naming-convention
                res.writeHead(200, { "Content-Length": contentLength, "Content-Type": "text/plain" });
                res.end(response);

            } else if (req.method === "POST") {

                var body = "";
                req.on("data", function (chunk) {
                    body += chunk;
                });

                req.on("end", function () {
                    view?.postMessage(body);
                    response = body.length.toString();
                    // eslint-disable-next-line @typescript-eslint/naming-convention
                    res.writeHead(201, { "Content-Type": "text/plain" });
                    res.end(response);
                });
            }

        });
        this.server.listen(3939);
        
        console.log('Server is running on port 3939');
    };

    public dispose() {
        console.log("CadqueryController dispose");
        this.server.close();
        console.log('Server is shut down');
    }
}
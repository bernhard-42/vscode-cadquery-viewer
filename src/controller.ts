import * as vscode from 'vscode';
import { CadqueryViewer } from './viewer';
import { template } from "./display";
import { createServer, IncomingMessage, ServerResponse } from "http";

export class CadqueryController {

    constructor(private context: vscode.ExtensionContext) {
        console.log("CadqueryController activated");

        CadqueryViewer.createOrShow(this.context.extensionUri);
        let panel = CadqueryViewer.currentPanel;
        let view = panel?.getView();

        let html = template(800, 600);
        CadqueryViewer.currentPanel?.update(html);
        CadqueryViewer.currentPanel?.getView().postMessage({ command: 'refactor' });

        var server = createServer(function (req: IncomingMessage, res: ServerResponse) {
            let response = "";
            if (req.method === "GET") {

                response = 'Amazing lightweight webserver using node.js\n';
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
        server.listen(3939);

        console.log('Server is running on port 3939');
    };
}
import * as vscode from 'vscode';
import { template } from "./display";

export class CadqueryViewer {
    /**
     * Track the currently panel. Only allow a single panel to exist at a time.
     */

    public static currentPanel: CadqueryViewer | undefined;

    public static readonly viewType = 'cadqueryViewer';

    private readonly _panel: vscode.WebviewPanel;
    private _disposables: vscode.Disposable[] = [];

    public static createOrShow(extensionUri: vscode.Uri) {
        // If we already have a panel, show it.
        if (CadqueryViewer.currentPanel) {
            CadqueryViewer.currentPanel._panel.reveal(vscode.ViewColumn.Two);
        } else {
            // Otherwise, create a new panel.
            const panel = vscode.window.createWebviewPanel(
                CadqueryViewer.viewType,
                'CadQuery Viewer',
                vscode.ViewColumn.Two,
                { enableScripts: true },
            );
            CadqueryViewer.currentPanel = new CadqueryViewer(panel, extensionUri);
        }
    }

    public static revive(panel: vscode.WebviewPanel, extensionUri: vscode.Uri) {
        CadqueryViewer.currentPanel = new CadqueryViewer(panel, extensionUri);
    }

    private constructor(panel: vscode.WebviewPanel, extensionUri: vscode.Uri) {
        this._panel = panel;
        // Set the webview's initial html content
        this.update("");

        this._panel.onDidDispose(() => this.dispose(), null, this._disposables);

        // Update the content based on view changes
        this._panel.onDidChangeViewState(
            e => {
                if (this._panel.visible) {
                    this.update(template(800, 600));
                }
            },
            null,
            this._disposables
        );

        // Handle messages from the webview
        this._panel.webview.onDidReceiveMessage(
            message => {
                switch (message.command) {
                    case 'alert':
                        vscode.window.showErrorMessage(message.text);
                        return;
                }
            },
            null,
            this._disposables
        );
    }

    public dispose() {
        CadqueryViewer.currentPanel = undefined;

        // Clean up our resources
        this._panel.dispose();

        while (this._disposables.length) {
            const x = this._disposables.pop();
            if (x) {
                x.dispose();
            }
        }
    }

    public update(div: string) {
        if (div !== "") {
            const webview = this._panel.webview;
            this._panel.title = "CadQuery Viewer";
            webview.html = div;
        }
    }

    public getView() {
        return this._panel.webview;
    }
}

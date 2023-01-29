import * as vscode from "vscode";
import { spawn } from "child_process";
import * as output from "../output";
import { getWorkspaceRoot } from "../utils";

export class TerminalExecute {
    writeEmitter = new vscode.EventEmitter<string>();
    terminal: vscode.Terminal;
    workspaceFolder: string | undefined;
    errorMsg: string = "";
    stdout: string = "";

    constructor(msg: string) {
        let pty = {
            onDidWrite: this.writeEmitter.event,
            open: () => this.writeEmitter.fire(msg + "\r\n\r\n"),
            close: () => {
                /* noop*/
            },
            handleInput: (data: string) => {
                let charCode = data.charCodeAt(0);
                
                if (data === "\r") {
                    this.writeEmitter.fire("\r\n\r\n");
                } else if (charCode < 32) {
                    this.writeEmitter.fire(
                        `^${String.fromCharCode(charCode + 64)}`
                    );
                    if (charCode === 3) {
                        // this.killProcess();
                    }
                } else {
                    data = data.replace("\r", "\r\n");
                    this.writeEmitter.fire(`${data}`);
                }
            }
        };
        this.terminal = vscode.window.createTerminal({
            name: "CadQuery Viewer Terminal",
            pty
        });
        this.workspaceFolder = getWorkspaceRoot() || ".";
    }

    async execute(commands: string[]): Promise<string> {
        this.terminal.show();
        this.stdout = "";
        return new Promise((resolve, reject) => {
            let command = commands.join("; ");
            const child = spawn(command, {
                stdio: "pipe",
                shell: true,
                cwd: this.workspaceFolder
            });
            child.stderr.setEncoding("utf8");
            child.stdout?.on("data", (data) => {
                this.stdout += data.toString();
                this.print(data.toString());
            });
            child.stderr?.on("data", (data) => {
                this.errorMsg = data.toString();
                this.print(this.errorMsg);
            });
            child.on("exit", (code, signal) => {
                if (code === 0) {
                    this.print(`Successfully executed '${command}`);
                    vscode.window.showInformationMessage(
                        `Successfully executed '${command}'`
                    );
                    resolve(this.stdout);
                } else {
                    vscode.window.showErrorMessage(
                        `Failed to execute '${command}(${code})'`
                    );
                    // vscode.window.showErrorMessage(this.errorMsg);
                    reject(new Error(code?.toString()));
                }
            });
        });
    }

    print(msg: string) {
        for (let line of msg.split(/\r?\n/)) {
            this.writeEmitter.fire(line + "\r\n");
        }
    }
}

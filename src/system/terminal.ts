import * as vscode from 'vscode';
import { spawn } from 'child_process';
import * as output from '../output';
import { getWorkspaceRoot } from '../utils';

export class TerminalExecute {
    writeEmitter = new vscode.EventEmitter<string>();
    terminal: vscode.Terminal;
    workspaceFolder: string | undefined;
    errorMsg: string = "";

    constructor(msg: string) {
        let pty = {
            onDidWrite: this.writeEmitter.event,
            open: () => this.writeEmitter.fire(msg + '\r\n\r\n'),
            close: () => { /* noop*/ },
        };
        this.terminal = vscode.window.createTerminal({ name: "CadQuery Viewer Terminal", pty });

        this.workspaceFolder = getWorkspaceRoot() || ".";
    }

    async execute(commands: string[]): Promise<void> {
        this.terminal.show();
        return new Promise((resolve, reject) => {

            let command = commands.join("; ");
            const child = spawn(command, {
                stdio: 'pipe', shell: true, cwd: this.workspaceFolder
            });
            child.stdout?.on('data', data => {
                this.print(data.toString());
            });
            child.stderr?.on('data', data => {
                this.errorMsg = data.toString();
                this.print(this.errorMsg);
            });
            child.on('exit', (code, signal) => {
                if (code === 0) {
                    this.print(`Successfully executed '${command}`);
                    vscode.window.showInformationMessage(`Successfully executed '${command}`);
                    resolve();
                } else {
                    vscode.window.showErrorMessage(`Failed to execute '${command}(${code})`);
                    vscode.window.showErrorMessage(this.errorMsg);
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
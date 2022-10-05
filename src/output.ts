import * as vscode from 'vscode';

class OutputTerminal {
    writeEmitter = new vscode.EventEmitter<string>();
    terminal: vscode.Terminal;

    constructor(msg: string) {
        let pty = {
            onDidWrite: this.writeEmitter.event,
            open: () => this.writeEmitter.fire(msg + '\r\n\r\n'),
            close: () => { /* noop*/ },
        };
        this.terminal = vscode.window.createTerminal({ name: "CadQuery Viewer Output", pty });
    }

    write(line: string) {
        this.writeEmitter.fire(line);
    }

    show(flag: boolean) {
        if (flag) {
            this.terminal.show();
        } else {
            this.terminal.hide();
        }
    }
}

let output: OutputTerminal | undefined = undefined;

const log = vscode.window.createOutputChannel("CadQuery Viewer Log");

function getPrefix(logLevel?: string) {
    let timestamp = "";
    let level = "";
    if (logLevel) {
        const d = new Date();
        timestamp = `${d.toLocaleTimeString()}.${d.getMilliseconds().toString().padStart(3, '0')}} `;
        level = `${logLevel} `;
    }

    return `[${timestamp}${level}] `;
}

// export function create() {
//     output = new OutputTerminal("Welcome to the CadQuery Viewer for Visual Studio Code");
// }

export function show() {
    if (output) {
        output.show(true);
    }
}

// export function write(msg: string, withPrefix: boolean = false) {
//     if (output) {
//         if (withPrefix) {
//             const prefix = getPrefix();
//             output.write(prefix + msg);
//         } else {
//             output.write(msg);
//         }
//     }
// }

// export function writeln(msg: string, withPrefix: boolean = true) {
//     write(msg + "\r\n", withPrefix);
// }

// export function thinBorder() {
//     writeln("⋅⋅⋅⋅⋅⋅⋅⋅⋅⋅⋅⋅⋅⋅⋅⋅⋅⋅⋅⋅⋅⋅⋅⋅⋅⋅⋅⋅⋅⋅⋅⋅⋅⋅⋅⋅⋅⋅⋅⋅⋅⋅⋅⋅⋅⋅⋅⋅");
// }
// export function thickBorder() {
//     writeln("================================================");
// }

export function info(msg: string) {
    const prefix = getPrefix("INFO ");
    log.appendLine(prefix + msg);
}

export function error(msg: string) {
    const prefix = getPrefix("ERROR");
    log.appendLine(prefix + msg);
}

export function debug(msg: string) {
    const prefix = getPrefix("DEBUG");
    log.appendLine(prefix + msg);
}
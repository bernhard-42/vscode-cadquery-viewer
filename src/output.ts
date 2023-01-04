import * as vscode from 'vscode';

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

export function show() {
    log.show(true);
}

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
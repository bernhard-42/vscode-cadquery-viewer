import * as vscode from 'vscode';
import * as fs from "fs";
import * as path from "path";

export function getEditor() {
    const editor = vscode.window.activeTextEditor;
    if (editor === undefined) {
        vscode.window.showErrorMessage("No editor window open or in focus");
    }
    return editor;
}

export function getCurrentFilename() {
    const editor = getEditor();
    if (editor) {
        return editor.document.fileName;
    }
    return;
}

export function getWorkspaceRoot() {
    let filename = getCurrentFilename();
    if (filename) {
        return vscode.workspace.getWorkspaceFolder(vscode.Uri.file(filename))?.uri.fsPath;
    }
    return;
}

export async function inquiry(placeholder: string, options: string[]) {
    const answer = await vscode.window.showQuickPick(options, {
        placeHolder: placeholder
    });
    return answer || "";
}

class PythonPath {
    public static async getPythonPath(document?: vscode.TextDocument): Promise<string> {
        try {
            const extension = vscode.extensions.getExtension("ms-python.python");
            if (!extension) {
                return "python";
            }
            const usingNewInterpreterStorage = extension.packageJSON?.featureFlags?.usingNewInterpreterStorage;
            if (usingNewInterpreterStorage) {
                if (!extension.isActive) {
                    await extension.activate();
                }
                const pythonPath = extension.exports.settings.getExecutionDetails().execCommand[0];
                return pythonPath;
            } else {
                return this.getConfiguration("python", document).get<string>("pythonPath") || "";
            }
        } catch (error) {
            return "python";
        }
    }

    public static getConfiguration(section?: string, document?: vscode.TextDocument): vscode.WorkspaceConfiguration {
        if (document) {
            return vscode.workspace.getConfiguration(section, document.uri);
        } else {
            return vscode.workspace.getConfiguration(section);
        }
    }
}

export function getPythonPath() {
    let editor = getEditor();
    return PythonPath.getPythonPath(editor?.document);
}

export function getPackageManager() {
    let cwd = getWorkspaceRoot() || ".";
    return fs.existsSync(path.join(cwd, "poetry.lock")) ? "poetry" : "pip";
}
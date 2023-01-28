import * as vscode from 'vscode';
import { version as cq_vscode_version } from "./version";
import * as output from './output';
import { getPackageManager, getPythonPath } from './utils';
import { execute } from "./system/shell";
import * as path from "path";

const URL = "https://github.com/bernhard-42/vscode-cadquery-viewer/releases/download";

export class LibraryManagerProvider implements vscode.TreeDataProvider<Library> {
  installCommands: any = {};
  importCommands: any = {};
  installed: Record<string, string[]> = {};

  constructor() {
    this.installCommands = vscode.workspace.getConfiguration("CadQueryViewer")["installCommands"];
    this.importCommands = vscode.workspace.getConfiguration("CadQueryViewer")["importCommands"];
  }

  private _onDidChangeTreeData: vscode.EventEmitter<Library | undefined | null | void> = new vscode.EventEmitter<Library | undefined | null | void>();
  readonly onDidChangeTreeData: vscode.Event<Library | undefined | null | void> = this._onDidChangeTreeData.event;

  async refresh(manager: string) {
    await this.getLibVersions(manager);
    this._onDidChangeTreeData.fire();
  }

  addLib(lib: string, manager: string, version: string, path: string) {
    this.installed[lib] = [manager, version, path];
  }

  getInstallLibs() {
    return Object.keys(this.installCommands);
  }

  getInstallLibMgrs(lib: string) {
    return Object.keys(this.installCommands[lib]);
  }

  getInstallLibCmds(lib: string, mgr: string) {
    let cmds: string[] = this.installCommands[lib][mgr];
    if (lib === "cq_vscode") {
      let substCmds: string[] = [];
      cmds.forEach((cmd: string) => {
        substCmds.push(cmd.replace(
          "{cq_vscode_url}",
          `${URL}/v${cq_vscode_version}/cq_vscode-${cq_vscode_version}-py3-none-any.whl`)
        );
      });
      return substCmds;
    } else {
      return cmds;
    }
  }

  async getLibVersions(manager: string) {
    let installLibs = this.getInstallLibs();
    let python = await getPythonPath();
    let p = python.split(path.sep);
    if (manager === "") {
      manager = getPackageManager();
    }

    this.installed = {};

    try {
      let command = "pip list --format json";
      if (manager === "pip") {
        command = `${python} -m ${command}`;
      } else {
        command = `poetry run ${command}`;
      }
      let allLibs = execute(command);
      let libs = JSON.parse(allLibs);
      libs.forEach((lib: any) => {
        if (installLibs.includes(lib["name"].replace("-", "_"))) {
          this.installed[lib["name"].replace("-", "_")] = [lib["version"], manager, p[p.length - 3]];
        }
      });

    } catch (error: any) {
      vscode.window.showErrorMessage(error.message);
    }
  }

  getImportLibs() {
    return Object.keys(this.importCommands);
  }

  getImportLibCmds(lib: string) {
    return this.importCommands[lib];
  }

  getTreeItem(element: Library): vscode.TreeItem {
    return element;
  }

  getChildren(element?: Library): Thenable<Library[]> {
    if (element) {
      if (Object.keys(this.installed).includes(element.label)) {
        let version = this.installed[element.label][0];
        let manager = this.installed[element.label][1];
        let path = this.installed[element.label][2];

        let libs: Library[] = [];
        libs.push(new Library("version", "", version, "", "", vscode.TreeItemCollapsibleState.None));
        libs.push(new Library("manager", "", "", manager, "", vscode.TreeItemCollapsibleState.None));
        libs.push(new Library("path", "", "", "", path, vscode.TreeItemCollapsibleState.None));
        return Promise.resolve(libs);

      } else {
        return Promise.resolve([]);
      }

    } else {
      let libs: Library[] = [];
      this.getInstallLibs().forEach((lib: string) => {
        let flag = (Object.keys(this.installed).includes(lib)) ? "installed" : "n/a";
        let state = (flag === "n/a") ? vscode.TreeItemCollapsibleState.None : vscode.TreeItemCollapsibleState.Expanded;
        libs.push(new Library(lib, flag, "", "", "", state));
      });

      return Promise.resolve(libs);
    }
  }
}

export class Library extends vscode.TreeItem {
  constructor(
    public readonly label: string,
    private flag: string,
    private version: string,
    private manager: string,
    private path: string,
    public readonly collapsibleState: vscode.TreeItemCollapsibleState
  ) {
    super(label, collapsibleState);
    this.contextValue = "info";
    if (version !== "") {
      this.tooltip = `${this.label}-${this.version}`;
      this.description = this.version;

    } else if (manager !== "") {
      this.tooltip = this.manager;
      this.description = this.manager;

    } else if (path !== "") {
      this.tooltip = this.path;
      this.description = this.path;

    } else {
      this.tooltip = `${this.label} is ${this.flag}`;
      this.description = this.flag;
      this.contextValue = "library";
    }
  }
}

export function createLibraryManager() {
  const libraryManager = new LibraryManagerProvider();
  vscode.window.registerTreeDataProvider('cadquerySetup', libraryManager);
  vscode.window.createTreeView('cadquerySetup', { treeDataProvider: libraryManager });

  output.info("Successfully registered CadqueryViewer Library Manager");

  return libraryManager;
}
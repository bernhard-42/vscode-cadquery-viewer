import * as vscode from 'vscode';
import { version as cq_vscode_version } from "./version";
import * as output from './output';
import { getPackageManager, getPythonPath } from './utils';
import { execute } from "./system/shell";
import * as path from "path";
import { StatusManagerProvider } from "./statusManager";
import { TerminalExecute } from "./system/terminal";

const URL = "https://github.com/bernhard-42/vscode-cadquery-viewer/releases/download";

function sanitize(lib: string) {
  return lib.replace("-", "_");
}
export class LibraryManagerProvider implements vscode.TreeDataProvider<Library> {
  statusManager: StatusManagerProvider;
  installCommands: any = {};
  importCommands: any = {};
  installed: Record<string, string[]> = {};

  constructor(statusManger: StatusManagerProvider) {
    this.statusManager = statusManger;
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

    this.installed = {};

    try {
      let command = `${python} -m pip list -v --format json`;
      let allLibs = execute(command);
      let libs = JSON.parse(allLibs);
      libs.forEach((lib: any) => {
        if (installLibs.includes(sanitize(lib["name"]))) {
          let editablePath = lib["editable_project_location"];
          this.installed[sanitize(lib["name"])] = [
            lib["version"],
            lib["installer"],
            (editablePath === undefined) ? lib["location"] : editablePath,
            editablePath !== undefined
          ];
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
        let editable = this.installed[element.label][3];
        let manager = editable ? "n/a" : this.installed[element.label][1];
        let location = this.installed[element.label][2];
        let p = location.split(path.sep);
        let env = editable ? location : p[p.length - 4];

        let libs: Library[] = [];
        libs.push(new Library("installer", "", manager, "", "", "", vscode.TreeItemCollapsibleState.None));
        libs.push(new Library("environment", "", "", location, env, "", vscode.TreeItemCollapsibleState.None));
        libs.push(new Library("editable", "", "", "", "", editable, vscode.TreeItemCollapsibleState.None));
        return Promise.resolve(libs);

      } else {
        return Promise.resolve([]);
      }

    } else {
      let libs: Library[] = [];
      this.getInstallLibs().forEach((lib: string) => {
        let installed = Object.keys(this.installed).includes(lib);
        let version = installed ? this.installed[sanitize(lib)][0] : "n/a";
        let state = installed ? vscode.TreeItemCollapsibleState.Expanded : vscode.TreeItemCollapsibleState.None;
        libs.push(new Library(lib, version, "", "", "", "", state));
        if ((lib === "cq_vscode")) {
          this.statusManager.installed = (version !== "n/a");
          this.statusManager.refresh("");
        }
      });

      return Promise.resolve(libs);
    }
  }
}

export class Library extends vscode.TreeItem {
  constructor(
    public readonly label: string,
    private version: string,
    private installer: string,
    private location: string,
    private env: string,
    private editable: string,
    public readonly collapsibleState: vscode.TreeItemCollapsibleState
  ) {
    super(label, collapsibleState);

    if (version !== "") {
      this.tooltip = `${this.label}-${this.version}`;
      this.description = this.version;
      this.contextValue = "library";

    } else if (installer !== "") {
      this.tooltip = this.installer;
      this.description = this.installer;

    } else if (location !== "") {
      this.tooltip = this.location;
      this.description = env;

    } else if (editable !== "") {
      this.tooltip = editable ? "editable" : "non-editable";
      this.description = this.editable.toString();

    }
  }
}

export function createLibraryManager(statusManager: StatusManagerProvider) {
  const libraryManager = new LibraryManagerProvider(statusManager);
  vscode.window.registerTreeDataProvider('cadquerySetup', libraryManager);
  vscode.window.createTreeView('cadquerySetup', { treeDataProvider: libraryManager });

  output.info("Successfully registered CadqueryViewer Library Manager");

  return libraryManager;
}
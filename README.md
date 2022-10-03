# CadQuery Viewer for VS Code

An extension to show cadquery objects in VSCode via pythreejs

## Installation

-   Download [cadquery-viewer-0.9.3.vsix](https://github.com/bernhard-42/vscode-cadquery-viewer/releases/download/v0.9.3/cadquery-viewer-0.9.3.vsix)
-   Install it locally in VS Code (_Extensions -> "..." menu -> Install from VSIX..._)

## Usage

-   Select the correct Python environment in VS Code (conda, mamba, ...)
-   Activate CadQuery Viewer via **cmd-k v** / **ctrl-k v** (or the VS Code command `Open CadQuery Viewer`)
-   Use **cmd-shift-P** / **ctrl-shift-P** and run the command `Install CadQuery Viewer Python module 'cq-vscode'` (if not already installed)
-   Add the Python command `show_object` to your CadQuery Python source file by adding the following import:

    ```python
    from cq_vscode import show_object
    ```

-   Use `show_object` as in [CQ-Editor](https://github.com/CadQuery/CQ-editor)
-   Global settings can be set in VS Code under "CadQuery Viewer"

## show_object

The command support the CQ-Editor parameters `obj`, `name` and `options` plus additional viewer specific args:

```python
show_object(obj, name=None, options=None, **kwargs)
```

Valid keywords `kwargs` are:

```text
- axes:              Show axes (default=False)
- axes0:             Show axes at (0,0,0) (default=False)
- grid:              Show grid (default=False)
- ticks:             Hint for the number of ticks in both directions (default=10)
- ortho:             Use orthographic projections (default=True)
- transparent:       Show objects transparent (default=False)
- default_color:     Default mesh color (default=(232, 176, 36))
- reset_camera:      Reset camera position, rotation and zoom to default (default=True)
- zoom:              Zoom factor of view (default=1.0)
- default_edgecolor: Default mesh color (default=(128, 128, 128))
- render_edges:      Render edges  (default=True)
- render_normals:    Render normals (default=False)
- render_mates:      Render mates (for MAssemblies)
- mate_scale:        Scale of rendered mates (for MAssemblies)
- deviation:         Shapes: Deviation from linear deflection value (default=0.1)
- angular_tolerance: Shapes: Angular deflection in radians for tessellation (default=0.2)
- edge_accuracy:     Edges: Precision of edge discretization (default: mesh quality / 100)
- ambient_intensity  Intensity of ambient ligth (default=1.0)
- direct_intensity   Intensity of direct lights (default=0.12)
```

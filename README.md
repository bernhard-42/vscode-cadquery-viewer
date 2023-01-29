# CadQuery Viewer for VS Code

_CadQuery Viewer for VS Code_ is an extension to show CadQuery objects in VS Code via [three-cad-viewer](https://github.com/bernhard-42/three-cad-viewer)

## Installation

-   Download [cadquery-viewer-0.14.0.vsix](https://github.com/bernhard-42/vscode-cadquery-viewer/releases/download/v0.14.0/cadquery-viewer-0.14.0.vsix)
-   Install it locally in VS Code (_Extensions -> "..." menu -> Install from VSIX..._)

## Usage

-   Select the correct Python environment in VS Code (conda, mamba, ...)
-   Open your Python CadQuery file and activate _CadQuery Viewer_ via **cmd-k v** / **ctrl-k v** (or via the VS Code command `Open CadQuery Viewer`)

    - When port 3939 is free, the viewer starts and in Python one would use 
        ```python
        from cq_vscode import show, show_object
        # ...
        show_object(box)
        ```

    - When the port is not free (e.g. blocked by the first viewer or another app), it opens an input box to ask for another port. In this case, in Python one needs to call `set_port` first, e.g. when entering 3940 in VS Code, call:
        ```python
        from cq_vscode import show, show_object, set_port
        set_port(3940)
        # ...
        show_object(box)
        ```
    All following `show` and `show_object` calls should the use this port in this VS Code Window.

    There can be one Viewer per VS Code window.

-   Use **cmd-shift-P** / **ctrl-shift-P** and run the command `Install CadQuery Viewer Python module 'cq-vscode'` (if not already installed)

-   Use `show_object` as in [CQ-Editor](https://github.com/CadQuery/CQ-editor)

-   Global settings can be set in VS Code under "CadQuery Viewer"

## show_object

The command support the CQ-Editor parameters `obj`, `name` and `options` plus additional viewer specific args:

```python
show_object(obj, name=None, options=None, port=None, **kwargs)
```

Valid keywords `kwargs` are:

```text
- port:              To overwrite the global port setting for the viewer
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

## Example

```python
import cadquery as cq
from cq_vscode import show_object, reset_show, set_defaults

reset_show() # use for reapeated shift-enter execution to clean object buffer
set_defaults(axes=True, transparent=False, collapse=1, grid=(True, True, True))

box = cq.Workplane().box(1, 2, 1).edges().chamfer(0.4)
show_object(box, name="box", options={"alpha": 0.5})

sphere = cq.Workplane().sphere(0.6)

show_object(
    sphere,
    # show_object args
    "sphere",
    {"color": (10, 100, 110)},
    # three-cad-viewer args
    collapse="1",
    reset_camera=False,
    ortho=False
)
```

#
# Copyright 2022 Bernhard Walter
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#    http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.
#

import json
import requests

from cadquery import Workplane

from ocp_tessellate import PartGroup
from ocp_tessellate.convert import (
    tessellate_group,
    get_normal_len,
    combined_bb,
    to_assembly,
)
from ocp_tessellate.defaults import get_default, get_defaults, preset
from ocp_tessellate.utils import numpy_to_json


CMD_PORT = 3939
REQUEST_TIMEOUT = 2000

OBJECTS = {"objs": [], "names": [], "colors": [], "alphas": []}


def set_port(port):
    global CMD_PORT
    CMD_PORT = port


def _send(data, port=None):
    if port is None:
        port = CMD_PORT
    r = requests.post(f"http://127.0.0.1:{port}", json=data)
    if r.status_code != 201:
        print("Error", r.text)


class Progress:
    def update(self):
        print(".", end="", flush=True)


def _convert(*cad_objs, names=None, colors=None, alphas=None, **kwargs):
    part_group = to_assembly(
        *cad_objs,
        names=names,
        colors=colors,
        alphas=alphas,
        render_mates=kwargs.get("render_mates", get_default("render_mates")),
        mate_scale=kwargs.get("mate_scale", get_default("mate_scale")),
        default_color=kwargs.get("default_color", get_default("default_color")),
        show_parent=kwargs.get("show_parent", get_default("show_parent")),
    )

    if len(part_group.objects) == 1 and isinstance(part_group.objects[0], PartGroup):
        part_group = part_group.objects[0]

    # Do not send defaults for postion, rotation and zoom unless they are set in kwargs
    config = {
        k: v
        for k, v in get_defaults().items()
        if not k
        in (
            "position",
            "rotation",
            "zoom",
            # controlled by VSCode panel size
            "cad_width",
            "height",
            # controlled by VSCode settings
            "tree_width",
            "theme",
            "control",
            "up",
            "glass",
            "tools",
        )
    }

    for k, v in kwargs.items():
        if k in ["cad_width", "height"]:

            print(
                f"Setting {k} cannot be set, it is determined by the VSCode panel size"
            )

        elif k in [
            "tree_width",
            "theme",
            "control",
            "up",
            "glass",
            "tools",
        ]:
            print(f"Setting {k} can only be set in VSCode config")

        elif v is not None:

            config[k] = v

    shapes, states = tessellate_group(
        part_group, kwargs, Progress(), config.get("timeit")
    )

    config["normal_len"] = get_normal_len(
        preset("render_normals", config.get("render_normals")),
        shapes,
        preset("deviation", config.get("deviation")),
    )

    bb = combined_bb(shapes).to_dict()
    # add global bounding box
    shapes["bb"] = bb

    data = {
        "data": json.loads(
            numpy_to_json(dict(shapes=shapes, states=states))
        ),  # improve de-numpying
        "type": "data",
        "config": config,
        "count": part_group.count_shapes(),
    }
    return data


def show(*cad_objs, names=None, colors=None, alphas=None, port=None, **kwargs):
    """Show CAD objects in Visual Studio Code

    Valid keywords:
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
    """

    data = _convert(*cad_objs, names=names, colors=colors, alphas=alphas, **kwargs)
    return _send(data, port=port)


def bd_to_cq(objs):
    w = Workplane()
    w.objects = objs
    return w


def reset_show():
    global OBJECTS

    OBJECTS = {"objs": [], "names": [], "colors": [], "alphas": []}


def show_object(
    obj,
    name=None,
    options=None,
    mates=None,
    parent=None,
    clear=False,
    port=None,
    **kwargs,
):
    """Incrementally how CAD objects in Visual Studio Code

    Valid keywords:
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
    """

    global OBJECTS

    if clear:
        reset_show()

    if parent is not None:
        OBJECTS["objs"].append(parent)
        OBJECTS["names"].append("parent")
        OBJECTS["colors"].append(get_default("default_color"))
        OBJECTS["alphas"].append(0.25)

    if options is None:
        color = None
        alpha = 1.0
    else:
        color = options.get("color")
        alpha = options.get("alpha", 1.0)

    OBJECTS["objs"].append(obj)
    OBJECTS["names"].append(name)
    OBJECTS["colors"].append(color)
    OBJECTS["alphas"].append(alpha)

    show(
        *OBJECTS["objs"],
        names=OBJECTS["names"],
        colors=OBJECTS["colors"],
        alphas=OBJECTS["alphas"],
        port=port,
        **kwargs,
    )


if __name__ == "__main__":
    import cadquery as cq

    box = cq.Workplane().box(1, 1, 1)
    result = show(box)
    print(result)

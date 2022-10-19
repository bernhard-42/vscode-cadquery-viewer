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
from jupyter_cadquery import PartGroup, Part
from jupyter_cadquery.cad_objects import to_assembly, Color
from jupyter_cadquery.base import _tessellate_group, get_normal_len, _combined_bb
from jupyter_cadquery.defaults import get_default, get_defaults, preset
from jupyter_cadquery.utils import numpy_to_json
from jupyter_cadquery.animation import Animation

try:
    import build123d as bd

    HAS_BUILD123D = True
except ImportError:
    HAS_BUILD123D = False


def animate(self, speed):
    def to_array(track):
        return [track.path, track.action, track.times, track.values]

    data = {
        "data": [to_array(track) for track in self.tracks],
        "type": "animation",
        "config": {"speed": speed},
    }
    _send(json.loads(numpy_to_json(data)))


Animation.animate = animate


CMD_PORT = 3939
REQUEST_TIMEOUT = 2000
OBJECTS = []


def set_port(port):
    global CMD_PORT
    CMD_PORT = port


def _send(data):
    requests.post(f"http://127.0.0.1:{CMD_PORT}", json=data)


class Progress:
    def update(self):
        print(".", end="", flush=True)


def _convert(*cad_objs, **kwargs):
    color = kwargs.get("default_color")
    if color is None:
        color = get_default("default_color")

    part_group = to_assembly(
        *cad_objs,
        render_mates=kwargs.get("render_mates"),
        mate_scale=kwargs.get("mate_scale", 1),
        default_color=color,
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

            print(f"Setting {k} cannot be set, it is determined by the VSCode panel size")

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

    shapes, states = _tessellate_group(part_group, kwargs, Progress(), config.get("timeit"))

    config["normal_len"] = get_normal_len(
        preset("render_normals", config.get("render_normals")),
        shapes,
        preset("deviation", config.get("deviation")),
    )

    bb = _combined_bb(shapes).to_dict()
    # add global bounding box
    shapes["bb"] = bb

    data = {
        "data": json.loads(numpy_to_json(dict(shapes=shapes, states=states))),  # improve de-numpying
        "type": "data",
        "config": config,
        "count": part_group.count_shapes(),
    }
    return data


def show(*cad_objs, **kwargs):
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

    data = _convert(*cad_objs, **kwargs)
    return _send(data)


def bd_to_cq(objs):
    w = Workplane()
    w.objects = objs
    return w


def show_object(obj, name=None, options=None, parent=None, clear=False, **kwargs):
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
        part = to_assembly(parent, names=["parent"]).objects[0]
        r, g, b = get_default("default_color")
        part.color = Color((r, g, b, 0.25))
        OBJECTS.append(part)

    part = to_assembly(obj, names=[name if name is not None else f"obj_{len(OBJECTS)}"]).objects[-1]

    if options is not None:
        if options.get("rgba"):
            r, g, b, a = options["rgba"]
        else:
            a = options["alpha"] if options.get("alpha") is not None else 100
            r, g, b = options["color"] if options.get("color") is not None else get_default("default_color")
        part.color = Color((r, g, b, a))

    # ensure all objects a transparent to trick webgl renderer order
    part.color.a = min(part.color.a, 0.99)

    OBJECTS.append(part)

    show(*OBJECTS, **kwargs)


def reset_show():
    global OBJECTS

    OBJECTS = []


if __name__ == "__main__":
    import cadquery as cq

    box = cq.Workplane().box(1, 1, 1)
    result = show(box)
    print(result)

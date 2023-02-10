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
import numpy as np

from ocp_tessellate import PartGroup
from ocp_tessellate.convert import (
    tessellate_group,
    get_normal_len,
    combined_bb,
    to_assembly,
    mp_get_results,
)
from ocp_tessellate.defaults import get_default, get_defaults, preset
from ocp_tessellate.utils import numpy_to_buffer_json, Timer
from ocp_tessellate.mp_tessellator import init_pool, keymap, close_pool


CMD_PORT = 3939
REQUEST_TIMEOUT = 2000

OBJECTS = {"objs": [], "names": [], "colors": [], "alphas": []}


def set_port(port):
    global CMD_PORT
    CMD_PORT = port


def _send(data, port=None):
    if port is None:
        port = CMD_PORT
    try:
        r = requests.post(f"http://127.0.0.1:{port}", json=data)
    except Exception as ex:
        print("Cannot connect to viewer, is it running and the right port provided?")
        return

    if r.status_code != 201:
        print("Error", r.text)


def _tessellate(*cad_objs, names=None, colors=None, alphas=None, **kwargs):
    timeit = preset("timeit", kwargs.get("timeit"))
    with Timer(timeit, "", "to_assembly", 1):
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

        if len(part_group.objects) == 1 and isinstance(
            part_group.objects[0], PartGroup
        ):
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

    parallel = preset("parallel", config.get("parallel"))

    if parallel:
        print("Warning: parallel currently not supported!")
        parallel = False

    progress = "with_cache"

    with Timer(timeit, "", "tessellate", 1):
        if parallel:
            init_pool()
            keymap.reset()

        instances, shapes, states = tessellate_group(
            part_group, kwargs, progress, config.get("timeit")
        )

        if parallel:
            mp_get_results(shapes, progress)
            close_pool()

    config["normal_len"] = get_normal_len(
        preset("render_normals", config.get("render_normals")),
        shapes,
        preset("deviation", config.get("deviation")),
    )

    with Timer(timeit, "", "bb", 1):
        bb = combined_bb(shapes).to_dict()

    # add global bounding box
    shapes["bb"] = bb
    return instances, shapes, states, config, part_group.count_shapes()


def _convert(*cad_objs, names=None, colors=None, alphas=None, **kwargs):
    timeit = preset("timeit", kwargs.get("timeit"))
    instances, shapes, states, config, count_shapes = _tessellate(
        *cad_objs, names=names, colors=colors, alphas=alphas, **kwargs
    )
    with Timer(timeit, "", "create data obj", 1):
        data = {
            "data": numpy_to_buffer_json(
                dict(instances=instances, shapes=shapes, states=states)
            ),
            "type": "data",
            "config": config,
            "count": count_shapes,
        }
    return data


def show(*cad_objs, names=None, colors=None, alphas=None, port=None, **kwargs):
    """Show CAD objects in Visual Studio Code
    Parameters
    - cad_objs:          All cad objects that should be shown as positional parameters

    Keywords for show:
    - names:             List of names for the cad_objs. Needs to have the same length as cad_objs
    - colors:            List of colors for the cad_objs. Needs to have the same length as cad_objs
    - alphas:            List of alpha values for the cad_objs. Needs to have the same length as cad_objs
    - port:              The port the viewer listens to. Typically use 'set_port(port)' instead

    Valid keywords to configure the viewer (**kwargs):
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

    timeit = preset("timeit", kwargs.get("timeit"))
    with Timer(timeit, "", "overall"):
        data = _convert(*cad_objs, names=names, colors=colors, alphas=alphas, **kwargs)

    with Timer(timeit, "", "send"):
        return _send(data, port=port)


def reset_show():
    global OBJECTS

    OBJECTS = {"objs": [], "names": [], "colors": [], "alphas": []}


def show_object(
    obj,
    name=None,
    options=None,
    parent=None,
    clear=False,
    port=None,
    **kwargs,
):
    """Incrementally show CAD objects in Visual Studio Code

    Parameters:
    - obj:              The CAD object to be shown

    Keywords for show_object:
    - name:             The name of the CAD object
    - options:          A dict of color and alpha value: {"alpha":0.5, "color": (64, 164, 223)}
                        0 <= alpha <= 1.0 and color is a 3-tuple of values between 0 and 255
    - parent:           Add another object, usually the parent of e.g. edges or vertices with alpha=0.25
    - clear:            In interactice mode, clear the stack of objects to be shown
                        (typically used for the first object)
    - port:             The port the viewer listens to. Typically use 'set_port(port)' instead

    Valid keywords to configure the viewer (**kwargs):
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

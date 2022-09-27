"use strict";

export function template(
    cadWidth: number,
    height: number,
    treeWidth: number = 240,
    theme: string = "light",
    control: string = "trackball",
    up: string = "Z",
    glass: boolean = false,
    tools: boolean = true,
    collapse: number = 1,
    rotateSpeed: number = 1.0,
    zoomSpeed: number = 1.0,
    panSpeed: number = 1.0
) {
    return `
<!DOCTYPE html>
<html>

<head>
    <meta charset="utf-8" />
    <title>CadQuery Viewer</title>
    <link rel="stylesheet" href="https://unpkg.com/three-cad-viewer@1.7.0/dist/three-cad-viewer.css" /> <!-- 1.7.0 -->

    <script type="module">
        import { Viewer, Timer } from "https://unpkg.com/three-cad-viewer@1.7.0/dist/three-cad-viewer.esm.js";

        var viewer = null;

        function nc(change) {
            console.debug("index.html:", JSON.stringify(change, null, 2));
        }


        function showViewer() {
            const displayOptions = {
                cadWidth: ${cadWidth},
                height: ${height},
                treeWidth: ${treeWidth},
                theme: "${theme}",
                pinning: false,
            };

            const container = document.getElementById("cad_viewer");
            container.innerHTML = ""
            viewer = new Viewer(container, displayOptions, nc);
            // viewer.trimUI(["axes", "axes0", "grid", "ortho", "more", "help"])
        }



        function render(shapes, states) {
            const renderOptions = {
                ambientIntensity: 0.75,
                directIntensity: 0.15,
                edgeColor: 0x707070,
                defaultOpacity: 0.5,
                normalLen: 0,
            };

            const viewerOptions = {
                ortho: true,
                control: "${control}",
                up: "${up}",
                glass: ${glass},
                tools: ${tools},
                collapse: ${collapse},

                // transparent: true,
                // blackEdges: true,
                // axes: true,
                // axes0: true,
                // grid: [true, false, true],
                // ticks: 50,

                rotateSpeed: ${rotateSpeed},
                zoomSpeed: ${zoomSpeed},
                panSpeed: ${panSpeed},
                timeit: false,
            };

            viewer?.clear();

            var shapesStates = viewer.renderTessellatedShapes(shapes, states, renderOptions)

            viewer.render(
                ...shapesStates,
                states,
                viewerOptions,
            );
        }

        showViewer();

        window.addEventListener('message', event => {
            const data = JSON.parse(event.data);
            render(data[0], data[1]);
        });
    </script>
</head>


<body>
    <div id="cad_viewer"></div>
</body>

</html>
`;
}
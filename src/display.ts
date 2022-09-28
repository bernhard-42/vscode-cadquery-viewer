import * as vscode from 'vscode';

export function template() {
    let options = vscode.workspace.getConfiguration("CadQueryViewer");

    let html = `
<!DOCTYPE html>
<html>

<head>
    <meta charset="utf-8" />
    <title>CadQuery Viewer</title>
    <link rel="stylesheet" href="https://unpkg.com/three-cad-viewer@1.7.0/dist/three-cad-viewer.css" /> <!-- 1.7.0 -->

    <script type="module">
        import { Viewer, Timer } from "https://unpkg.com/three-cad-viewer@1.7.0/dist/three-cad-viewer.esm.js";

        var viewer = null;
        var _shapes = null;
        var _states = null;

        function nc(change) {
            console.debug("index.html:", JSON.stringify(change, null, 2));
        }

        function getSize() {
            return {
                width: window.innerWidth || document.body.clientWidth,
                height: window.innerHeight || document.body.clientHeight
            }
        }

        function showViewer() {
            const size = getSize()
            const treeWidth = ${options.get("glass")} ? 0: 240;

            const displayOptions = {
                cadWidth: size.width - treeWidth - 42,
                height: size.height - 65,
                treeWidth: treeWidth,
                theme: "${options.get("theme")}",
                pinning: false,
            };

            const container = document.getElementById("cad_viewer");
            container.innerHTML = ""
            viewer = new Viewer(container, displayOptions, nc);
            // viewer.trimUI(["axes", "axes0", "grid", "ortho", "more", "help"])
        }



        function render(shapes, states) {
            _states = states;
            _shapes = shapes;

            const renderOptions = {
                ambientIntensity: 0.75,
                directIntensity: 0.15,
                edgeColor: 0x707070,
                defaultOpacity: 0.5,
                normalLen: 0,
            };

            const viewerOptions = {
                ortho: true,
                control: "${options.get("control")}",
                up: "${options.get("up")}",
                glass: ${options.get("glass")},
                tools: ${options.get("tools")},
                collapse: ${options.get("collapse")},
                rotateSpeed: ${options.get("rotateSpeed")},
                zoomSpeed: ${options.get("zoomSpeed")},
                panSpeed: ${options.get("panSpeed")},
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

        window.addEventListener('resize', function(event) {
            console.log();
            showViewer();
            if (_states != null) {
                render(_shapes, _states);
            }
        }, true);
        
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
    return html;
}
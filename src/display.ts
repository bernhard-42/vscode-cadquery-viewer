import * as vscode from 'vscode';

export function template() {
    let options = vscode.workspace.getConfiguration("CadQueryViewer");
    let treeWidth = options.get("treeWidth");
    let theme = options.get("theme");
    let control = options.get("control");
    let up = options.get("up");
    let glass = options.get("glass");
    let tools = options.get("tools");
    let collapse = options.get("collapse");
    let rotateSpeed = options.get("rotateSpeed");
    let zoomSpeed = options.get("zoomSpeed");
    let panSpeed = options.get("panSpeed");

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
            console.debug("Viewer:", JSON.stringify(change, null, 2));
        }

        function getSize() {
            return {
                width: window.innerWidth || document.body.clientWidth,
                height: window.innerHeight || document.body.clientHeight
            }
        }

        function showViewer() {
            const size = getSize()
            const treeWidth = ${treeWidth} ? 0: 240;

            const displayOptions = {
                cadWidth: Math.max(665, size.width - treeWidth - 42),
                height: size.height - 65,
                treeWidth: treeWidth,
                theme: '${theme}',
                pinning: false,
            };

            const container = document.getElementById("cad_viewer");
            container.innerHTML = ""
            viewer = new Viewer(container, displayOptions, nc);
            
            if (_states != null) {
                render(_shapes, _states);
            } 
            
            // viewer.trimUI(["axes", "axes0", "grid", "ortho", "more", "help"])           
        }

        function preset(config, val) {
            return (config === undefined) ? val : config;
        }

        function render(shapes, states, config) {
            _states = states;
            _shapes = shapes;

            const tessellationOptions = {
                ambientIntensity: preset(config["ambient_intensity"], 0.75),
                directIntensity: preset(config["direct_intensity"], 0.15),
                edgeColor: preset(config["edge_color"], 0x707070),
                defaultOpacity: preset(config["default_opacity"], 0.5):,
                normalLen: preset(config["normal_len"], 0),
            };


            const renderOptions = {
                axes: preset(config["axes"], false),
                axes0: preset(config["axes0"], false),
                blackEdges: preset(config["black_edges"], false),
                grid: preset(config["grid"], [false, false, false]),
                ortho: preset(config["ortho"], true),
                ticks: preset(config["ticks"], 10),
                timeit: preset(config["timeit"], false),
                tools: preset(config["tools"], true),
                glass: preset(config["glass"], true),
                transparent: preset(config["transparent"], false),
                zoom: preset(config["zoom"], 1.0),
                controls: preset(config["controls"], "trackball"),
                panSpeed: preset(config["panSpeed"], 0.5),
                zoomSpeed: preset(config["zoomSpeed"], 0.5),
                rotateSpeed: preset(config["rotateSpeed"], 1.0),
            };

            viewer?.clear();

            var shapesStates = viewer.renderTessellatedShapes(shapes, states, tessellationOptions)

            viewer.render(
                ...shapesStates,
                states,
                renderOptions,
            );
        }

        showViewer();
        
        window.addEventListener('resize', function(event) {
            showViewer();
        }, true);

        window.addEventListener('message', event => {
            const data = JSON.parse(event.data);
            if (data.type === "data") {
                let meshData = data.data;
                let config = data.config;
                render(meshData.shapes, meshData.states, config);
            }
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
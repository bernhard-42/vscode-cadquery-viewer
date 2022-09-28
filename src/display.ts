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

        function render(shapes, states) {
            console.log("Viewer: render");
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
                control: '${control}',
                up: '${up}',
                glass: ${glass},
                tools: ${tools},
                collapse: ${collapse},
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
        
        window.addEventListener('resize', function(event) {
            showViewer();
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
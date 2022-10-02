import * as vscode from 'vscode';

export function template() {
    let options = vscode.workspace.getConfiguration("CadQueryViewer");
    let theme = options.get("dark") ? "dark": "light";
    let treeWidth = options.get("treeWidth");
    let control = options.get("orbitControl") ? "orbit" : "trackball";
    let up = options.get("up");
    let glass = options.get("glass");
    let tools = options.get("tools");
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
        var _config = null;
        var _zoom = null;
        var _position = null;
        var _quaternion = null;
        var _target = null;

        function nc(change) {
            console.debug("Viewer:", JSON.stringify(change, null, 2));
            if (change.zoom !== undefined) {
                _zoom = change.zoom.new;
            }
            if (change.position !== undefined) {
                _position = change.position.new;
            }
            if (change.quaternion !== undefined) {
                _quaternion = change.quaternion.new;
            }
            if (change.target !== undefined) {
                _target = change.target.new;
            }
        }

        function getSize() {
            return {
                width: window.innerWidth || document.body.clientWidth,
                height: window.innerHeight || document.body.clientHeight
            }
        }
        
        function preset(config, val) {
            return (config === undefined) ? val : config;
        }

        function showViewer() {
            const size = getSize()
            const treeWidth = ${glass} ? 0: ${treeWidth};
            const minWidth = ${glass} ? 665 : 665 - ${treeWidth};
            
            const displayOptions = {
                cadWidth: Math.max(minWidth, size.width - treeWidth - 42),
                height: size.height - 65,
                treeWidth: treeWidth,
                theme: '${theme}',
                pinning: false,
            };    

            const container = document.getElementById("cad_viewer");
            container.innerHTML = ""
            viewer = new Viewer(container, displayOptions, nc);
            
            if (_states != null) {
                render(_shapes, _states, _config);
            }     
            
            // viewer.trimUI(["axes", "axes0", "grid", "ortho", "more", "help"])           
        }    

        function render(shapes, states, config) {
            _states = states;
            _shapes = shapes;
            _config = config;
            
            const tessellationOptions = {
                ambientIntensity: preset(config.ambient_intensity, 0.75),
                directIntensity: preset(config.direct_intensity, 0.15),
                edgeColor: preset(config.edge_color, 0x707070),
                defaultOpacity: preset(config.default_opacity, 0.5),
                normalLen: preset(config.normal_len, 0),
            };


            const renderOptions = {
                axes: preset(config.axes, false),
                axes0: preset(config.axes0, false),
                blackEdges: preset(config.black_edges, false),
                grid: preset(config.grid, [false, false, false]),
                ortho: preset(config.ortho, true),
                ticks: preset(config.ticks, 10),
                timeit: preset(config.timeit, false),
                tools: preset(config.tools, ${tools}),
                glass: preset(config.glass, ${glass}),
                up: preset(config.up, '${up}'),
                transparent: preset(config.transparent, false),
                zoom: preset(config.zoom, 1.0),
                control: preset(config.control, '${control}'),
                panSpeed: preset(config.panSpeed, ${panSpeed}),
                zoomSpeed: preset(config.zoomSpeed, ${zoomSpeed}),
                rotateSpeed: preset(config.rotateSpeed, ${rotateSpeed}),
            };

            viewer?.clear();

            var shapesStates = viewer.renderTessellatedShapes(shapes, states, tessellationOptions)
            
            if (config.reset_camera) {
                _zoom = null;
                _position = null;
                _quaternion = null;
                _target = null;                
            } else {
                if (_zoom !== null) {
                    renderOptions["zoom"] = _zoom;
                }
                if (_position !== null) {
                    renderOptions["position"] = _position;
                }
                if (_quaternion !== null) {
                    renderOptions["quaternion"] = _quaternion;
                }
                if (_target !== null) {
                    renderOptions["target"] = _target;
                }
            }
            console.log(renderOptions);
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

            } else if (data.type === "animation") {
                const tracks = data.data;
                for (var track of tracks) {
                    viewer.addAnimationTrack(...track);
                }
                const duration = Math.max(
                    ...tracks.map((track) => Math.max(...track[2]))
                );
                if (data.config.speed > 0) {
                      viewer.initAnimation(duration, data.config.speed);
                }
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
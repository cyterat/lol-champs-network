let network;
let nodes, edges;

// Load data and initialize network
document.addEventListener('DOMContentLoaded', function() {
    loadNetworkData();
});


async function loadNetworkData() {
    try {
        const response = await fetch('data/data.json');
        const data = await response.json();
        
        // Process nodes
        nodes = new vis.DataSet(data.nodes.map(node => ({
            id: node.id,
            shape: node.shape || 'circularImage',
            image: node.image || 'assets/other/lol.png',
            brokenImage: node.brokenImage || 'img/default.png',
            opacity: node.opacity,
            label: node.label,
            title: formatTooltip(node.label, node.description),
            size: node.size || 20,
            mass: node.mass || 0,
            borderWidth: 3,
            shadow: true,
            color: {
                border: '#c8aa6e',
                background: '#180d43'
            },
            font: {
                color: '#343434',
                size: 14,
                face: 'Arial',
                strokeWidth: 5,
                strokeColor: '#d3bb8b',
            }
        })));
        
        // Process edges
        edges = new vis.DataSet(data.edges.map(edge => ({
            from: edge.from,
            to: edge.to,
            width: edge.weight || 1,
            label: edge.label || '',
            color: {
                color: edge.color || '#3b4353',
                highlight: '#2B7CE9'
            },
            dashes: edge.dashes || false,
            font: {
                color: '#ffffff',
                size: 12,
                strokeWidth: 5,
                strokeColor: '#3b4353'
            },
            arrows: {
                from: edge.arrowToSource || false,
                to: edge.arrowToTarget || false
            },
            smooth: false
        })));
        
        // Create network
        createNetwork();
        
    } catch (error) {
        console.error('Error loading network data:', error);
        showError('Failed to load network data. Please check if data.json exists.');
    }
}

function formatTooltip(label, description) {
    if (!description) return label;
    
    const lines = description.split('\n');
    let text = `${label}\n\n`;
    
    for (let line of lines) {
        if (line.trim()) {
            text += `${line.trim()}\n`;
        }
    }
    
    return text.trim();
}

function createNetwork() {
    const container = document.getElementById('mynetwork');
    
    const networkData = {
        nodes: nodes,
        edges: edges
    };
    
    const options = {
        // physics: {
        //     enabled: false,
        //     stabilization: {
        //         enabled: true,
        //         iterations: 1000,
        //         updateInterval: 25
        //     },
        //     barnesHut: {
        //         gravitationalConstant: -4000,
        //         centralGravity: 0.3,
        //         springLength: 100,
        //         // springConstant: 0.04,
        //         // damping: 0.09,
        //         // springConstant: 0, // Set to 0 to control overlap with avoidOverlap
        //         avoidOverlap: 0.1
        //     }
        // },
        physics: true,
        interaction: {
            hover: true,
            hoverConnectedEdges: true,
            selectConnectedEdges: false,
            tooltipDelay: 200,
            zoomView: false,
            dragView: false
        },
        nodes: {
            borderWidth: 3,
            borderWidthSelected: 4,
            size: 30,
            color: {
                border: '#2B7CE9',
                background: '#ffffff',
                highlight: {
                    border: '#2B7CE9',
                    background: '#D2E5FF'
                }
            },
            font: {
                color: '#343434',
                size: 14,
                face: 'Arial, sans-serif'
            }
        },
        edges: {
            color: {
                color: '#848484',
                highlight: '#2B7CE9',
                hover: '#cccccc'
            },
            font: {
                color: '#343434',
                size: 12,
                face: 'Arial, sans-serif',
                strokeWidth: 2,
                strokeColor: '#ffffff'
            },
            smooth: {
                enabled: true,
                type: 'continuous'
            },
            arrows: {
                to: {
                    scaleFactor: 0.5,
                    type: 'arrow'
                }
            },
        },
        layout: {
            improvedLayout: true
        }
    };
    
    // Create network instance
    network = new vis.Network(container, networkData, options);
    
    addEventListeners();
    
    // Show loading complete message
    console.log('Network visualization loaded successfully');
}

function addEventListeners() {
    // Node selection event
    network.on('selectNode', function(params) {
        if (params.nodes.length > 0) {
            const nodeId = params.nodes[0];
            const node = nodes.get(nodeId);
            console.log('Selected node:', node);
        }
    });
    
    // Edge selection event
    network.on('selectEdge', function(params) {
        if (params.edges.length > 0) {
            const edgeId = params.edges[0];
            const edge = edges.get(edgeId);
            console.log('Selected edge:', edge);
        }
    });
    
    // Double click to fit view
    network.on('doubleClick', function(params) {
        if (params.nodes.length === 0) {
            network.fit();
        }
    });
    
    // Handle stabilization
    network.on('stabilizationProgress', function(params) {
        const progress = Math.round((params.iterations / params.total) * 100);
        console.log(`Stabilization progress: ${progress}%`);
    });
    
    network.on('stabilizationIterationsDone', function() {
        console.log('Network stabilization complete');
    });
}

function showError(message) {
    const container = document.getElementById('mynetwork');
    container.innerHTML = `
        <div class="error-message">
            <h3>Error</h3>
            <p>${message}</p>
        </div>
    `;
}

// Utility functions for network manipulation
function addNode(nodeData) {
    nodes.add(nodeData);
}

function removeNode(nodeId) {
    nodes.remove(nodeId);
}

function addEdge(edgeData) {
    edges.add(edgeData);
}

function removeEdge(edgeId) {
    edges.remove(edgeId);
}

function fitNetwork() {
    if (network) {
        network.fit();
    }
}

function redrawNetwork() {
    if (network) {
        network.redraw();
    }
}

// Export functions for external use
window.NetworkViz = {
    addNode,
    removeNode,
    addEdge,
    removeEdge,
    fitNetwork,
    redrawNetwork,
    getNetwork: () => network,
    getNodes: () => nodes,
    getEdges: () => edges
};
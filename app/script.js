class NetworkVisualization {
    constructor() {
        this.network = null;
        this.nodes = null;
        this.edges = null;
        this.isStabilizing = false;
        this.lastScale = 1;
        this.currentChampionSlug = null; // Store the current champion's slug

        this.performanceConfig = {
            enableImages: true,
            maxImageSize: 64,
            zoomThreshold: 0.4,
            hideLabelsThreshold: 0.7
        };
    }

    async init() {
        try {
            await this.loadNetworkData();
            this.createNetwork();
            this.setupEventListeners();
        } catch (err) {
            console.error("Failed to initialize network:", err);
            this.showError("Failed to initialize network visualization");
        }
    }

    async loadNetworkData() {
        const response = await fetch('data/data.json');
        const data = await response.json();
        this.processNodes(data.nodes);
        this.processEdges(data.edges);
    }

    processNodes(nodeData) {
        this.nodes = new vis.DataSet(nodeData.map(node => this.createNodeConfig(node)));
    }

    createNodeConfig(node) {
        const baseConfig = {
            id: node.id,
            label: node.label,
            title: node.description || node.label,
            size: node.size || 20,
            originalSize: node.size || 20,
            mass: node.mass || 3,
            borderWidth: node.BrWidth || 2,
            borderWidthSelected: node.BrWidthSel || 3,
            shadow: false,
            font: {
                color: '#f0f0f0',
                size: 14,
                face: 'Beaufort for LOL, sans-serif',
                weight: 'normal',
                strokeWidth: 10,
                strokeColor: '#0c0c0c'
            }
        };

        if (node.image && this.performanceConfig.enableImages) {
            return {
                ...baseConfig,
                shape: 'circularImage',
                image: node.image,
                brokenImage: node.brokenImage || 'img/default.png',
                slugWidget: node.slugWidget,
                color: {
                    border: node.brColor || '#C79B3B',
                    background: node.bgColor || '#180d43',
                    hover: node.brColorHg || '#d4c178',
                    highlight: {
                        border: node.brColorHg || '#d4c178',
                        background: node.bgColorHg || '#180d43'
                    }
                }
            };
        } else {
            return {
                ...baseConfig,
                shape: 'dot',
                color: {
                    border: '#C79B3B',
                    background: node.bgColor || '#95A5A6',
                    highlight: {
                        border: '#d4c178',
                        background: '#180d43'
                    }
                }
            };
        }
    }

    processEdges(edgeData) {
        this.edges = new vis.DataSet(edgeData.map(edge => ({
            from: edge.from,
            to: edge.to,
            width: edge.width || 1,
            length: edge.length || 50,
            label: edge.label,
            title: edge.description,
            color: {
                color: edge.color || '#555555',
                highlight: edge.colorHg || '#313131',
                hover: edge.colorHg || '#313131'
            },
            arrows: { from: edge.arrowToSource || false, to: edge.arrowToTarget || false },
            smooth: { enabled: false },
            font: {
                color: '#d4c178',
                size: 24,
                face: 'Beaufort for LOL, sans-serif',
                weight: 'normal',
                strokeWidth: 8,
                strokeColor: '#0c0c0c'
            }
        })));
    }

    createNetwork() {
        const container = document.getElementById('mynetwork');
        if (!container) throw new Error('Network container not found');

        this.network = new vis.Network(container, {
            nodes: this.nodes,
            edges: this.edges
        }, this.getNetworkOptions());

        console.log('Network visualization created successfully');
    }

    getNetworkOptions() {
        return {
            physics: { enabled: true, solver: 'barnesHut' },
            interaction: {
                hover: true,
                dragNodes: false,
                zoomView: true,
                dragView: true
            }
        };
    }

    setupEventListeners() {
        // listener for node selection
        this.network.on('selectNode', (params) => {
            if (params.nodes.length === 0) return;
            const nodeId = params.nodes[0];
            const node = this.nodes.get(nodeId);
            const pointer = params.pointer.DOM;
            this.onNodeSelected(node, pointer);
        });

        this.network.on('deselectNode', () => {
            const tooltipPanel = document.getElementById('champion-tooltip-panel');
            if (tooltipPanel) tooltipPanel.style.display = 'none';
        });

        // add cursor change on hover
        const container = this.network.body.container; // or document.getElementById('your-network-div-id')
        this.network.on('hoverNode', () => {
            container.style.cursor = 'pointer';
        });
        this.network.on('blurNode', () => {
            container.style.cursor = 'default';
        });

        // edges
        // this.network.on('hoverEdge', () => container.style.cursor = 'pointer');
        // this.network.on('blurEdge', () => container.style.cursor = 'default');

        const roleSelector = document.getElementById('role-selector');
        if (roleSelector) {
            roleSelector.onchange = (event) => {
                const selectedRole = event.target.value;
                if (this.currentChampionSlug) {
                    this.renderChampionWidget(this.currentChampionSlug, selectedRole);
                }
            };
        }
    }


    // ------------------ TOOLTIP ------------------

    async renderChampionWidget(championSlug, role) {
        const widgetContainer = document.getElementById('champion-widget-container');
        if (!widgetContainer) return;

        widgetContainer.innerHTML = `
            <div data-moba-widget="lol-champion-build-compact"
                 data-moba-champion="${championSlug}"
                 data-moba-champion-role="${role}"></div>
        `;

        await this.waitForMobalytics();

        const tryInitWidget = (attempt = 0) => {
            if (window.mobalyticsWidgets?.init) {
                window.mobalyticsWidgets.init();
                console.log("Mobalytics widget initialized, attempt", attempt + 1);
            } else if (attempt < 3) {
                setTimeout(() => tryInitWidget(attempt + 1), 100);
            }
        };
        tryInitWidget();
    }

    async onNodeSelected(node, pos) {
        const tooltipPanel = document.getElementById('champion-tooltip-panel');
        const roleSelector = document.getElementById('role-selector');

        // Hide panel if it's not a champion node or panel elements are missing
        if (!tooltipPanel || !roleSelector || !node.slugWidget) {
            if (tooltipPanel) tooltipPanel.style.display = 'none';
            return;
        }

        tooltipPanel.style.display = "block";
        this.currentChampionSlug = node.slugWidget;

        // Define the available roles from the Mobalytics documentation
        const roles = ['TOP', 'JUNGLE', 'MID', 'ADC', 'SUPPORT'];
        const defaultRole = 'MID';

        // Clear and repopulate the dropdown with options
        roleSelector.innerHTML = roles.map(role => `<option value="${role}">${role}</option>`).join('');

        // Set the default role selection
        roleSelector.value = defaultRole;

        // Render the initial widget with the default role
        this.renderChampionWidget(this.currentChampionSlug, defaultRole);
    }

    // Helper
    waitForMobalytics() {
        return new Promise(resolve => {
            if (window.mobalyticsWidgets?.init) return resolve();
            const script = document.createElement('script');
            script.src = "https://cdn.jsdelivr.net/gh/mobalyticshq/mobalytics-widgets/build/mobalytics-widgets.js";
            document.body.appendChild(script);

            const interval = setInterval(() => {
                if (window.mobalyticsWidgets?.init) {
                    clearInterval(interval);
                    resolve();
                }
            }, 50);
        });
    }

    showError(msg) {
        const container = document.getElementById('mynetwork');
        container.innerHTML = `<div style="color:red">${msg}</div>`;
    }
}

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
    const networkViz = new NetworkVisualization();
    await networkViz.init();
    window.NetworkViz = networkViz;
});
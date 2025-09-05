class NetworkVisualization {
    constructor() {
        this.network = null;
        this.nodes = null;
        this.currentChampionSlug = null;
        this.edges = null;
        this.edgesDataView = null;
        this.nodesDataView = null;
        this.isStabilizing = false;
        this.lastScale = 1;
        this.imageLoadQueue = [];
        this.loadedImages = new Set();
        this.isProgressiveLoadingActive = false;
        this.currentEdgeType = 'relMain';

        // Manual physics configurations for each view
        this.viewPhysicsConfig = {
            'relMain': {
                solver: 'barnesHut',
                barnesHut: {
                    gravitationalConstant: -1600,
                    centralGravity: 0.9,
                },
                stabilization: {
                    enabled: true,
                    iterations: 2000,
                    updateInterval: 25,
                    onlyDynamicEdges: false,
                    fit: true
                },
                adaptiveTimestep: true
            },
            'relItems': {
                solver: 'forceAtlas2Based',
                forceAtlas2Based: {
                    gravitationalConstant: -200,
                    centralGravity: 0.05, 
                    springLength: 150,
                    springConstant: 0.05,
                    damping: 1.0,  
                    avoidOverlap: 0.4 
                },
                maxVelocity: 15,
                minVelocity: 0.01,
                stabilization: {
                    enabled: true,
                    iterations: 4000,
                    updateInterval: 100,
                    onlyDynamicEdges: false,
                    fit: true
                },
                adaptiveTimestep: true,
                timestep: 0.25   
            },
            // Default config (ForceAtlas2 as you requested)
            'default': {
                solver: 'forceAtlas2Based',
                forceAtlas2Based: {
                    gravitationalConstant: -200,
                    centralGravity: 0.005,
                    springLength: 150,
                    springConstant: 0.05,
                    damping: 0.95,
                    avoidOverlap: 0.4
                },
                // maxVelocity: 1500,
                minVelocity: 0.01,
                stabilization: {
                    enabled: true,
                    iterations: 4000,
                    updateInterval: 100,
                    onlyDynamicEdges: false,
                    fit: true
                },
                adaptiveTimestep: true,
                timestep: 0.25   
            }
        };

        this.performanceConfig = {
            enableImages: true,
            maxImageSize: 64,
            zoomThreshold: 0.4,
            hideLabelsThreshold: 0.7,
            progressiveLoading: true,
            imageLoadBatchSize: 5,
            imageLoadDelay: 5
        };
    }

    async init() {
        try {
            await this.loadNetworkData();
            this.createNetwork();
            this.setupEventListeners();
            
            if (this.performanceConfig.progressiveLoading && this.performanceConfig.enableImages) {
                this.startProgressiveImageLoading();
            }
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
        this.nodes = new vis.DataSet(nodeData.map(node => this.createNodeConfig(node, false)));
    }

    createNodeConfig(node, withImage = true) {
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
            baseConfig.imageUrl = node.image;
            baseConfig.brokenImage = node.brokenImage || './assets/other/lol.png';
            baseConfig.slugWidget = node.slugWidget; 
            baseConfig.brColor = node.brColor || '#C79B3B';
            baseConfig.bgColor = node.bgColor || '#180d43';
            baseConfig.brColorHg = node.brColorHg || '#d4c178';
            baseConfig.bgColorHg = node.bgColorHg || '#180d43';
        }

        if (withImage && node.image && this.performanceConfig.enableImages) {
            return {
                ...baseConfig,
                shape: 'circularImage',
                image: node.image,
                brokenImage: node.brokenImage || './assets/other/lol.png',
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
            const hasImage = node.image && this.performanceConfig.enableImages;
            return {
                ...baseConfig,
                shape: 'dot',
                color: {
                    border: hasImage ? (node.brColor || '#C79B3B') : '#C79B3B',
                    background: hasImage ? (node.bgColor || '#95A5A6') : '#95A5A6',
                    highlight: {
                        border: hasImage ? (node.brColorHg || '#d4c178') : '#d4c178',
                        background: hasImage ? (node.bgColorHg || '#180d43') : '#180d43'
                    }
                }
            };
        }
    }

    processEdges(edgeData) {
        this.edges = new vis.DataSet(edgeData.map(edge => ({
            from: edge.from,
            to: edge.to,
            type: edge.type || 'relMain',
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

        this.edgesDataView = new vis.DataView(this.edges, {
            filter: (edge) => edge.type === this.currentEdgeType
        });

        this.nodesDataView = new vis.DataView(this.nodes, {
            filter: (node) => this.shouldNodeBeVisible(node.id, this.currentEdgeType)
        });

        this.network = new vis.Network(container, {
            nodes: this.nodesDataView,
            edges: this.edgesDataView
        }, this.getNetworkOptions());

        console.log('Network visualization created successfully (without images)');
    }

    shouldNodeBeVisible(nodeId, edgeType) {
        if (edgeType === 'all') return true;
        
        const allEdges = this.edges.get();
        const relevantEdges = allEdges.filter(edge => edge.type === edgeType);
        
        return relevantEdges.some(edge => edge.from === nodeId || edge.to === nodeId);
    }

    // Get physics configuration for specific view
    getPhysicsConfigForView(viewType) {
        const config = this.viewPhysicsConfig[viewType] || this.viewPhysicsConfig.default;
        console.log(`Using physics config for view "${viewType}":`, config.solver);
        return config;
    }

    // Method to manually set physics for a specific view
    setPhysicsForView(viewType, physicsConfig) {
        this.viewPhysicsConfig[viewType] = physicsConfig;
        console.log(`Custom physics configuration set for view: ${viewType}`);
        
        // If this is the current view, apply immediately
        if (this.currentEdgeType === viewType) {
            const newOptions = this.getNetworkOptions();
            this.network.setOptions(newOptions);
        }
    }

    // Set mass based on node connectivity for better stability
    setMassBasedOnConnectivity(edgeType) {
        const visibleEdges = this.edges.get().filter(edge => 
            edgeType === 'all' || edge.type === edgeType
        );
        
        // Calculate degree for each node in the current view
        const nodeDegrees = {};
        const allNodes = this.nodes.get();
        allNodes.forEach(node => nodeDegrees[node.id] = 0);
        
        visibleEdges.forEach(edge => {
            if (nodeDegrees[edge.from] !== undefined) nodeDegrees[edge.from]++;
            if (nodeDegrees[edge.to] !== undefined) nodeDegrees[edge.to]++;
        });
        
        // Update nodes with mass based on their connectivity in this view
        const updates = allNodes.map(node => {
            const degree = nodeDegrees[node.id] || 0;
            let mass;
            
            if (degree > 15) {
                mass = 24; // Super hubs - heavy anchors
            } else if (degree > 8) {
                mass = 18;  // Major hubs
            } else if (degree > 4) {
                mass = 12;  // Medium connectivity
            } else if (degree > 1) {
                mass = 6;  // Normal nodes
            } else {
                mass = 1;  // Leaf nodes or isolated
            }
            
            return { 
                id: node.id, 
                mass: mass,
                // Preserve other properties
                originalMass: node.mass || 3 // Store original mass
            };
        });
        
        this.nodes.update(updates);
        
        // Log connectivity stats
        const maxDegree = Math.max(...Object.values(nodeDegrees));
        const avgDegree = Object.values(nodeDegrees).reduce((a, b) => a + b, 0) / Object.values(nodeDegrees).length;
        console.log(`Updated node masses for "${edgeType}": max degree ${maxDegree}, avg degree ${avgDegree.toFixed(1)}`);
    }

    // Enhanced method to switch between different edge/node views with manual physics
    setEdgeViewByType(type) {
        if (!this.edges || !this.nodes) return;
        
        this.showFilteringIndicator(true);
        
        console.log(`Switching to view: ${type}`);
        this.currentEdgeType = type;
        
        setTimeout(() => {
            try {
                const edgeFilterFunction = type === 'all' ? 
                    () => true : 
                    (edge) => edge.type === type;
                    
                const nodeFilterFunction = type === 'all' ? 
                    () => true : 
                    (node) => this.shouldNodeBeVisible(node.id, type);
                
                this.edgesDataView = new vis.DataView(this.edges, {
                    filter: edgeFilterFunction
                });
                
                this.nodesDataView = new vis.DataView(this.nodes, {
                    filter: nodeFilterFunction
                });
                
                // Set mass based on connectivity for this specific view
                this.setMassBasedOnConnectivity(type);
                
                // Get the specific physics configuration for this view
                const newOptions = this.getNetworkOptions();
                
                // Update the network with the new DataViews AND new physics options
                this.network.setData({
                    nodes: this.nodesDataView,
                    edges: this.edgesDataView
                });
                
                this.network.setOptions(newOptions);
                
                const visibleEdges = this.edgesDataView.get();
                const visibleNodes = this.nodesDataView.get();
                console.log(`View "${type}": ${visibleNodes.length} nodes, ${visibleEdges.length} edges`);
                
                setTimeout(() => {
                    this.network.fit({
                        animation: {
                            duration: 500,
                            easingFunction: 'easeInOutQuad'
                        }
                    });
                    
                    setTimeout(() => {
                        this.showFilteringIndicator(false);
                    }, 600);
                }, 100);
                
            } catch (error) {
                console.error('Error during view switching:', error);
                this.showFilteringIndicator(false);
            }
        }, 50);
    }

    showFilteringIndicator(show) {
        let indicator = document.getElementById('filtering-indicator');
        
        if (!indicator) {
            indicator = document.createElement('div');
            indicator.id = 'filtering-indicator';
            indicator.className = 'filtering-indicator';
            indicator.innerHTML = `
                <div class="spinner"></div>
                <span>Switching view...</span>
            `;
            document.body.appendChild(indicator);
        }
        
        if (show) {
            indicator.style.display = 'flex';
            indicator.style.opacity = '1';
        } else {
            indicator.style.opacity = '0';
            setTimeout(() => {
                indicator.style.display = 'none';
            }, 300);
        }
    }

    getAvailableEdgeTypes() {
        const allEdges = this.edges.get();
        const types = [...new Set(allEdges.map(edge => edge.type))];
        return types.sort();
    }

    populateEdgeFilterDropdown() {
        const dropdown = document.getElementById('edge-filter');
        if (!dropdown) return;

        const types = this.getAvailableEdgeTypes();
        
        dropdown.innerHTML = '';
        
        const allOption = document.createElement('option');
        allOption.value = 'all';
        allOption.textContent = 'All Connections';
        dropdown.appendChild(allOption);
        
        types.forEach(type => {
            const option = document.createElement('option');
            option.value = type;
            option.textContent = this.formatEdgeTypeName(type);
            if (type === this.currentEdgeType) {
                option.selected = true;
            }
            dropdown.appendChild(option);
        });
        
        console.log(`Populated dropdown with ${types.length} edge types:`, types);
    }

    formatEdgeTypeName(type) {
        return type
            .replace(/([A-Z])/g, ' $1')
            .replace(/_/g, ' ')
            .replace(/^./, str => str.toUpperCase())
            .trim();
    }

    // Progressive image loading methods (unchanged)
    startProgressiveImageLoading() {
        if (this.isProgressiveLoadingActive) return;
        this.isProgressiveLoadingActive = true;
        this.buildImageLoadQueue();
        this.loadNextImageBatch();
    }

    buildImageLoadQueue() {
        const allNodes = this.nodes.get();
        this.imageLoadQueue = allNodes
            .filter(node => node.imageUrl && !this.loadedImages.has(node.id))
            .map(node => node.id);
        
        console.log(`Queued ${this.imageLoadQueue.length} images for progressive loading`);
    }

    async loadNextImageBatch() {
        if (this.imageLoadQueue.length === 0) {
            console.log('Progressive image loading completed');
            this.isProgressiveLoadingActive = false;
            return;
        }

        const batchSize = Math.min(this.performanceConfig.imageLoadBatchSize, this.imageLoadQueue.length);
        const batch = this.imageLoadQueue.splice(0, batchSize);

        const loadPromises = batch.map(nodeId => this.loadImageForNode(nodeId));
        
        try {
            await Promise.all(loadPromises);
        } catch (error) {
            console.warn('Some images failed to load in batch:', error);
        }

        setTimeout(() => {
            this.loadNextImageBatch();
        }, this.performanceConfig.imageLoadDelay);
    }

    async loadImageForNode(nodeId) {
        return new Promise((resolve) => {
            const node = this.nodes.get(nodeId);
            if (!node || !node.imageUrl || this.loadedImages.has(nodeId)) {
                resolve();
                return;
            }

            const img = new Image();
            
            img.onload = () => {
                this.updateNodeWithImage(nodeId, node);
                this.loadedImages.add(nodeId);
                resolve();
            };

            img.onerror = () => {
                console.warn(`Failed to load image for node ${nodeId}: ${node.imageUrl}`);
                if (node.brokenImage) {
                    this.updateNodeWithImage(nodeId, node, node.brokenImage);
                }
                this.loadedImages.add(nodeId);
                resolve();
            };

            img.src = node.imageUrl;
        });
    }

    updateNodeWithImage(nodeId, node, imageUrl = null) {
        const updatedNode = {
            id: nodeId,
            shape: 'circularImage',
            image: imageUrl || node.imageUrl,
            brokenImage: node.brokenImage || './assets/other/lol.png',
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

        this.nodes.update(updatedNode);
    }

    toggleProgressiveLoading(enabled) {
        this.performanceConfig.progressiveLoading = enabled;
        
        if (enabled && !this.isProgressiveLoadingActive) {
            this.startProgressiveImageLoading();
        } else if (!enabled) {
            this.isProgressiveLoadingActive = false;
            this.imageLoadQueue = [];
        }
    }

    loadAllImagesNow() {
        this.performanceConfig.imageLoadBatchSize = this.imageLoadQueue.length;
        this.performanceConfig.imageLoadDelay = 0;
        this.loadNextImageBatch();
    }

    refreshCurrentView() {
        this.setEdgeViewByType(this.currentEdgeType);
    }

    debugAvailableTypes() {
        if (!this.edges) {
            console.log('No edges data available');
            return [];
        }
        const allEdges = this.edges.get();
        const types = [...new Set(allEdges.map(edge => edge.type || 'undefined'))];
        console.log('Available edge types in data:', types);
        console.log('Total edges by type:');
        types.forEach(type => {
            const count = allEdges.filter(edge => (edge.type || 'undefined') === type).length;
            console.log(`  ${type}: ${count} edges`);
        });
        return types;
    }

    resetToDefaultView() {
        console.log('Resetting to default view...');
        this.currentEdgeType = 'relMain';
        
        this.edgesDataView = new vis.DataView(this.edges, {
            filter: (edge) => edge.type === 'relMain'
        });
        
        this.nodesDataView = new vis.DataView(this.nodes, {
            filter: (node) => this.shouldNodeBeVisible(node.id, 'relMain')
        });
        
        const newOptions = this.getNetworkOptions();
        this.network.setData({
            nodes: this.nodesDataView,
            edges: this.edgesDataView
        });
        this.network.setOptions(newOptions);
        
        this.network.fit();
    }

    getNetworkOptions() {
        const physicsConfig = this.getPhysicsConfigForView(this.currentEdgeType);
        
        return {
            physics: {
                enabled: true,
                ...physicsConfig
            },
            layout: {
                improvedLayout: true,
                clusterThreshold: 150
            },
            interaction: {
                hover: true,
                tooltipDelay: 200,
                dragNodes: false,
                dragView: true,
                zoomView: true
            }
        };
    }

    setupEventListeners() {
        this.network.on('selectNode', (params) => {
            if (params.nodes.length === 0) return;
            const nodeId = params.nodes[0];
            const node = this.nodes.get(nodeId);
            const pointer = params.pointer.DOM;
            this.onNodeSelected(node, pointer);
        });

        this.network.on('deselectNode', () => {
            console.log('Node deselected');
            const tooltipPanel = document.getElementById('champion-tooltip-panel');
            if (tooltipPanel) tooltipPanel.style.display = 'none';
        });
        
        const container = this.network.body.container;
        this.network.on('hoverNode', () => {
            container.style.cursor = 'pointer';
        });
        this.network.on('blurNode', () => {
            container.style.cursor = 'default';
        });

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

    async onNodeSelected(node, pos) {
        console.log('Node selected:', {
            id: node.id,
            label: node.label,
            description: node.title
        });

        const tooltipPanel = document.getElementById('champion-tooltip-panel');
        const roleSelector = document.getElementById('role-selector');

        if (!tooltipPanel || !roleSelector || !node.slugWidget) {
            if (tooltipPanel) tooltipPanel.style.display = 'none';
            console.log('Node selected:', {
                id: node.id,
                label: node.label,
                description: node.title
            });
            return;
        }

        tooltipPanel.style.display = "block";
        this.currentChampionSlug = node.slugWidget;

        const roles = ['TOP', 'JUNGLE', 'MID', 'ADC', 'SUPPORT'];
        const defaultRole = 'MID';

        roleSelector.innerHTML = roles.map(role => `<option value="${role}">${role}</option>`).join('');
        roleSelector.value = defaultRole;

        this.renderChampionWidget(this.currentChampionSlug, defaultRole);
    }

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

// Instantiate the class and make it globally accessible
const networkVisualizer = new NetworkVisualization();
document.addEventListener('DOMContentLoaded', () => {
    networkVisualizer.init();
});

window.networkVisualizer = networkVisualizer;
class NetworkVisualization {
    constructor() {
        this.network = null;
        this.nodes = null;
        this.edges = null;
        this.edgesDataView = null;
        this.isStabilizing = false;
        this.lastScale = 1;
        this.currentChampionSlug = null;
        this.imageLoadQueue = []; // Queue for progressive image loading
        this.loadedImages = new Set(); // Track loaded images
        this.isProgressiveLoadingActive = false;

        this.performanceConfig = {
            enableImages: true,
            maxImageSize: 64,
            zoomThreshold: 0.4,
            hideLabelsThreshold: 0.7,
            progressiveLoading: true,
            imageLoadBatchSize: 5, // Load 5 images at a time
            imageLoadDelay: 100 // Delay between batches in ms
        };
    }

    async init() {
        try {
            await this.loadNetworkData();
            this.createNetwork();
            this.setupEventListeners();
            
            // Start progressive image loading after network is created
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
        this.nodes = new vis.DataSet(nodeData.map(node => this.createNodeConfig(node, false))); // Start without images
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

        // Store image info for progressive loading
        if (node.image && this.performanceConfig.enableImages) {
            baseConfig.imageUrl = node.image;
            baseConfig.brokenImage = node.brokenImage || 'img/default.png';
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
                brokenImage: node.brokenImage || 'img/default.png',
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
            // Use a styled dot shape initially, with colors that indicate it will have an image
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
            type: edge.type || 'main',
            width: edge.width || 1,
            length: edge.length || 60,
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
            filter: (edge) => edge.type === 'relMain'
        });

        this.network = new vis.Network(container, {
            nodes: this.nodes,
            edges: this.edgesDataView
        }, this.getNetworkOptions());

        console.log('Network visualization created successfully (without images)');
    }

    // Progressive image loading methods
    startProgressiveImageLoading() {
        if (this.isProgressiveLoadingActive) return;
        this.isProgressiveLoadingActive = true;

        // Build queue of nodes that need images
        this.buildImageLoadQueue();
        
        // Start loading images in batches
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

        // Load images for this batch
        const loadPromises = batch.map(nodeId => this.loadImageForNode(nodeId));
        
        try {
            await Promise.all(loadPromises);
        } catch (error) {
            console.warn('Some images failed to load in batch:', error);
        }

        // Schedule next batch
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
                // Image loaded successfully, update the node
                this.updateNodeWithImage(nodeId, node);
                this.loadedImages.add(nodeId);
                resolve();
            };

            img.onerror = () => {
                // Image failed to load, try broken image or keep as dot
                console.warn(`Failed to load image for node ${nodeId}: ${node.imageUrl}`);
                if (node.brokenImage) {
                    this.updateNodeWithImage(nodeId, node, node.brokenImage);
                }
                this.loadedImages.add(nodeId); // Mark as processed
                resolve();
            };

            // Start loading the image
            img.src = node.imageUrl;
        });
    }

    updateNodeWithImage(nodeId, node, imageUrl = null) {
        const updatedNode = {
            id: nodeId,
            shape: 'circularImage',
            image: imageUrl || node.imageUrl,
            brokenImage: node.brokenImage || 'img/default.png',
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

    // Method to toggle progressive loading on/off
    toggleProgressiveLoading(enabled) {
        this.performanceConfig.progressiveLoading = enabled;
        
        if (enabled && !this.isProgressiveLoadingActive) {
            this.startProgressiveImageLoading();
        } else if (!enabled) {
            this.isProgressiveLoadingActive = false;
            this.imageLoadQueue = [];
        }
    }

    // Method to load all remaining images immediately
    loadAllImagesNow() {
        this.performanceConfig.imageLoadBatchSize = this.imageLoadQueue.length;
        this.performanceConfig.imageLoadDelay = 0;
        this.loadNextImageBatch();
    }

    setEdgeViewByType(type) {
        if (this.edgesDataView) {
            if (type === 'all') {
                this.edgesDataView.setOptions({ filter: (edge) => true });
            } else {
                this.edgesDataView.setOptions({
                    filter: (edge) => edge.type === type
                });
            }
            this.network.fit();
        }
    }

    getNetworkOptions() {
        return {
            physics: {
                enabled: true,
                solver: 'barnesHut'
            },
            interaction: {
                hover: true,
                dragNodes: false,
                zoomView: true,
                dragView: true
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

        if (!tooltipPanel || !roleSelector || !node.slugWidget) {
            if (tooltipPanel) tooltipPanel.style.display = 'none';
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
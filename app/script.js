class NetworkVisualization {
    constructor() {
        this.network = null;
        this.nodes = null;
        this.edges = null;
        this.edgesDataView = null;
        this.nodesDataView = null;
        this.isStabilizing = false;
        this.lastScale = 1;
        this.imageLoadQueue = [];
        this.loadedImages = new Set();
        this.isProgressiveLoadingActive = false;
        this.currentEdgeType = 'relMain';

        // Properties for the builds popup
        this.buildsPopup = null;
        this.popupChampionName = null;
        this.popupLinksContainer = null;
        this.popupCloseBtn = null;

        // This will be loaded from build_sites.json
        this.BUILD_SITES = [];

        // Manual physics configurations for each view
        this.viewPhysicsConfig = {
            'relMain': {
                solver: 'barnesHut',
                barnesHut: { gravitationalConstant: -1800, centralGravity: 0.9 },
                stabilization: { enabled: true, iterations: 1000, fit: true }, // Lowered from 2000
                adaptiveTimestep: true
            },
            'relItems': {
                solver: 'forceAtlas2Based',
                forceAtlas2Based: { gravitationalConstant: -200, centralGravity: 0.05, springLength: 150, springConstant: 0.05, damping: 1.0, avoidOverlap: 0.4 },
                maxVelocity: 15,
                minVelocity: 0.01,
                stabilization: { enabled: true, iterations: 1500, fit: true }, // Lowered from 4000
                adaptiveTimestep: true,
                timestep: 0.25
            },
            'default': {
                solver: 'forceAtlas2Based',
                forceAtlas2Based: { gravitationalConstant: -200, centralGravity: 0.005, springLength: 150, springConstant: 0.05, damping: 0.95, avoidOverlap: 0.4 },
                minVelocity: 0.01,
                stabilization: { enabled: true, iterations: 1500, fit: true }, // Lowered from 4000
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
            imageLoadBatchSize: 10,
            imageLoadDelay: 5
        };
    }

    async init() {
        try {
            await Promise.all([
                this.loadNetworkData(),
                this.loadBuildSites()
            ]);

            this.createNetwork();

            this.buildsPopup = document.getElementById('builds-popup');
            this.popupChampionName = document.getElementById('popup-champion-name');
            this.popupLinksContainer = document.getElementById('popup-links-container');
            this.popupCloseBtn = document.getElementById('popup-close-btn');

            this.setupEventListeners();
            this.populateEdgeFilterDropdown();

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
    
    async loadBuildSites() {
        try {
            const response = await fetch('data/build_sites.json');
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            this.BUILD_SITES = await response.json();
            console.log('Successfully loaded build sites configuration.');
        } catch (err) {
            console.error("Could not load build sites configuration:", err);
            this.BUILD_SITES = [];
        }
    }

    processNodes(nodeData) {
        this.nodes = new vis.DataSet(nodeData.map(node => this.createNodeConfig(node, false)));
    }

    createNodeConfig(node, withImage = true) {
        const baseConfig = {
            id: node.id,
            label: node.label,
            title: node.description,
            slug: node.slug,
            type: node.type,
            size: node.size || 20,
            originalSize: node.size || 20,
            mass: node.mass || 3,
            borderWidth: node.BrWidth || 2,
            borderWidthSelected: node.BrWidthSel || 3,
            shadow: false,
            font: {
                color: '#f0f0f0',
                size: 14,
                face: 'Spiegel TT, sans-serif',
                weight: 'normal',
                strokeWidth: 6,
                strokeColor: '#000e22'
            }
        };

        if (node.image && this.performanceConfig.enableImages) {
            baseConfig.imageUrl = node.image;
            baseConfig.brokenImage = node.brokenImage || './assets/other/lol.png';
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
                    hover: node.brColorHg || '#d4c178',
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
                size: 40,
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

        this.network.once('stabilizationIterationsDone', () => {
            console.log('Initial stabilization complete.');
            this.showFilteringIndicator(false);
            // Defer these tasks until after the user sees the network
            this.populateEdgeFilterDropdown();
            if (this.performanceConfig.progressiveLoading && this.performanceConfig.enableImages) {
                this.startProgressiveImageLoading();
            }
        });

        console.log('Network visualization created successfully');
    }
    
    shouldNodeBeVisible(nodeId, edgeType) {
        if (edgeType === 'all') return true;
        const allEdges = this.edges.get();
        const relevantEdges = allEdges.filter(edge => edge.type === edgeType);
        return relevantEdges.some(edge => edge.from === nodeId || edge.to === nodeId);
    }

    getPhysicsConfigForView(viewType) {
        const config = this.viewPhysicsConfig[viewType] || this.viewPhysicsConfig.default;
        return config;
    }
    
    setEdgeViewByType(type) {
        if (!this.edges || !this.nodes) return;
        this.showFilteringIndicator(true);
        this.currentEdgeType = type;
        setTimeout(() => {
            try {
                const edgeFilterFunction = type === 'all' ? () => true : (edge) => edge.type === type;
                const nodeFilterFunction = type === 'all' ? () => true : (node) => this.shouldNodeBeVisible(node.id, type);
                this.edgesDataView = new vis.DataView(this.edges, { filter: edgeFilterFunction });
                this.nodesDataView = new vis.DataView(this.nodes, { filter: nodeFilterFunction });
                this.setMassBasedOnConnectivity(type);
                const newOptions = this.getNetworkOptions();
                this.network.setData({
                    nodes: this.nodesDataView,
                    edges: this.edgesDataView
                });
                this.network.setOptions(newOptions);
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
            indicator.innerHTML = `<div class="spinner"></div><span>Switching view...</span>`;
            document.body.appendChild(indicator);
        }
        indicator.style.display = show ? 'flex' : 'none';
        indicator.style.opacity = show ? '1' : '0';
    }

    getAvailableEdgeTypes() {
        const allEdges = this.edges.get();
        const types = [...new Set(allEdges.map(edge => edge.type))];
        return types.sort();
    }

    populateEdgeFilterDropdown() {
        const dropdown = document.getElementById('edge-filter');
        if (!dropdown) return;
        const existingValues = new Set(Array.from(dropdown.options).map(opt => opt.value));
        const types = this.getAvailableEdgeTypes();
        if (!existingValues.has('all')) {
            const allOption = document.createElement('option');
            allOption.value = 'all';
            allOption.textContent = 'All Connections';
            dropdown.appendChild(allOption);
        }
        types.forEach(type => {
            if (!existingValues.has(type)) {
                const option = document.createElement('option');
                option.value = type;
                option.textContent = this.formatEdgeTypeName(type);
                dropdown.appendChild(option);
            }
        });
        dropdown.value = this.currentEdgeType;
    }

    formatEdgeTypeName(type) {
        return type.replace(/([A-Z])/g, ' $1').replace(/_/g, ' ').replace(/^./, str => str.toUpperCase()).trim();
    }

    startProgressiveImageLoading() {
        if (this.isProgressiveLoadingActive) return;
        this.isProgressiveLoadingActive = true;
        this.buildImageLoadQueue();
        this.loadNextImageBatch();
    }

    buildImageLoadQueue() {
        const allNodes = this.nodes.get();
        this.imageLoadQueue = allNodes.filter(node => node.imageUrl && !this.loadedImages.has(node.id)).map(node => node.id);
    }

    async loadNextImageBatch() {
        if (this.imageLoadQueue.length === 0) {
            this.isProgressiveLoadingActive = false;
            return;
        }
        const batchSize = Math.min(this.performanceConfig.imageLoadBatchSize, this.imageLoadQueue.length);
        const batch = this.imageLoadQueue.splice(0, batchSize);
        await Promise.all(batch.map(nodeId => this.loadImageForNode(nodeId)));
        setTimeout(() => this.loadNextImageBatch(), this.performanceConfig.imageLoadDelay);
    }

    async loadImageForNode(nodeId) {
        return new Promise((resolve) => {
            const node = this.nodes.get(nodeId);
            if (!node || !node.imageUrl || this.loadedImages.has(nodeId)) {
                return resolve();
            }
            const img = new Image();
            img.onload = () => {
                this.updateNodeWithImage(nodeId, node);
                this.loadedImages.add(nodeId);
                resolve();
            };
            img.onerror = () => {
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
                hover: node.brColorHg || '#d4c178',  // <-- This line is present
                highlight: {
                    border: node.brColorHg || '#d4c178',
                    background: node.bgColorHg || '#180d43'
                }
            }
        };
        this.nodes.update(updatedNode);
    }
    
    getNetworkOptions() {
        const physicsConfig = this.getPhysicsConfigForView(this.currentEdgeType);
        return {
            physics: { enabled: true, ...physicsConfig },
            layout: { improvedLayout: false, clusterThreshold: 150 },
            interaction: { hover: true, tooltipDelay: 200, dragNodes: false, dragView: true, zoomView: true }
        };
    }

    setupEventListeners() {
        this.network.on('selectNode', (params) => {
            if (params.nodes.length > 0) {
                const node = this.nodes.get(params.nodes[0]);
                this.onNodeSelected(node, params.pointer.DOM);
            } else {
                this.hideBuildsPopup();
            }
        });

        this.network.on('deselectNode', () => this.hideBuildsPopup());
        this.popupCloseBtn.addEventListener('click', () => {
            this.hideBuildsPopup();
            this.network.unselectAll();
        });

        const container = this.network.body.container;
        this.network.on('hoverNode', () => container.style.cursor = 'pointer');
        this.network.on('blurNode', () => container.style.cursor = 'default');
    }

    async onNodeSelected(node, pos) {
        if (node.slug) {
            this.showBuildsPopup(node, pos);
        } else {
            this.hideBuildsPopup();
        }
    }
    
    showBuildsPopup(node, pos) {
        if (!this.buildsPopup || this.BUILD_SITES.length === 0) return;

        // 1. Populate Content
        this.popupChampionName.textContent = `${node.label} Builds`;
        this.popupLinksContainer.innerHTML = ''; 
        const championUrlName = node.slug;

        this.BUILD_SITES.forEach(site => {
            const link = document.createElement('a');
            link.href = site.url.replace('{champion}', championUrlName);
            link.target = '_blank';
            link.rel = 'noopener noreferrer';
            link.className = 'build-link';
            link.innerHTML = `<img src="${site.icon}" alt="${site.name} icon"><span>${site.name}</span>`;
            this.popupLinksContainer.appendChild(link);
        });

        // 2. Show Popup to measure its dimensions
        this.buildsPopup.classList.add('show');
        this.buildsPopup.classList.add('no-pointer-events'); // Add the disabling class

        // Remove the disabling class after the ghost click delay
        setTimeout(() => {
            this.buildsPopup.classList.remove('no-pointer-events');
        }, 400);

        // 3. Robustly calculate position to stay in viewport
        const popupRect = this.buildsPopup.getBoundingClientRect();
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;
        const margin = 15; // Offset from cursor and viewport edge

        let left = pos.x + margin;
        let top = pos.y + margin;

        // Adjust horizontal position if it overflows right
        if (left + popupRect.width > viewportWidth - margin) {
            left = pos.x - popupRect.width - margin;
        }
        // Clamp to left edge if it overflows left
        if (left < margin) {
            left = margin;
        }

        // Adjust vertical position if it overflows bottom
        if (top + popupRect.height > viewportHeight - margin) {
            top = pos.y - popupRect.height - margin;
        }
        // Clamp to top edge if it overflows top
        if (top < margin) {
            top = margin;
        }
        
        // 4. Apply final position
        this.buildsPopup.style.left = `${left}px`;
        this.buildsPopup.style.top = `${top}px`;
    }

    hideBuildsPopup() {
        if (this.buildsPopup) {
            this.buildsPopup.classList.remove('show');
        }
    }

    showError(msg) {
        document.getElementById('mynetwork').innerHTML = `<div style="color:red">${msg}</div>`;
    }
}

const networkVisualizer = new NetworkVisualization();
document.addEventListener('DOMContentLoaded', () => {
    networkVisualizer.init();
});

window.networkVisualizer = networkVisualizer;
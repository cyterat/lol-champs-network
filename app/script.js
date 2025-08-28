class NetworkVisualization {
    constructor() {
        this.network = null;
        this.nodes = null;
        this.edges = null;
        this.isStabilizing = false;
        this.imageCache = new Map();
        this.lastScale = 1;
        this.performanceThrottleTimeout = null;
        
        // Performance settings
        this.performanceConfig = {
            enableImages: true,
            maxImageSize: 64, // Max image resolution
            useImageCache: true,
            zoomThreshold: 0.4, // Below this scale, apply aggressive optimizations
            hideLabelsThreshold: 0.6 // Below this scale, hide labels
        };
    }

    /**
     * Initialize the network visualization
     */
    async init() {
        try {
            await this.loadNetworkData();
            this.createNetwork();
            this.setupEventListeners();
        } catch (error) {
            console.error('Failed to initialize network:', error);
            this.showError('Failed to initialize network visualization');
        }
    }

    /**
     * Load and process network data from JSON file
     */
    async loadNetworkData() {
        const response = await fetch('data/data.json');
        const data = await response.json();
        
        this.processNodes(data.nodes);
        this.processEdges(data.edges);
    }

    /**
     * Process node data with performance optimizations
     */
    processNodes(nodeData) {
        const processedNodes = nodeData.map(node => this.createNodeConfig(node));
        this.nodes = new vis.DataSet(processedNodes);
    }

    /**
     * Create optimized node configuration
     */
    createNodeConfig(node) {
        const baseConfig = {
            id: node.id,
            label: node.label,
            title: this.formatTooltip(node.description),
            size: node.size || 20,
            originalSize: node.size || 20, // backup size, to acoid permanent shrink on zoom out
            mass: node.mass || 3,
            borderWidth: node.BrWidth || 2,
            borderWidthSelected: node.BrWidthSel || 3,
            borderWidthOriginal: node.BrWidth || 2,
            shadow: false,
            font: {
                color: '#FFFFFF',
                size: 14,
                face: 'Arial, sans-serif',
                strokeWidth: 3,
                strokeColor: '#343434'
            }
        };

        // Optimize image handling for performance
        if (this.performanceConfig.enableImages && node.image) {
            return {
                ...baseConfig,
                shape: 'circularImage',
                image: node.image,
                brokenImage: node.brokenImage || 'img/default.png',
                color: {
                    border: node.brColor|| '#C79B3B',
                    background: node.bgColor || '#180d43',
                    hover: node.brColorHg || '#d4c178',
                    highlight: {
                        border: node.brColorHg || '#d4c178',
                        background: node.bgColorHg || '#1e1155'
                    }
                }
            };
        } else {
            return {
                ...baseConfig,
                shape: 'dot',
                color: {
                    border: '#C79B3B',
                    background: this.getNodeColor(node.type),
                    highlight: {
                        border: '#d4c178',
                        background: '#1e1155'
                    }
                }
            };
        }
    }

    /**
     * Get node color based on type
     */
    getNodeColor(type) {
        const colorMap = {
            'brand': '#FF6B6B',
            'champion': '#4ECDC4', 
            'class': '#45B7D1',
            'default': '#95A5A6'
        };
        return colorMap[type] || colorMap.default;
    }

    /**
     * Process edge data
     */
    processEdges(edgeData) {
        const processedEdges = edgeData.map(edge => ({
            from: edge.from,
            to: edge.to,
            width: edge.weight || 1,
            label: edge.label || '',
            color: {
                color: edge.color || '#848484',
                highlight: '#2B7CE9',
                hover: '#cccccc'
            },
            dashes: edge.dashes || false,
            font: {
                color: '#ffffff',
                size: 10,
                strokeWidth: 3,
                strokeColor: '#333333',
                face: 'Arial, sans-serif'
            },
            arrows: {
                from: edge.arrowToSource || false,
                to: edge.arrowToTarget || false
            },
            smooth: {
                enabled: false
            }
        }));
        
        this.edges = new vis.DataSet(processedEdges);
    }

    /**
     * Format tooltip text
     */
    formatTooltip(label, description) {
        if (!description) return label;
        
        const maxLength = 200; // Limit tooltip length for performance
        const truncated = description.length > maxLength 
            ? description.substring(0, maxLength) + '...' 
            : description;
            
        return `${label}\n\n${truncated}`;
    }

    /**
     * Create the network with optimized settings
     */
    createNetwork() {
        const container = document.getElementById('mynetwork');
        if (!container) {
            throw new Error('Network container not found');
        }

        const networkData = {
            nodes: this.nodes,
            edges: this.edges
        };

        const options = this.getNetworkOptions();
        this.network = new vis.Network(container, networkData, options);
        
        console.log('Network visualization created successfully');
    }

    /**
     * Get optimized network options
     */
    getNetworkOptions() {
        return {
            // Physics configuration for dandelion structure
            physics: {
                enabled: true,
                stabilization: {
                    enabled: true,
                    iterations: 600, // Further reduced for better performance
                    updateInterval: 100,
                    fit: true
                },
                solver: 'barnesHut',
                barnesHut: {
                    gravitationalConstant: -4000,
                    centralGravity: 1,
                    springLength: 50,
                    springConstant: 0.2,
                    damping: 0.3,
                    avoidOverlap: 5.0
                },
                maxVelocity: 20, // Reduced for stability
                minVelocity: 1,
                timestep: 0.25, // Smaller timesteps for smoother animation
                adaptiveTimestep: true
            },

            // Interaction settings
            interaction: {
                hover: true,
                hoverConnectedEdges: false, // Disabled for performance
                selectConnectedEdges: true, // Disable for performance
                tooltipDelay: 300,
                hideEdgesOnDrag: true, // Keep edges visible during drag
                hideNodesOnDrag: false, // Keep nodes visible during drag
                zoomView: true,
                dragView: true,
                dragNodes: false, // Disabled node dragging
                zoomSpeed: 1,
                minZoom: 0.3, // Prevent excessive zoom out
                maxZoom: 3.0  // Reasonable zoom in limit
            },

            // Node styling with performance optimizations
            nodes: {
                scaling: {
                    min: 8,
                    max: 40,
                    label: {
                        enabled: true,
                        min: 8,
                        max: 20
                    }
                },
                // Disable shadows by default for better performance
                shadow: {
                    enabled: false
                }
            },

            // Edge styling with performance optimizations
            edges: {
                width: 1,
                scaling: {
                    min: 0.5,
                    max: 2
                },
                smooth: {
                    enabled: false, // Disable smooth edges for better performance
                    type: 'continuous',
                    roundness: 0.1
                }
            },

            // Layout settings
            layout: {
                improvedLayout: true,
                clusterThreshold: 100, // Lower threshold for better clustering
                hierarchical: false
            },

            // Performance optimizations
            configure: {
                enabled: false
            }
        };
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Stabilization progress
        this.network.on('stabilizationProgress', (params) => {
            this.isStabilizing = true;
            const progress = Math.round((params.iterations / params.total) * 100);
            console.log(`Stabilization: ${progress}%`);
        });

        // Stabilization complete
        this.network.on('stabilizationIterationsDone', () => {
            this.isStabilizing = false;
            console.log('Network stabilized');
            // Optionally reduce physics after stabilization
            this.network.setOptions({
                physics: {
                    enabled: false // Disable physics after stabilization
                }
            });
        });

        // Node selection
        this.network.on('selectNode', (params) => {
            if (params.nodes.length > 0) {
                const nodeId = params.nodes[0];
                const node = this.nodes.get(nodeId);
                this.onNodeSelected(node);
            }
        });

        // Double click to fit view
        this.network.on('doubleClick', (params) => {
            if (params.nodes.length === 0) {
                this.fitNetwork();
            }
        });

        // Handle zoom for performance with throttling
        let zoomTimeout;
        this.network.on('zoom', (params) => {
            clearTimeout(zoomTimeout);
            
            zoomTimeout = setTimeout(() => {
                this.handleZoomPerformance(params);
            }, 100); // Throttle zoom events
        });

        // Add viewport change listener for additional optimizations
        this.network.on('beforeDrawing', (ctx) => {
            const scale = this.network.getScale();
            
            // Skip some rendering operations when heavily zoomed out
            if (scale < 0.2) {
                // Optionally implement custom drawing optimizations here
            }
        });
    }

    /**
     * Handle performance optimizations based on zoom level
     */
    handleZoomPerformance(params) {
        const scale = this.network.getScale();
        
        // Only hide labels when heavily zoomed out, keep nodes/edges visible
        if (scale < this.performanceConfig.hideLabelsThreshold && this.lastScale >= this.performanceConfig.hideLabelsThreshold) {
            console.log('Hiding labels for performance');
            this.network.setOptions({
                nodes: { 
                    font: { size: 0 }
                },
                edges: { 
                    font: { size: 0 }
                }
            });
            
        } else if (scale >= this.performanceConfig.hideLabelsThreshold && this.lastScale < this.performanceConfig.hideLabelsThreshold) {
            console.log('Showing labels');
            this.network.setOptions({
                nodes: { 
                    font: { size: 12 }
                },
                edges: { 
                    font: { size: 10 }
                }
            });
        }
        
        // Only apply minimal optimizations for very zoomed out views
        if (scale < this.performanceConfig.zoomThreshold && this.lastScale >= this.performanceConfig.zoomThreshold) {
            console.log('Entering minimal performance mode');
            // Only reduce image quality, don't hide them completely
            this.reduceImageQuality(true);
            
        } else if (scale >= this.performanceConfig.zoomThreshold && this.lastScale < this.performanceConfig.zoomThreshold) {
            console.log('Restoring full quality');
            this.reduceImageQuality(false);
        }
        
        this.lastScale = scale;
    }

    /**
     * Reduce image quality instead of hiding them completely
     */
    reduceImageQuality(reduce) {
        if (!this.performanceConfig.enableImages) return;
        
        // Instead of hiding images, we could reduce their size
        // keep images visible but smaller when zoomed out
        const updates = this.nodes.get().map(node => {
            if (node.shape === 'circularImage' || (node.image && reduce)) {
                return {
                    id: node.id,
                    size: reduce ? Math.max(8, (node.size || 20) * 0.7) : node.originalSize,
                    borderWidth: reduce ? 1 : node.borderWidthOriginal
                };
            }
            return null;
        }).filter(Boolean);
        
        if (updates.length > 0) {
            this.nodes.update(updates);
        }
    }

    /**
     * Handle node selection
     */
    onNodeSelected(node) {
        console.log('Selected node:', node);
        // Add your custom node selection logic here
    }

    /**
     * Show error message
     */
    showError(message) {
        const container = document.getElementById('mynetwork');
        container.innerHTML = `
            <div style="
                display: flex;
                justify-content: center;
                align-items: center;
                height: 100%;
                flex-direction: column;
                color: #666;
                font-family: Arial, sans-serif;
            ">
                <h3 style="color: #d32f2f; margin-bottom: 16px;">Error</h3>
                <p>${message}</p>
                <button onclick="location.reload()" style="
                    margin-top: 16px;
                    padding: 8px 16px;
                    background: #2196f3;
                    color: white;
                    border: none;
                    border-radius: 4px;
                    cursor: pointer;
                ">Retry</button>
            </div>
        `;
    }

    /**
     * Toggle images on/off for performance
     */
    toggleImages(enabled = !this.performanceConfig.enableImages) {
        this.performanceConfig.enableImages = enabled;
        
        // Update existing nodes
        const updates = this.nodes.get().map(node => {
            const originalNode = this.nodes.get(node.id);
            return this.createNodeConfig({
                ...originalNode,
                image: enabled ? originalNode.image : null
            });
        });
        
        this.nodes.update(updates);
    }

    /**
     * Switch to performance mode
     */
    enablePerformanceMode() {
        this.network.setOptions({
            physics: { enabled: false },
            interaction: {
                hideEdgesOnDrag: true,
                hideNodesOnDrag: true
            },
            edges: {
                smooth: { enabled: false }
            }
        });
        this.toggleImages(false);
        console.log('Performance mode enabled');
    }

    /**
     * Re-enable full features
     */
    enableFullMode() {
        this.network.setOptions(this.getNetworkOptions());
        this.toggleImages(true);
        console.log('Full mode enabled');
    }

    // Public API methods
    fitNetwork() {
        if (this.network) {
            this.network.fit({
                animation: {
                    duration: 500,
                    easingFunction: 'easeInOutQuart'
                }
            });
        }
    }

    redrawNetwork() {
        if (this.network) {
            this.network.redraw();
        }
    }

    addNode(nodeData) {
        const processedNode = this.createNodeConfig(nodeData);
        this.nodes.add(processedNode);
    }

    removeNode(nodeId) {
        this.nodes.remove(nodeId);
    }

    addEdge(edgeData) {
        this.edges.add(edgeData);
    }

    removeEdge(edgeId) {
        this.edges.remove(edgeId);
    }

    getNetwork() {
        return this.network;
    }

    getNodes() {
        return this.nodes;
    }

    getEdges() {
        return this.edges;
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', async function() {
    const networkViz = new NetworkVisualization();
    await networkViz.init();
    
    // Expose to global scope for external access
    window.NetworkViz = networkViz;
    
    // Add performance controls (optional)
    window.togglePerformanceMode = () => {
        if (networkViz.performanceConfig.enableImages) {
            networkViz.enablePerformanceMode();
        } else {
            networkViz.enableFullMode();
        }
    };
});
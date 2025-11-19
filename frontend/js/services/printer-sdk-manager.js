// js/services/printer-sdk-manager.js
// Unified iMin Printer SDK Manager with auto-detection


(function ($, window) {
    'use strict';

    window.PrinterSDKManager = {
        // SDK Configuration - VERIFY THESE PATHS MATCH YOUR FILES
        SDK_V1_PATH: '/js/libs/iminjsprinterv1sdk/imin-printer.js',
        SDK_V2_PATH: '/js/libs/iminjsprinterv2sdk/imin-printer.min.js', // Fixed filename
        DOM_TO_IMAGE_PATH: 'https://cdnjs.cloudflare.com/ajax/libs/dom-to-image/2.6.0/dom-to-image.min.js',
        currentSDK: null,
        currentVersion: null,
        printerInstance: null,
        isInitialized: false,
        detectedModel: null,

        // Printer Models Configuration
        PRINTER_MODELS: {
            'D4': {
                sdk_version: 1,
                print_width: 58,
                class_name: 'IminPrinter',
                detection_method: 'getDeviceModel'
            },
            'D4_PRO': {
                sdk_version: 2,
                print_width: 80,
                class_name: 'IminPrinter',
                detection_method: 'getDeviceModel'
            },
            'SWAN2': {
                sdk_version: 2,
                print_width: 80,
                class_name: 'IminPrinter',
                detection_method: 'getDeviceModel'
            }
        },
checkWebSocketServer: function() {
    return new Promise((resolve) => {
        const ws = new WebSocket('ws://127.0.0.1:8081/websocket');
        
        const timeout = setTimeout(() => {
            ws.close();
            resolve(false);
        }, 3000); // 3 second timeout
        
        ws.onopen = () => {
            clearTimeout(timeout);
            ws.close();
            resolve(true);
        };
        
        ws.onerror = () => {
            clearTimeout(timeout);
            resolve(false);
        };
    });
},
        /**
         * Initialize printer with auto-detection
         */
  async initialize() {
    const self = this;
    const wsAvailable = await this.checkWebSocketServer();
    
    if (!wsAvailable) {
        console.warn('iMin WebSocket server not available at ws://127.0.0.1:8081');
        return {
            success: false,
            error: 'Printer service not running',
            fallback: 'browser'
        };
    }
    try {
        console.log('Starting printer initialization...');


        // Load dom-to-image first
        if (typeof domtoimage === 'undefined') {
            console.log('Loading dom-to-image...');
            await this.loadScript(this.DOM_TO_IMAGE_PATH);
        }

        // Try SDK v2 first
        console.log('Attempting SDK v2 connection...');
        let connected = await this.trySDKVersion(2);

        if (!connected) {
            console.log('SDK v2 failed, trying SDK v1...');
            connected = await this.trySDKVersion(1);
        }

        if (connected) {
            this.isInitialized = true;
            console.log(`✓ Printer initialized: ${this.detectedModel} (SDK v${this.currentVersion})`);
            return {
                success: true,
                model: this.detectedModel,
                version: this.currentVersion,
                width: this.getPrintWidth()
            };
        } else {
            // Return success:false instead of throwing
            console.warn('No compatible printer detected - will use browser fallback');
            return {
                success: false,
                error: 'Printer not available',
                fallback: 'browser'
            };
        }

    } catch (error) {
        console.error('Printer initialization error:', error);
        this.isInitialized = false;
        return {
            success: false,
            error: error.message,
            fallback: 'browser'
        };
    }
},

        /**
         * Try specific SDK version
         */
        async trySDKVersion(version) {
            try {
                const sdkPath = version === 1 ? this.SDK_V1_PATH : this.SDK_V2_PATH;
                console.log(`Trying SDK v${version} from:`, sdkPath);

                // Check if file is accessible
                const response = await fetch(sdkPath, { method: 'HEAD' });
                if (!response.ok) {
                    console.error(`SDK v${version} file not accessible:`, response.status, response.statusText);
                    return false;
                }
                console.log(`SDK v${version} file is accessible`);

                // Load SDK
                if (!this.isSDKLoaded(version)) {
                    await this.loadScript(sdkPath);
                    console.log(`SDK v${version} loaded`);
                }

                // Verify IminPrinter class exists
                if (typeof window.IminPrinter === 'undefined') {
                    console.error(`IminPrinter class not found after loading SDK v${version}`);
                    return false;
                }

                // Create printer instance
                console.log(`Creating printer instance for SDK v${version}...`);
                this.printerInstance = new window.IminPrinter();

                // Try to connect
                console.log(`Connecting to printer...`);
                const connected = await this.printerInstance.connect();

                if (connected) {
                    this.currentVersion = version;
                    console.log(`Connected to printer with SDK v${version}`);

                    // Detect model
                    await this.detectPrinterModel();

                    // Validate model matches SDK
                    if (this.validateModelSDK()) {
                        console.log(`Model validation passed: ${this.detectedModel}`);
                        return true;
                    } else {
                        console.warn(`Model ${this.detectedModel} doesn't match SDK v${version}`);
                        return false;
                    }
                } else {
                    console.warn(`SDK v${version} loaded but printer not connected`);
                }

                return false;

            } catch (error) {
                console.error(`SDK v${version} connection failed:`, error);
                return false;
            }
        },
        /**
         * Detect printer model
         */
        detectPrinterModel: async function () {
            try {
                if (!this.printerInstance) {
                    throw new Error('Printer instance not available');
                }

                let modelName = null;

                if (typeof this.printerInstance.getDeviceModel === 'function') {
                    modelName = await this.printerInstance.getDeviceModel();
                } else if (typeof this.printerInstance.getPrinterInfo === 'function') {
                    const info = await this.printerInstance.getPrinterInfo();
                    modelName = info?.model || info?.name;
                }

                if (modelName) {
                    modelName = modelName.toUpperCase().trim();

                    if (modelName.includes('SWAN')) {
                        this.detectedModel = 'SWAN2';
                    } else if (modelName.includes('D4') && modelName.includes('PRO')) {
                        this.detectedModel = 'D4_PRO';
                    } else if (modelName.includes('D4')) {
                        this.detectedModel = 'D4';
                    } else {
                        this.detectedModel = this.currentVersion === 2 ? 'D4_PRO' : 'D4';
                    }
                } else {
                    this.detectedModel = this.currentVersion === 2 ? 'D4_PRO' : 'D4';
                }

                console.log(`Detected model: ${this.detectedModel}`);

            } catch (error) {
                console.error('Model detection failed:', error);
                this.detectedModel = this.currentVersion === 2 ? 'D4_PRO' : 'D4';
            }
        },

        /**
         * Validate that detected model matches SDK version
         */
        validateModelSDK: function () {
            if (!this.detectedModel || !this.currentVersion) {
                return false;
            }
            const modelConfig = this.PRINTER_MODELS[this.detectedModel];
            return modelConfig && modelConfig.sdk_version === this.currentVersion;
        },
        /**
         * Check if SDK is loaded
         */
        isSDKLoaded: function (version) {
            return typeof window.IminPrinter !== 'undefined';
        },
        /**
         * Load script dynamically
         */
        loadScript(url) {
            return new Promise((resolve, reject) => {
                // Check if script already exists
                const existing = document.querySelector(`script[src="${url}"]`);
                if (existing) {
                    if (existing.dataset.loaded === 'true') {
                        console.log('Script already loaded:', url);
                        resolve();
                        return;
                    }
                    // Wait for existing script
                    existing.addEventListener('load', () => {
                        console.log('Existing script loaded:', url);
                        resolve();
                    });
                    existing.addEventListener('error', reject);
                    return;
                }

                console.log('Loading script:', url);
                const script = document.createElement('script');
                script.src = url;
                script.type = 'application/javascript'; // Explicitly set type
                script.async = true;
                script.dataset.loaded = 'false';

                script.onload = () => {
                    script.dataset.loaded = 'true';
                    console.log('Script loaded successfully:', url);
                    resolve();
                };

                script.onerror = (e) => {
                    console.error('Failed to load script:', url, e);
                    reject(new Error(`Failed to load script: ${url}`));
                };

                document.head.appendChild(script);
            });
        },

        /**
         * Get print width for detected model
         */
        getPrintWidth: function () {
            if (!this.detectedModel) return 58;
            const config = this.PRINTER_MODELS[this.detectedModel];
            return config ? config.print_width : 58;
        },

        /**
         * Print HTML content
         */
        async print(htmlContent, options = {}) {
            if (!this.isInitialized || !this.printerInstance) {
                throw new Error('Printer not initialized');
            }

            try {
                // Initialize printer
                await this.printerInstance.initPrinter();

                // Convert HTML to image
                const imageDataUrl = await this.htmlToImage(htmlContent);

                // Print image
                await this.printerInstance.printSingleBitmap(imageDataUrl);

                // Feed paper
                const feedAmount = options.feedAmount || 100;
                await this.printerInstance.printAndFeedPaper(feedAmount);

                // Cut paper
                if (options.cut !== false) {
                    await this.printerInstance.partialCut();
                }

                // Open cash drawer if requested
                if (options.openCashDrawer) {
                    await this.printerInstance.openCashBox();
                }

                return { success: true };

            } catch (error) {
                console.error('Print failed:', error);
                throw error;
            }
        },

        /**
         * Convert HTML to image
         */
        async htmlToImage(htmlContent) {
            // Create temporary container
            const container = document.createElement('div');
            container.innerHTML = htmlContent;
            container.style.position = 'absolute';
            container.style.left = '-9999px';
            container.style.width = `${this.getPrintWidth()}mm`;
            document.body.appendChild(container);

            try {
                // Get the first child element
                const element = container.firstElementChild;

                // Convert to JPEG
                const dataUrl = await domtoimage.toJpeg(element, {
                    quality: 1.0,
                    bgcolor: '#ffffff'
                });

                return dataUrl;

            } finally {
                // Remove temporary container
                document.body.removeChild(container);
            }
        },

        /**
         * Print multiple tickets
         */
        async printMultiple(tickets, options = {}) {
            const results = [];

            for (let i = 0; i < tickets.length; i++) {
                try {
                    await this.print(tickets[i], options);
                    results.push({ index: i, success: true });
                } catch (error) {
                    results.push({ index: i, success: false, error: error.message });
                }
            }

            return results;
        },

        /**
         * Get printer status
         */
        async getStatus() {
            if (!this.printerInstance) {
                return {
                    connected: false,
                    initialized: this.isInitialized
                };
            }

            try {
                // Try to get printer status
                let status = {
                    connected: true,
                    initialized: this.isInitialized,
                    model: this.detectedModel,
                    sdk_version: this.currentVersion,
                    print_width: this.getPrintWidth()
                };

                // Try to get additional status info if available
                if (typeof this.printerInstance.getPrinterStatus === 'function') {
                    const printerStatus = await this.printerInstance.getPrinterStatus();
                    status = { ...status, ...printerStatus };
                }

                return status;

            } catch (error) {
                return {
                    connected: false,
                    initialized: this.isInitialized,
                    error: error.message
                };
            }
        },

        /**
         * Disconnect printer
         */
        disconnect() {
            if (this.printerInstance) {
                try {
                    if (typeof this.printerInstance.disconnect === 'function') {
                        this.printerInstance.disconnect();
                    }
                } catch (error) {
                    console.error('Disconnect error:', error);
                }
                this.printerInstance = null;
            }

            this.isInitialized = false;
            this.detectedModel = null;
            this.currentVersion = null;
        },

        /**
         * Reconnect printer
         */
        async reconnect() {
            this.disconnect();
            return await this.initialize();
        }
    };

})(jQuery, window);
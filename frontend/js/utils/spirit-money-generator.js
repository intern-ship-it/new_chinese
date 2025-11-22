// js/utils/spirit-money-generator.js
// Spirit Money Image Generator using HTML5 Canvas

(function(window) {
    'use strict';
    
    window.SpiritMoneyGenerator = {
        // Configuration
        config: {
            templateImagePath: '/images/spirit-money-template.jpg', // Update this path
            outputFormat: 'image/png',
            outputQuality: 0.95,
            canvasWidth: 800,  // Adjust based on actual image dimensions
            canvasHeight: 1600,
            
            // Text positioning (adjust these based on your template)
            positions: {
                amount: {
                    x: 385,  // Center of template (770/2)
                    y: 140,
                    fontSize: 32,
                    fontFamily: 'Arial, "Microsoft YaHei", sans-serif',
                    color: '#000000',
                    align: 'center'
                },
                nameChinese: {
                    x: 215,  // Left side for vertical text
                    y: 480,  // Starting Y position
                    fontSize: 26,
                    fontFamily: 'SimSun, "Microsoft YaHei", "PingFang SC", sans-serif',
                    color: '#000000',
                    align: 'center',
                    maxWidth: 100,
                    lineHeight: 38,  // Spacing between characters
                    vertical: true   // Enable vertical rendering
                },
                nameEnglish: {
                    x: 405,  // Right side for vertical English text
                    y: 480,
                    fontSize: 18,
                    fontFamily: 'Arial, sans-serif',
                    color: '#000000',
                    align: 'center',
                    maxWidth: 100,
                    lineHeight: 28,
                    vertical: true   // Enable vertical rendering
                }
            }
        },
        
        /**
         * Generate spirit money image with donor information
         * @param {Object} donorData - Donor information
         * @param {string} donorData.name_chinese - Chinese name
         * @param {string} donorData.name_english - English name
         * @param {number} donorData.amount - Donation amount
         * @returns {Promise<string>} - Data URL of generated image
         */
        generate: function(donorData) {
            return new Promise((resolve, reject) => {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                
                // Set canvas dimensions
                canvas.width = this.config.canvasWidth;
                canvas.height = this.config.canvasHeight;
                
                // Load template image
                const templateImg = new Image();
                templateImg.crossOrigin = 'anonymous'; // For CORS if needed
                
                templateImg.onload = () => {
                    try {
                        // Draw template image
                        ctx.drawImage(templateImg, 0, 0, canvas.width, canvas.height);
                        
                        // Add amount text
                        this.drawAmount(ctx, donorData.amount);
                        
                        // Add donor name (Chinese)
                        if (donorData.name_chinese) {
                            this.drawChineseName(ctx, donorData.name_chinese);
                        }
                        
                        // Add donor name (English)
                        if (donorData.name_english) {
                            this.drawEnglishName(ctx, donorData.name_english);
                        }
                        
                        // Convert to data URL
                        const dataUrl = canvas.toDataURL(
                            this.config.outputFormat,
                            this.config.outputQuality
                        );
                        
                        resolve(dataUrl);
                    } catch (error) {
                        reject(error);
                    }
                };
                
                templateImg.onerror = () => {
                    reject(new Error('Failed to load spirit money template image'));
                };
                
                // Start loading image
                templateImg.src = this.config.templateImagePath;
            });
        },
        
        /**
         * Draw amount on canvas
         */
        drawAmount: function(ctx, amount) {
            const pos = this.config.positions.amount;
            
            ctx.save();
            ctx.font = `bold ${pos.fontSize}px ${pos.fontFamily}`;
            ctx.fillStyle = pos.color;
            ctx.textAlign = pos.align;
            
            const amountText = `RM ${parseFloat(amount).toFixed(2)}`;
            ctx.fillText(amountText, pos.x, pos.y);
            
            ctx.restore();
        },
        
        /**
         * Draw Chinese name vertically
         */
        drawChineseName: function(ctx, name) {
            const pos = this.config.positions.nameChinese;
            
            ctx.save();
            ctx.font = `${pos.fontSize}px ${pos.fontFamily}`;
            ctx.fillStyle = pos.color;
            ctx.textAlign = 'center';
            
            // Draw characters vertically (top to bottom)
            const characters = name.split('');
            let currentY = pos.y;
            
            characters.forEach((char, index) => {
                ctx.fillText(char, pos.x, currentY);
                currentY += pos.lineHeight;
            });
            
            ctx.restore();
        },
        
        /**
         * Draw English name
         */
        drawEnglishName: function(ctx, name) {
            const pos = this.config.positions.nameEnglish;
            
            ctx.save();
            ctx.font = `${pos.fontSize}px ${pos.fontFamily}`;
            ctx.fillStyle = pos.color;
            ctx.textAlign = pos.align;
            
            // Wrap text if too long
            this.wrapText(ctx, name, pos.x, pos.y, pos.maxWidth, pos.lineHeight);
            
            ctx.restore();
        },
        
        /**
         * Wrap text to fit within maxWidth
         */
        wrapText: function(ctx, text, x, y, maxWidth, lineHeight) {
            const words = text.split(' ');
            let line = '';
            let currentY = y;
            
            for (let n = 0; n < words.length; n++) {
                const testLine = line + words[n] + ' ';
                const metrics = ctx.measureText(testLine);
                const testWidth = metrics.width;
                
                if (testWidth > maxWidth && n > 0) {
                    ctx.fillText(line, x, currentY);
                    line = words[n] + ' ';
                    currentY += lineHeight;
                } else {
                    line = testLine;
                }
            }
            ctx.fillText(line, x, currentY);
        },
        
        /**
         * Download generated image
         * @param {string} dataUrl - Image data URL
         * @param {string} filename - Download filename
         */
        download: function(dataUrl, filename) {
            const link = document.createElement('a');
            link.href = dataUrl;
            link.download = filename || `spirit-money-${Date.now()}.png`;
            
            // Trigger download
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        },
        
        /**
         * Generate and download spirit money for a donor
         * @param {Object} donorData - Donor information
         * @param {string} donationId - Donation ID for filename
         */
        generateAndDownload: function(donorData, donationId) {
            return this.generate(donorData)
                .then(dataUrl => {
                    const filename = `spirit-money-${donationId || Date.now()}.png`;
                    this.download(dataUrl, filename);
                    return dataUrl;
                })
                .catch(error => {
                    console.error('Spirit Money Generation Error:', error);
                    throw error;
                });
        },
        
        /**
         * Update configuration
         * @param {Object} newConfig - New configuration options
         */
        configure: function(newConfig) {
            this.config = $.extend(true, {}, this.config, newConfig);
        }
    };
    
})(window);
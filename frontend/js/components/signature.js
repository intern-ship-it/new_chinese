// js/components/signature.js
// Signature Component with Upload and Draw Options

(function($, window) {
    'use strict';
    
    window.SignatureComponent = {
        signaturePad: null,
        currentUserId: null,
        currentSignatureUrl: null,
        modalInstance: null,
        
        // Initialize component
        init: function(userId, existingSignatureUrl) {
            this.currentUserId = userId;
            this.currentSignatureUrl = existingSignatureUrl;
            this.render();
            this.bindEvents();
            
            // Load existing signature if available
            if (existingSignatureUrl) {
                this.displayExistingSignature(existingSignatureUrl);
            }
        },
        
        // Render signature component
        render: function() {
            const html = `
                <!-- Signature Section in Form -->
                <div class="signature-section" id="signatureSection">
                    <h6 class="mb-3"><i class="bi bi-pen"></i> Signature (Optional)</h6>
                    
                    <div class="row">
                        <div class="col-md-8">
                            <div class="signature-display-area">
                                <div id="currentSignature" class="current-signature-box">
                                    <div class="text-center text-muted py-4">
                                        <i class="bi bi-pen" style="font-size: 48px;"></i>
                                        <p>No signature uploaded</p>
                                    </div>
                                </div>
                                
                                <div class="signature-actions mt-3">
                                    <button type="button" class="btn btn-primary btn-sm" id="addSignatureBtn">
                                        <i class="bi bi-plus-circle"></i> Add Signature
                                    </button>
                                    <button type="button" class="btn btn-outline-primary btn-sm" id="changeSignatureBtn" style="display: none;">
                                        <i class="bi bi-pencil"></i> Change Signature
                                    </button>
                                    <button type="button" class="btn btn-outline-danger btn-sm" id="removeSignatureBtn" style="display: none;">
                                        <i class="bi bi-trash"></i> Remove
                                    </button>
                                </div>
                            </div>
                        </div>
                        
                        <div class="col-md-4">
                            <div class="alert alert-info small">
                                <i class="bi bi-info-circle"></i> 
                                <strong>Signature Guidelines:</strong>
                                <ul class="mb-0 mt-2">
                                    <li>Use black or blue ink</li>
                                    <li>Sign within the box</li>
                                    <li>Clear and legible</li>
                                    <li>Max size: 2MB</li>
                                </ul>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Hidden field to track signature status -->
                    <input type="hidden" id="signatureStatus" name="signature_status" value="">
                    <input type="hidden" id="signatureData" name="signature_data" value="">
                    <input type="hidden" id="signatureType" name="signature_type" value="">
                </div>

                <!-- Signature Modal -->
                <div class="modal fade" id="signatureModal" tabindex="-1" data-bs-backdrop="static">
                    <div class="modal-dialog modal-lg">
                        <div class="modal-content">
                            <div class="modal-header">
                                <h5 class="modal-title">Add Signature</h5>
                                <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                            </div>
                            <div class="modal-body">
                                <!-- Tab Navigation -->
                                <ul class="nav nav-tabs mb-3" id="signatureTabs">
                                    <li class="nav-item">
                                        <a class="nav-link active" data-bs-toggle="tab" href="#drawTab">
                                            <i class="bi bi-pen"></i> Draw Signature
                                        </a>
                                    </li>
                                    <li class="nav-item">
                                        <a class="nav-link" data-bs-toggle="tab" href="#uploadTab">
                                            <i class="bi bi-upload"></i> Upload Signature
                                        </a>
                                    </li>
                                </ul>
                                
                                <!-- Tab Content -->
                                <div class="tab-content">
                                    <!-- Draw Tab -->
                                    <div class="tab-pane fade show active" id="drawTab">
                                        <div class="signature-pad-container">
                                            <canvas id="signatureCanvas" class="signature-canvas"></canvas>
                                            <div class="signature-pad-actions mt-2">
                                                <button type="button" class="btn btn-sm btn-secondary" id="clearPadBtn">
                                                    <i class="bi bi-eraser"></i> Clear
                                                </button>
                                                <button type="button" class="btn btn-sm btn-outline-secondary" id="undoBtn">
                                                    <i class="bi bi-arrow-counterclockwise"></i> Undo
                                                </button>
                                                <div class="btn-group btn-group-sm ms-2" role="group">
                                                    <input type="radio" class="btn-check" name="penColor" id="blackPen" value="black" checked>
                                                    <label class="btn btn-outline-dark" for="blackPen">Black</label>
                                                    
                                                    <input type="radio" class="btn-check" name="penColor" id="bluePen" value="blue">
                                                    <label class="btn btn-outline-primary" for="bluePen">Blue</label>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <!-- Upload Tab -->
                                    <div class="tab-pane fade" id="uploadTab">
                                        <div class="upload-area">
                                            <div class="upload-drop-zone" id="uploadDropZone">
                                                <i class="bi bi-cloud-upload" style="font-size: 48px;"></i>
                                                <p>Drag and drop your signature image here or</p>
                                                <button type="button" class="btn btn-primary" id="browseFileBtn">
                                                    Browse Files
                                                </button>
                                                <input type="file" id="signatureFileInput" accept="image/*" style="display: none;">
                                                <p class="text-muted small mt-2">Accepted formats: JPG, PNG (Max: 2MB)</p>
                                            </div>
                                            
                                            <div id="uploadPreview" class="upload-preview mt-3" style="display: none;">
                                                <img id="previewImage" src="" alt="Signature Preview" class="img-fluid">
                                                <button type="button" class="btn btn-sm btn-danger mt-2" id="removeUploadBtn">
                                                    <i class="bi bi-trash"></i> Remove
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div class="modal-footer">
                                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                                <button type="button" class="btn btn-primary" id="saveSignatureBtn">
                                    <i class="bi bi-check-circle"></i> Save Signature
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                <style>
                    .signature-section {
                        margin-top: 20px;
                        padding: 20px;
                        border: 1px solid #dee2e6;
                        border-radius: 8px;
                        background: #f8f9fa;
                    }
                    
                    .current-signature-box {
                        border: 2px dashed #dee2e6;
                        border-radius: 8px;
                        padding: 20px;
                        background: white;
                        min-height: 150px;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                    }
                    
                    .current-signature-box img {
                        max-width: 100%;
                        max-height: 120px;
                        object-fit: contain;
                    }
                    
                    .signature-canvas {
                        border: 2px solid #dee2e6;
                        border-radius: 4px;
                        background: white;
                        cursor: crosshair;
                        width: 100%;
                        height: 200px;
                        touch-action: none;
                    }
                    
                    .upload-drop-zone {
                        border: 2px dashed #dee2e6;
                        border-radius: 8px;
                        padding: 40px;
                        text-align: center;
                        background: #f8f9fa;
                        cursor: pointer;
                        transition: all 0.3s;
                    }
                    
                    .upload-drop-zone:hover {
                        border-color: var(--primary-color);
                        background: #e7f3ff;
                    }
                    
                    .upload-drop-zone.dragover {
                        border-color: var(--primary-color);
                        background: #e7f3ff;
                    }
                    
                    .upload-preview {
                        text-align: center;
                        padding: 20px;
                        border: 1px solid #dee2e6;
                        border-radius: 8px;
                        background: white;
                    }
                    
                    .upload-preview img {
                        max-height: 150px;
                        border: 1px solid #dee2e6;
                        padding: 10px;
                        background: white;
                    }
                </style>
            `;
            
            // Append to form if not already present
            if ($('#signatureSection').length === 0) {
                // This will be added to the form dynamically
                return html;
            }
        },
        
        // Bind events
        bindEvents: function() {
            const self = this;
            
            // Add/Change signature button
            $(document).on('click', '#addSignatureBtn, #changeSignatureBtn', function() {
                self.showSignatureModal();
            });
            
            // Remove signature button
            $(document).on('click', '#removeSignatureBtn', function() {
                self.removeSignature();
            });
            
            // Clear pad button
            $(document).on('click', '#clearPadBtn', function() {
                self.clearSignaturePad();
            });
            
            // Undo button
            $(document).on('click', '#undoBtn', function() {
                self.undoLastStroke();
            });
            
            // Pen color change
            $(document).on('change', 'input[name="penColor"]', function() {
                self.changePenColor($(this).val());
            });
            
            // Browse file button
            $(document).on('click', '#browseFileBtn', function() {
                $('#signatureFileInput').click();
            });
            
            // File input change
            $(document).on('change', '#signatureFileInput', function(e) {
                self.handleFileSelect(e.target.files[0]);
            });
            
            // Remove upload button
            $(document).on('click', '#removeUploadBtn', function() {
                self.clearUpload();
            });
            
            // Save signature button
            $(document).on('click', '#saveSignatureBtn', function() {
                self.saveSignature();
            });
            
            // Drag and drop events
            const dropZone = document.getElementById('uploadDropZone');
            if (dropZone) {
                dropZone.addEventListener('dragover', function(e) {
                    e.preventDefault();
                    e.stopPropagation();
                    $(this).addClass('dragover');
                });
                
                dropZone.addEventListener('dragleave', function(e) {
                    e.preventDefault();
                    e.stopPropagation();
                    $(this).removeClass('dragover');
                });
                
                dropZone.addEventListener('drop', function(e) {
                    e.preventDefault();
                    e.stopPropagation();
                    $(this).removeClass('dragover');
                    
                    const files = e.dataTransfer.files;
                    if (files.length > 0) {
                        self.handleFileSelect(files[0]);
                    }
                });
            }
        },
        
        // Show signature modal
        showSignatureModal: function() {
            const self = this;
            
            if (!this.modalInstance) {
                this.modalInstance = new bootstrap.Modal(document.getElementById('signatureModal'));
            }
            
            // Initialize signature pad when modal opens
            this.modalInstance.show();
            
            // Wait for modal to be fully shown
            $('#signatureModal').on('shown.bs.modal', function() {
                self.initSignaturePad();
            });
        },
        
        // Initialize signature pad
        initSignaturePad: function() {
            const canvas = document.getElementById('signatureCanvas');
            if (!canvas) return;
            
            // Load SignaturePad library if not loaded
            if (typeof SignaturePad === 'undefined') {
                $.getScript('https://cdn.jsdelivr.net/npm/signature_pad@4.0.0/dist/signature_pad.umd.min.js')
                    .done(() => {
                        this.setupSignaturePad(canvas);
                    });
            } else {
                this.setupSignaturePad(canvas);
            }
        },
        
        // Setup signature pad
        setupSignaturePad: function(canvas) {
            // Set canvas size
            const ratio = Math.max(window.devicePixelRatio || 1, 1);
            canvas.width = canvas.offsetWidth * ratio;
            canvas.height = canvas.offsetHeight * ratio;
            canvas.getContext('2d').scale(ratio, ratio);
            
            // Initialize SignaturePad
            this.signaturePad = new SignaturePad(canvas, {
                backgroundColor: 'rgb(255, 255, 255)',
                penColor: 'black'
            });
        },
        
        // Clear signature pad
        clearSignaturePad: function() {
            if (this.signaturePad) {
                this.signaturePad.clear();
            }
        },
        
        // Undo last stroke
        undoLastStroke: function() {
            if (this.signaturePad) {
                const data = this.signaturePad.toData();
                if (data) {
                    data.pop(); // Remove last stroke
                    this.signaturePad.fromData(data);
                }
            }
        },
        
        // Change pen color
        changePenColor: function(color) {
            if (this.signaturePad) {
                this.signaturePad.penColor = color === 'blue' ? 'blue' : 'black';
            }
        },
        
        // Handle file select
        handleFileSelect: function(file) {
            if (!file) return;
            
            // Validate file
            const validTypes = ['image/jpeg', 'image/jpg', 'image/png'];
            if (!validTypes.includes(file.type)) {
                TempleCore.showToast('Please select a valid image file (JPG or PNG)', 'warning');
                return;
            }
            
            // Check file size (2MB max)
            if (file.size > 2 * 1024 * 1024) {
                TempleCore.showToast('File size must be less than 2MB', 'warning');
                return;
            }
            
            // Preview image
            const reader = new FileReader();
            reader.onload = function(e) {
                $('#previewImage').attr('src', e.target.result);
                $('#uploadDropZone').hide();
                $('#uploadPreview').show();
            };
            reader.readAsDataURL(file);
            
            // Store file reference
            this.selectedFile = file;
        },
        
        // Clear upload
        clearUpload: function() {
            this.selectedFile = null;
            $('#signatureFileInput').val('');
            $('#previewImage').attr('src', '');
            $('#uploadDropZone').show();
            $('#uploadPreview').hide();
        },
        
        // Save signature
        saveSignature: function() {
            const self = this;
            const activeTab = $('.tab-pane.active').attr('id');
            
            let signatureData = null;
            let signatureType = null;
            
            if (activeTab === 'drawTab') {
                // Get drawn signature
                if (!this.signaturePad || this.signaturePad.isEmpty()) {
                    TempleCore.showToast('Please draw your signature', 'warning');
                    return;
                }
                
                signatureData = this.signaturePad.toDataURL('image/png');
                signatureType = 'drawn';
                
                // Store in form
                $('#signatureData').val(signatureData);
                $('#signatureType').val(signatureType);
                
            } else if (activeTab === 'uploadTab') {
                // Get uploaded file
                if (!this.selectedFile) {
                    TempleCore.showToast('Please select a signature image', 'warning');
                    return;
                }
                
                signatureType = 'upload';
                $('#signatureType').val(signatureType);
                
                // For upload, we'll handle it differently during form submission
                // Store file reference
                window.tempSignatureFile = this.selectedFile;
            }
            
            // Update display
            if (activeTab === 'drawTab') {
                $('#currentSignature').html(`<img src="${signatureData}" alt="Signature">`);
            } else {
                const reader = new FileReader();
                reader.onload = function(e) {
                    $('#currentSignature').html(`<img src="${e.target.result}" alt="Signature">`);
                };
                reader.readAsDataURL(this.selectedFile);
            }
            
            // Update buttons
            $('#addSignatureBtn').hide();
            $('#changeSignatureBtn, #removeSignatureBtn').show();
            $('#signatureStatus').val('added');
            
            // Close modal
            this.modalInstance.hide();
            
            TempleCore.showToast('Signature added successfully', 'success');
        },
        
        // Remove signature
        removeSignature: function() {
            const self = this;
            
            TempleCore.showConfirm(
                'Remove Signature',
                'Are you sure you want to remove the signature?',
                function() {
                    // Clear display
                    $('#currentSignature').html(`
                        <div class="text-center text-muted py-4">
                            <i class="bi bi-pen" style="font-size: 48px;"></i>
                            <p>No signature uploaded</p>
                        </div>
                    `);
                    
                    // Clear form fields
                    $('#signatureData').val('');
                    $('#signatureType').val('');
                    $('#signatureStatus').val('removed');
                    
                    // Clear file reference
                    window.tempSignatureFile = null;
                    self.selectedFile = null;
                    
                    // Update buttons
                    $('#addSignatureBtn').show();
                    $('#changeSignatureBtn, #removeSignatureBtn').hide();
                    
                    // Clear modal
                    self.clearSignaturePad();
                    self.clearUpload();
                    
                    TempleCore.showToast('Signature removed', 'info');
                }
            );
        },
        
        // Display existing signature
        displayExistingSignature: function(signatureUrl) {
            $('#currentSignature').html(`
                <img src="${signatureUrl}" alt="Signature" class="img-fluid">
            `);
            $('#addSignatureBtn').hide();
            $('#changeSignatureBtn, #removeSignatureBtn').show();
            $('#signatureStatus').val('existing');
        },
        
        // Upload signature to S3 (called during form submission)
        uploadToS3: function(userId, callback) {
            const signatureType = $('#signatureType').val();
            const signatureStatus = $('#signatureStatus').val();
            
            if (signatureStatus === 'removed') {
                // Delete signature
                TempleAPI.delete('/signatures/' + userId)
                    .done(function(response) {
                        callback(true, null);
                    })
                    .fail(function() {
                        callback(false, 'Failed to remove signature');
                    });
                return;
            }
            
            if (!signatureType || signatureStatus === 'existing') {
                callback(true, null);
                return;
            }
            
            const formData = new FormData();
            formData.append('user_id', userId);
            formData.append('signature_type', signatureType);
            
            if (signatureType === 'drawn') {
                formData.append('signature_data', $('#signatureData').val());
            } else if (signatureType === 'upload' && window.tempSignatureFile) {
                formData.append('signature_file', window.tempSignatureFile);
            } else {
                callback(true, null);
                return;
            }
            
            $.ajax({
                url: TempleAPI.getBaseUrl() + '/signatures/upload',
                method: 'POST',
                data: formData,
                processData: false,
                contentType: false,
                headers: {
                    'Authorization': 'Bearer ' + localStorage.getItem(APP_CONFIG.STORAGE.ACCESS_TOKEN),
                    'X-Temple-ID': TempleAPI.getTempleId()
                }
            })
            .done(function(response) {
                callback(true, response.data);
            })
            .fail(function(xhr) {
                callback(false, xhr.responseJSON?.message || 'Failed to upload signature');
            });
        }
    };
    
})(jQuery, window);
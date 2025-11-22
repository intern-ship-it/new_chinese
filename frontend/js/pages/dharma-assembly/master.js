// frontend/js/pages/dharma-assembly/master.js
// Dharma Assembly Master Settings Page
if (typeof DonationAPI === "undefined") {
  $.getScript("/js/services/dharma-assembly-api.js", function () {
    console.log("DonationAPI loaded successfully");
  });
}
(function ($, window) {
  "use strict";

  // ========================================
  // SHARED MODULE
  // ========================================
  if (!window.DharmaAssemblySharedModule) {
    window.DharmaAssemblySharedModule = {
      moduleId: "dharma-assembly",
      eventNamespace: "dharmaAssembly",
      cssId: "dharma-assembly-css",
      cssPath: "/css/dharma-assembly.css",
      activePages: new Set(),

      loadCSS: function () {
        if (!document.getElementById(this.cssId)) {
          const link = document.createElement("link");
          link.id = this.cssId;
          link.rel = "stylesheet";
          link.href = this.cssPath;
          document.head.appendChild(link);
          console.log("✅ Dharma Assembly CSS loaded");
        }
      },

      registerPage: function (pageId) {
        this.activePages.add(pageId);
        this.loadCSS();
        console.log(
          `📄 Dharma Assembly page registered: ${pageId} (Total: ${this.activePages.size})`
        );
      },

      unregisterPage: function (pageId) {
        this.activePages.delete(pageId);
        console.log(
          `📄 Dharma Assembly page unregistered: ${pageId} (Remaining: ${this.activePages.size})`
        );

        if (this.activePages.size === 0) {
          this.cleanup();
        }
      },

      cleanup: function () {
        const cssLink = document.getElementById(this.cssId);
        if (cssLink) {
          cssLink.remove();
          console.log("🧹 Dharma Assembly CSS removed");
        }

        $(document).off("." + this.eventNamespace);
        $(window).off("." + this.eventNamespace);
        this.activePages.clear();
        console.log("🧹 Dharma Assembly module cleaned up");
      },
    };
  }

  // ========================================
  // MASTER PAGE
  // ========================================
  window.DharmaAssemblyMasterPage = {
    pageId: "dharma-assembly-master",
    eventNamespace: window.DharmaAssemblySharedModule.eventNamespace,
    dataTable: null,
    editMode: false,
    editId: null,

    // Initialize page
    init: function () {
      console.log("🚀 Initializing Dharma Assembly Master Page...");
      window.DharmaAssemblySharedModule.registerPage(this.pageId);
      this.render();
      this.bindEvents();
      this.loadMasterList();
    },

    // Render page HTML
    render: function () {
      const html = `
                <div class="${this.pageId}-page">
                    <!-- Page Header -->
                    <div class="page-header mb-4">
                        <div class="d-flex justify-content-between align-items-center">
                            <div>
                                <h1 class="h2 mb-2">
                                    <i class="bi bi-gear-fill me-2" style="color: var(--primary-color)"></i>
                                    Dharma Assembly - Master Settings
                                </h1>
                                <p class="text-muted mb-0">Configure application options, dedications, and offerings</p>
                            </div>
                            <div>
                                <button class="btn btn-primary" id="btnNewMaster">
                                    <i class="bi bi-plus-circle"></i> New Master
                                </button>
                                <button class="btn btn-outline-secondary" id="btnRefreshList">
                                    <i class="bi bi-arrow-clockwise"></i>
                                </button>
                            </div>
                        </div>
                    </div>

                    <!-- Master List -->
                    <div class="card shadow-sm mb-4">
                        <div class="card-body">
                            <div class="table-responsive">
                                <table id="masterTable" class="table table-hover table-striped" style="width:100%">
                                    <thead>
                                        <tr>
                                            <th>Name</th>
                                            <th>Application Options</th>
                                            <th>Dedication</th>
                                            <th>Offerings</th>
                                            <th>Status</th>
                                            <th width="120">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody></tbody>
                                </table>
                            </div>
                        </div>
                    </div>

                    <!-- Configuration Form Modal -->
                    <div class="modal fade" id="masterFormModal" tabindex="-1" data-bs-backdrop="static">
                        <div class="modal-dialog modal-dialog-scrollable" style="max-width: 900px;">
                            <div class="modal-content">
                                <div class="modal-header" style="background: linear-gradient(135deg, var(--primary-color), var(--secondary-color)); color: white;">
                                    <h5 class="modal-title">
                                        <i class="bi bi-gear-fill me-2"></i>
                                        <span id="modalTitle">New Master Configuration</span>
                                    </h5>
                                    <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                                </div>
                                <div class="modal-body">
                                    <form id="masterForm">
                                        <!-- Master Name -->
                                        <div class="mb-4">
                                            <label class="form-label fw-bold">Master Name <span class="text-danger">*</span></label>
                                            <input type="text" class="form-control form-control-lg" id="masterName" 
                                                placeholder="e.g., Spring Dharma Assembly 2025" required>
                                        </div>

                                        <hr class="my-4">

                                        <!-- Section 1: Application Options -->
                                        <div class="config-section mb-4">
                                            <div class="d-flex justify-content-between align-items-center mb-3">
                                                <h5 class="mb-0">
                                                    <i class="bi bi-1-circle-fill me-2" style="color: var(--primary-color)"></i>
                                                    Application Options
                                                </h5>
                                                <button type="button" class="btn btn-sm btn-primary" id="btnAddApplicationOption">
                                                    <i class="bi bi-plus-circle"></i> Add Option
                                                </button>
                                            </div>
                                            <div id="applicationOptionsContainer" class="options-container">
                                                <!-- Dynamic application options will be added here -->
                                            </div>
                                        </div>

                                        <hr class="my-4">

                                        <!-- Section 2: Dedication -->
                                        <div class="config-section mb-4">
                                            <div class="d-flex justify-content-between align-items-center mb-3">
                                                <h5 class="mb-0">
                                                    <i class="bi bi-2-circle-fill me-2" style="color: var(--primary-color)"></i>
                                                    Dedication (Optional)
                                                </h5>
                                                <div class="form-check form-switch">
                                                    <input class="form-check-input" type="checkbox" id="enableDedication">
                                                    <label class="form-check-label fw-bold" for="enableDedication">Enable Dedication</label>
                                                </div>
                                            </div>
                                            <div id="dedicationBlock" style="display: none;">
                                                <div class="mb-3">
                                                    <label class="form-label">Dedication Name</label>
                                                    <input type="text" class="form-control" id="dedicationName" 
                                                        placeholder="e.g., Memorial Dedication">
                                                </div>
                                                <div class="d-flex justify-content-between align-items-center mb-2">
                                                    <label class="form-label mb-0">Dedication Entries</label>
                                                    <button type="button" class="btn btn-sm btn-outline-primary" id="btnAddDedicationEntry">
                                                        <i class="bi bi-plus-circle"></i> Add Entry
                                                    </button>
                                                </div>
                                                <div id="dedicationEntriesContainer" class="entries-container">
                                                    <!-- Dynamic dedication entries will be added here -->
                                                </div>
                                            </div>
                                        </div>

                                        <hr class="my-4">

                                        <!-- Section 3: Offering -->
                                        <div class="config-section mb-4">
                                            <div class="d-flex justify-content-between align-items-center mb-3">
                                                <h5 class="mb-0">
                                                    <i class="bi bi-3-circle-fill me-2" style="color: var(--primary-color)"></i>
                                                    Offering (Optional)
                                                </h5>
                                                <div class="form-check form-switch">
                                                    <input class="form-check-input" type="checkbox" id="enableOffering">
                                                    <label class="form-check-label fw-bold" for="enableOffering">Enable Offering</label>
                                                </div>
                                            </div>
                                            <div id="offeringBlock" style="display: none;">
                                                <div class="d-flex justify-content-between align-items-center mb-3">
                                                    <p class="text-muted mb-0">Configure offerings with multiple options</p>
                                                    <button type="button" class="btn btn-sm btn-primary" id="btnAddOffering">
                                                        <i class="bi bi-plus-circle"></i> Add Offering
                                                    </button>
                                                </div>
                                                <div id="offeringsContainer" class="offerings-container">
                                                    <!-- Dynamic offerings will be added here -->
                                                </div>
                                            </div>
                                        </div>

                                        <hr class="my-4">

                                        <!-- Section 4: Status -->
                                        <div class="config-section">
                                            <h5 class="mb-3">
                                                <i class="bi bi-4-circle-fill me-2" style="color: var(--primary-color)"></i>
                                                Status
                                            </h5>
                                            <div class="form-check form-switch">
                                                <input class="form-check-input" type="checkbox" id="masterStatus" checked>
                                                <label class="form-check-label fw-bold" for="masterStatus">Active</label>
                            </div>
                                        </div>
                                    </form>
                                </div>
                                <div class="modal-footer">
                                    <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">
                                        <i class="bi bi-x-circle"></i> Cancel
                                    </button>
                                    <button type="button" class="btn btn-primary" id="btnSaveMaster">
                                        <i class="bi bi-check-circle"></i> Save Configuration
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            `;

      $("#page-container").html(html);
    },

    // Bind events
    bindEvents: function () {
      const self = this;

      // New Master button
      $(document).on(
        "click." + this.eventNamespace,
        "#btnNewMaster",
        function (e) {
          e.preventDefault();
          self.openFormModal();
        }
      );

      // Refresh list
      $(document).on(
        "click." + this.eventNamespace,
        "#btnRefreshList",
        function (e) {
          e.preventDefault();
          self.loadMasterList();
        }
      );

      // Enable Dedication toggle
      $(document).on(
        "change." + this.eventNamespace,
        "#enableDedication",
        function () {
          self.toggleDedicationBlock($(this).is(":checked"));
        }
      );

      // Enable Offering toggle
      $(document).on(
        "change." + this.eventNamespace,
        "#enableOffering",
        function () {
          self.toggleOfferingBlock($(this).is(":checked"));
        }
      );

      // Add Application Option
      $(document).on(
        "click." + this.eventNamespace,
        "#btnAddApplicationOption",
        function (e) {
          e.preventDefault();
          self.addApplicationOption();
        }
      );

      // Add Dedication Entry
      $(document).on(
        "click." + this.eventNamespace,
        "#btnAddDedicationEntry",
        function (e) {
          e.preventDefault();
          self.addDedicationEntry();
        }
      );

      // Add Offering
      $(document).on(
        "click." + this.eventNamespace,
        "#btnAddOffering",
        function (e) {
          e.preventDefault();
          self.addOffering();
        }
      );

      // Add Offering Option (delegated)
      $(document).on(
        "click." + this.eventNamespace,
        ".btn-add-offering-option",
        function (e) {
          e.preventDefault();
          const offeringIndex = $(this).data("offering-index");
          self.addOfferingOption(offeringIndex);
        }
      );

      // Remove handlers (delegated)
      $(document).on(
        "click." + this.eventNamespace,
        ".btn-remove-option",
        function (e) {
          e.preventDefault();
          self.removeElement($(this));
        }
      );

      $(document).on(
        "click." + this.eventNamespace,
        ".btn-remove-entry",
        function (e) {
          e.preventDefault();
          self.removeElement($(this));
        }
      );

      $(document).on(
        "click." + this.eventNamespace,
        ".btn-remove-offering",
        function (e) {
          e.preventDefault();
          self.removeElement($(this));
        }
      );

      $(document).on(
        "click." + this.eventNamespace,
        ".btn-remove-offering-option",
        function (e) {
          e.preventDefault();
          self.removeElement($(this));
        }
      );

      // Save Master
      $(document).on(
        "click." + this.eventNamespace,
        "#btnSaveMaster",
        function (e) {
          e.preventDefault();
          self.saveMaster();
        }
      );

      // Edit Master (delegated)
      $(document).on("click." + this.eventNamespace, ".btn-edit", function (e) {
        e.preventDefault();
        const id = $(this).data("id");
        console.log("🖱️ Edit button clicked for ID:", id);
        self.editMaster(id);
      });

      // Delete Master (delegated)
      $(document).on(
        "click." + this.eventNamespace,
        ".btn-delete",
        function (e) {
          e.preventDefault();
          const id = $(this).data("id");
          self.deleteMaster(id);
        }
      );

      // Modal cleanup on hide
      $("#masterFormModal").on(
        "hidden.bs.modal." + this.eventNamespace,
        function () {
          self.resetForm();
        }
      );

      console.log("✅ Events bound with namespace:", this.eventNamespace);
    },

    // Load master list
    loadMasterList: function () {
      const self = this;

      if (self.dataTable) {
        self.dataTable.destroy();
      }

      console.log("📡 Loading master list...");

      self.dataTable = $("#masterTable").DataTable({
        processing: true,
        serverSide: false,
        ajax: {
          url: TempleAPI.getBaseUrl() + "/dharma-assembly/masters",
          type: "GET",
          headers: TempleAPI.getHeaders(),
          dataSrc: function (response) {
            console.log("✅ Masters loaded:", response);
            return response.success ? response.data : [];
          },
          error: function (xhr, error, thrown) {
            console.error(
              "❌ Failed to load masters:",
              xhr.status,
              error,
              thrown
            );
            console.error("Response:", xhr.responseText);
            TempleCore.showToast("Failed to load master list", "error");
          },
        },
        columns: [
          {
            data: "name",
            render: function (data) {
              return `<strong>${data}</strong>`;
            },
          },
          {
            data: "application_options",
            render: function (data) {
              if (!data || data.length === 0)
                return '<span class="text-muted">None</span>';
              return `<span class="badge bg-info">${data.length} option(s)</span>`;
            },
          },
          {
            data: "enable_dedication",
            render: function (data, type, row) {
              if (!data) return '<span class="text-muted">Disabled</span>';
              const count = row.dedication_options
                ? row.dedication_options.length
                : 0;
              return `<span class="badge bg-success">${count} entry(ies)</span>`;
            },
          },
          {
            data: "enable_offering",
            render: function (data, type, row) {
              if (!data) return '<span class="text-muted">Disabled</span>';
              const count = row.offerings ? row.offerings.length : 0;
              return `<span class="badge bg-primary">${count} offering(s)</span>`;
            },
          },
          {
            data: "status",
            render: function (data) {
              return data === 1
                ? '<span class="badge bg-success">Active</span>'
                : '<span class="badge bg-secondary">Inactive</span>';
            },
          },
          {
            data: "id",
            orderable: false,
            render: function (data) {
              return `
                                <div class="btn-group btn-group-sm">
                                    <button class="btn btn-outline-primary btn-edit" data-id="${data}" title="Edit">
                                        <i class="bi bi-pencil"></i>
                                    </button>
                                    <button class="btn btn-outline-danger btn-delete" data-id="${data}" title="Delete">
                                        <i class="bi bi-trash"></i>
                                    </button>
                                </div>
                            `;
            },
          },
        ],
        order: [[0, "asc"]],
        pageLength: 25,
        responsive: true,
        language: {
          search: "",
          searchPlaceholder: "Search masters...",
          emptyTable: "No master configurations found",
        },
      });
    },

    // Open form modal
    openFormModal: function () {
      this.editMode = false;
      this.editId = null;
      this.resetForm();
      $("#modalTitle").text("New Master Configuration");
      $("#masterFormModal").modal("show");

      // Add initial application option
      this.addApplicationOption();
    },

    // Toggle Dedication Block
    toggleDedicationBlock: function (show) {
      if (show) {
        $("#dedicationBlock").slideDown(300);
        if ($("#dedicationEntriesContainer").children().length === 0) {
          this.addDedicationEntry();
        }
      } else {
        $("#dedicationBlock").slideUp(300);
      }
    },

    // Toggle Offering Block
    toggleOfferingBlock: function (show) {
      if (show) {
        $("#offeringBlock").slideDown(300);
        if ($("#offeringsContainer").children().length === 0) {
          this.addOffering();
        }
      } else {
        $("#offeringBlock").slideUp(300);
      }
    },

    // Add Application Option
    addApplicationOption: function () {
      const html = `
                <div class="option-item card mb-2 p-3">
                    <div class="row align-items-center">
                        <div class="col-md-6">
                            <label class="form-label small">Option Name</label>
                            <input type="text" class="form-control app-option-name" 
                                placeholder="e.g., Family Registration" required>
                        </div>
                        <div class="col-md-5">
                            <label class="form-label small">Amount</label>
                            <input type="number" class="form-control app-option-amount" 
                                placeholder="0.00" step="0.01" min="0" required>
                        </div>
                        <div class="col-md-1 text-end">
                            <button type="button" class="btn btn-sm btn-outline-danger btn-remove-option mt-3">
                                <i class="bi bi-trash"></i>
                            </button>
                        </div>
                    </div>
                </div>
            `;
      $("#applicationOptionsContainer").append(html);
    },

    // Add Dedication Entry
    addDedicationEntry: function () {
      const html = `
                <div class="entry-item card mb-2 p-2">
                    <div class="row align-items-center">
                        <div class="col-md-11">
                            <input type="text" class="form-control dedication-entry" 
                                placeholder="Enter dedication entry">
                        </div>
                        <div class="col-md-1 text-end">
                            <button type="button" class="btn btn-sm btn-outline-danger btn-remove-entry">
                                <i class="bi bi-trash"></i>
                            </button>
                        </div>
                    </div>
                </div>
            `;
      $("#dedicationEntriesContainer").append(html);
    },

    // Add Offering
    addOffering: function () {
      const index = $("#offeringsContainer .offering-item").length;
      const html = `
                <div class="offering-item card mb-3 p-3" data-offering-index="${index}">
                    <div class="d-flex justify-content-between align-items-center mb-3">
                        <h6 class="mb-0">Offering ${index + 1}</h6>
                        <button type="button" class="btn btn-sm btn-outline-danger btn-remove-offering">
                            <i class="bi bi-trash"></i> Remove Offering
                        </button>
                    </div>
                    
                    <div class="mb-3">
                        <label class="form-label">Offering Name</label>
                        <input type="text" class="form-control offering-name" 
                            placeholder="e.g., Auspicious Wisdom Light" required>
                    </div>
                    
                    <div class="d-flex justify-content-between align-items-center mb-2">
                        <label class="form-label mb-0">Options</label>
                        <button type="button" class="btn btn-sm btn-outline-primary btn-add-offering-option" 
                            data-offering-index="${index}">
                            <i class="bi bi-plus-circle"></i> Add Option
                        </button>
                    </div>
                    
                    <div class="offering-options-container" data-offering-index="${index}">
                        <!-- Offering options will be added here -->
                    </div>
                </div>
            `;
      $("#offeringsContainer").append(html);

      // Add initial option
      this.addOfferingOption(index);
    },

    // Add Offering Option
    addOfferingOption: function (offeringIndex) {
      const html = `
                <div class="offering-option-item card mb-2 p-2 bg-light">
                    <div class="row align-items-center">
                        <div class="col-md-6">
                            <input type="text" class="form-control form-control-sm offering-option-name" 
                                placeholder="e.g., Family" required>
                        </div>
                        <div class="col-md-5">
                            <input type="number" class="form-control form-control-sm offering-option-amount" 
                                placeholder="0.00" step="0.01" min="0" required>
                        </div>
                        <div class="col-md-1 text-end">
                            <button type="button" class="btn btn-sm btn-outline-danger btn-remove-offering-option">
                                <i class="bi bi-x"></i>
                            </button>
                        </div>
                    </div>
                </div>
            `;
      $(
        `.offering-options-container[data-offering-index="${offeringIndex}"]`
      ).append(html);
    },

    // Remove element
    removeElement: function ($btn) {
      const $element = $btn.closest(
        ".option-item, .entry-item, .offering-item, .offering-option-item"
      );
      $element.fadeOut(300, function () {
        $(this).remove();
      });
    },

    // Collect form data
    collectFormData: function () {
      // Collect Application Options
      const applicationOptions = [];
      $("#applicationOptionsContainer .option-item").each(function () {
        const name = $(this).find(".app-option-name").val().trim();
        const amount =
          parseFloat($(this).find(".app-option-amount").val()) || 0;
        if (name) {
          applicationOptions.push({ name, amount });
        }
      });

      // Collect Dedication
      const enableDedication = $("#enableDedication").is(":checked");
      const dedicationName = $("#dedicationName").val().trim();
      const dedicationOptions = [];
      if (enableDedication) {
        $("#dedicationEntriesContainer .entry-item").each(function () {
          const entry = $(this).find(".dedication-entry").val().trim();
          if (entry) {
            dedicationOptions.push(entry);
          }
        });
      }

      // Collect Offerings
      const enableOffering = $("#enableOffering").is(":checked");
      const offerings = [];
      if (enableOffering) {
        $("#offeringsContainer .offering-item").each(function () {
          const offeringName = $(this).find(".offering-name").val().trim();
          const options = [];

          $(this)
            .find(".offering-option-item")
            .each(function () {
              const optionName = $(this)
                .find(".offering-option-name")
                .val()
                .trim();
              const optionAmount =
                parseFloat($(this).find(".offering-option-amount").val()) || 0;
              if (optionName) {
                options.push({ name: optionName, amount: optionAmount });
              }
            });

          if (offeringName && options.length > 0) {
            offerings.push({ name: offeringName, options });
          }
        });
      }

      return {
        name: $("#masterName").val().trim(),
        application_options: applicationOptions,
        enable_dedication: enableDedication,
        dedication_name: dedicationName,
        dedication_options: dedicationOptions,
        enable_offering: enableOffering,
        offerings: offerings,
        status: $("#masterStatus").is(":checked") ? 1 : 0,
      };
    },

    // Validate form
    validateForm: function (data) {
      if (!data.name) {
        TempleCore.showToast("Please enter master name", "error");
        return false;
      }

      if (data.application_options.length === 0) {
        TempleCore.showToast(
          "Please add at least one application option",
          "error"
        );
        return false;
      }

      if (
        data.enable_dedication &&
        (!data.dedication_name || data.dedication_options.length === 0)
      ) {
        TempleCore.showToast("Please configure dedication properly", "error");
        return false;
      }

      if (data.enable_offering && data.offerings.length === 0) {
        TempleCore.showToast("Please add at least one offering", "error");
        return false;
      }

      return true;
    },

    // Save master
    saveMaster: function () {
      const self = this;
      const data = this.collectFormData();

      console.log("💾 Saving master data:", data);

      if (!this.validateForm(data)) {
        return;
      }

      TempleCore.showLoading(true);

      const apiCall = this.editMode
        ? DharmaAssemblyAPI.masters.update(this.editId, data)
        : DharmaAssemblyAPI.masters.create(data);

      apiCall
        .done(function (response) {
          console.log("✅ Save response:", response);
          if (response.success) {
            TempleCore.showToast(
              self.editMode
                ? "Master updated successfully"
                : "Master created successfully",
              "success"
            );
            $("#masterFormModal").modal("hide");
            self.loadMasterList();
          } else {
            TempleCore.showToast(
              response.message || "Failed to save master",
              "error"
            );
          }
        })
        .fail(function (xhr) {
          console.error("❌ Save error:", xhr);
          const message = xhr.responseJSON?.message || "Failed to save master";
          TempleCore.showToast(message, "error");
        })
        .always(function () {
          TempleCore.showLoading(false);
        });
    },

    // Edit master
    editMaster: function (id) {
      const self = this;

      console.log("✏️ Editing master:", id);
      console.log("🔍 DharmaAssemblyAPI available:", typeof DharmaAssemblyAPI);
      console.log("🔍 TempleAPI available:", typeof TempleAPI);

      TempleCore.showLoading(true);

      DharmaAssemblyAPI.masters
        .getById(id)
        .done(function (response) {
          console.log("✅ Master data loaded:", response);
          if (response.success) {
            self.populateForm(response.data);
            self.editMode = true;
            self.editId = id;
            $("#modalTitle").text("Edit Master Configuration");
            $("#masterFormModal").modal("show");
          } else {
            TempleCore.showToast(
              response.message || "Failed to load master data",
              "error"
            );
          }
        })
        .fail(function (xhr) {
          console.error("❌ Load error:", xhr);
          console.error("❌ Response:", xhr.responseText);
          console.error("❌ Status:", xhr.status);
          TempleCore.showToast("Failed to load master data", "error");
        })
        .always(function () {
          TempleCore.showLoading(false);
        });
    },

    // Populate form with data
    populateForm: function (data) {
      const self = this;

      console.log("📝 Populating form with data:", data);

      $("#masterName").val(data.name || "");
      $("#masterStatus").prop("checked", data.status === 1);

      // Clear containers
      $("#applicationOptionsContainer").empty();
      $("#dedicationEntriesContainer").empty();
      $("#offeringsContainer").empty();

      // Populate Application Options
      if (data.application_options && data.application_options.length > 0) {
        data.application_options.forEach((option) => {
          self.addApplicationOption();
          const $lastOption = $(
            "#applicationOptionsContainer .option-item:last"
          );
          $lastOption.find(".app-option-name").val(option.name || "");
          $lastOption.find(".app-option-amount").val(option.amount || 0);
        });
      } else {
        self.addApplicationOption();
      }

      // Populate Dedication
      if (data.enable_dedication) {
        $("#enableDedication").prop("checked", true);
        $("#dedicationName").val(data.dedication_name || "");
        self.toggleDedicationBlock(true);

        if (data.dedication_options && data.dedication_options.length > 0) {
          data.dedication_options.forEach((entry) => {
            self.addDedicationEntry();
            const $lastEntry = $(
              "#dedicationEntriesContainer .entry-item:last"
            );
            $lastEntry.find(".dedication-entry").val(entry || "");
          });
        }
      } else {
        $("#enableDedication").prop("checked", false);
        $("#dedicationName").val("");
      }

      // Populate Offerings
      if (data.enable_offering) {
        $("#enableOffering").prop("checked", true);
        self.toggleOfferingBlock(true);

        if (data.offerings && data.offerings.length > 0) {
          data.offerings.forEach((offering, idx) => {
            self.addOffering();

            const $lastOffering = $("#offeringsContainer .offering-item:last");
            $lastOffering.find(".offering-name").val(offering.name || "");

            // Get actual offering index
            const actualOfferingIndex = $lastOffering.attr(
              "data-offering-index"
            );

            // Clear default option
            $lastOffering.find(".offering-options-container").empty();

            // Add actual options
            if (offering.options && offering.options.length > 0) {
              offering.options.forEach((option) => {
                self.addOfferingOption(parseInt(actualOfferingIndex));
                const $lastOption = $lastOffering.find(
                  ".offering-option-item:last"
                );
                $lastOption
                  .find(".offering-option-name")
                  .val(option.name || "");
                $lastOption
                  .find(".offering-option-amount")
                  .val(option.amount || 0);
              });
            }
          });
        }
      } else {
        $("#enableOffering").prop("checked", false);
      }

      console.log("✅ Form populated successfully");
    },

    // Delete master
    deleteMaster: function (id) {
      const self = this;

      if (typeof Swal === "undefined") {
        if (
          !confirm("Are you sure you want to delete this master configuration?")
        ) {
          return;
        }
        self.performDelete(id);
      } else {
        Swal.fire({
          title: "Delete Master?",
          text: "This action cannot be undone!",
          icon: "warning",
          showCancelButton: true,
          confirmButtonColor: "#dc3545",
          cancelButtonColor: "#6c757d",
          confirmButtonText: "Yes, delete it!",
          cancelButtonText: "Cancel",
        }).then((result) => {
          if (result.isConfirmed) {
            self.performDelete(id);
          }
        });
      }
    },

    performDelete: function (id) {
      const self = this;

      console.log("🗑️ Deleting master:", id);

      TempleCore.showLoading(true);

      DharmaAssemblyAPI.masters
        .delete(id)
        .done(function (response) {
          console.log("✅ Delete response:", response);
          if (response.success) {
            TempleCore.showToast("Master deleted successfully", "success");
            self.loadMasterList();
          } else {
            TempleCore.showToast(
              response.message || "Failed to delete master",
              "error"
            );
          }
        })
        .fail(function (xhr) {
          console.error("❌ Delete error:", xhr);
          const message =
            xhr.responseJSON?.message || "Failed to delete master";
          TempleCore.showToast(message, "error");
        })
        .always(function () {
          TempleCore.showLoading(false);
        });
    },

    // Reset form
    resetForm: function () {
      this.editMode = false;
      this.editId = null;

      $("#masterForm")[0].reset();
      $("#enableDedication").prop("checked", false);
      $("#enableOffering").prop("checked", false);
      $("#masterStatus").prop("checked", true);

      $("#dedicationBlock").hide();
      $("#offeringBlock").hide();

      $("#applicationOptionsContainer").empty();
      $("#dedicationEntriesContainer").empty();
      $("#offeringsContainer").empty();
    },

    // Cleanup
    cleanup: function () {
      console.log(`🧹 Cleaning up ${this.pageId}...`);

      window.DharmaAssemblySharedModule.unregisterPage(this.pageId);

      // Destroy DataTable
      if (this.dataTable) {
        this.dataTable.destroy();
        this.dataTable = null;
      }

      // Remove all delegated events
      $(document).off("." + this.eventNamespace);
      $(window).off("." + this.eventNamespace);

      // Remove modal events
      $("#masterFormModal").off("hidden.bs.modal." + this.eventNamespace);

      // Hide and clean modal
      $("#masterFormModal").modal("hide");
      $(".modal-backdrop").remove();
      $("body").removeClass("modal-open");

      console.log(`✅ ${this.pageId} cleaned up successfully`);
    },
  };
})(jQuery, window);

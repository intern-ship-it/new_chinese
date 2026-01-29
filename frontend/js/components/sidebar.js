// js/components/sidebar.js
// Sidebar component with submenu support

(function ($, window) {
  "use strict";

  window.SidebarComponent = {
    // Menu items configuration with submenu support
    menuItems: [
      {
        id: "dashboard",
        icon: "speedometer2",
        text: "Dashboard",
        permission: "access_dashboard",
      },
      {
        id: "organization",
        icon: "diagram-3",
        text: "Organization",
        permission: "view_organization",
      },
      // { id: 'members', icon: 'people', text: 'Members', permission: 'view_users' },
      {
        id: "members",
        icon: "people",
        text: "Members",
        permission: "view_users",
        hasSubmenu: true,
        submenu: [
          {
            id: "members",
            icon: "list-ul",
            text: "All Members",
            permission: "view_users",
          },
          {
            id: "members/create",
            icon: "person-plus",
            text: "Add New Member",
            permission: "view_users",
          },
          {
            id: "members/application",
            icon: "file-earmark-person",
            text: "Applications",
            permission: "view_users",
          },
          {
            id: "members/reports",
            icon: "file-earmark-bar-graph",
            text: "Reports",
            permission: "view_users",
          },
        ],
      },
      // {
      //   id: "bookings",
      //   icon: "calendar-check",
      //   text: "Bookings",
      //   permission: "view_bookings",
      // },
      {
        id: "sales",
        icon: "shop",  // or "cart4", "bag-check", "cash-stack"
        text: "Sales Master",
        permission: "view_masters",
        hasSubmenu: true,
        submenu: [
          {
            id: "sale-items",
            icon: "box-seam",  // or "boxes", "archive", "grid-3x3"
            text: "Items",
            permission: "view_masters",
          },
          {
            id: "sale-sessions",
            icon: "calendar-event",  // or "clock-history", "calendar-check", "hourglass"
            text: "Sessions",
            permission: "view_masters",
          },
          {
            id: "sale-categories",
            icon: "tags",  // or "bookmark", "folder2", "collection"
            text: "Category",
            permission: "view_masters",
          },
          {
            id: "sales/packages",
            icon: "box-seam-fill",  // or "package", "gift-fill", "boxes"
            text: "Packages",
            permission: "view_masters",
          },

        ],
      },

      {
        id: "sales",
        icon: "receipt",
        text: "Sales",
        permission: "view_bookings",
        hasSubmenu: true,
        submenu: [
    
          {
            id: "sales/orders",
            icon: "cart-check",
            text: "Orders",
            permission: "view_bookings",
          },
          {
            id: "sales/invoices",
            icon: "receipt",
            text: "Invoices",
            permission: "view_bookings",
          },
          {
            id: "sales/delivery-orders",
            icon: "truck",
            text: "Delivery Orders",
            permission: "view_bookings",
          },
        ],
      },
      {
        id: "pos-sales",
        icon: "cart4",
        text: "POS Order",
        permission: "view_bookings",
        hasSubmenu: true,
        submenu: [
          {
            id: "pos-sales/create",
            icon: "plus-circle",
            text: "Create",
            permission: "view_bookings",
          },
          {
            id: "pos-sales",
            icon: "clipboard-data",
            text: "Report",
            permission: "view_bookings",
          }
        ],
      },

      {
        id: "buddha-lamp",
        icon: "lightbulb",
        text: "Buddha Lamp",
        permission: "view_bookings",
        hasSubmenu: true,
        submenu: [
          {
            id: "buddha-lamp",
            icon: "list-ul",
            text: "Bookings",
            permission: "view_bookings",
          },
          {
            id: "buddha-lamp/masters",
            icon: "gear",
            text: "Offering Settings",
            permission: "view_bookings",
          },
        ],
      },
      // {
      //   id: "donations/list",
      //   icon: "gift",
      //   text: "Donation",
      //   permission: "view_bookings",
      // },

      //donation with submenu
      {
        id: "donation",
        icon: "heart-fill",
        text: "Donation",
        permission: "view_donations",
        hasSubmenu: true,
        submenu: [
          {
            id: "donations/create-donation",  // NEW ITEM
            icon: "plus-circle",
            text: "New Donation",
            permission: "donations.view",
          },
          {
            id: "donations/list",
            icon: "list-ul",
            text: "Donation List",
            permission: "donations.view",
          },
          {
            id: "donation/groups",
            icon: "collection",
            text: "Donation Groups",
            permission: "donation_groups.view",
          },
          {
            id: "donation/masters",
            icon: "gear",
            text: "Master Settings",
            permission: "donation_masters.view",
          },
        ],
      },
      // { id: 'special-occasions', icon: 'calendar-event', text: 'Special Occasions', permission: 'view_bookings' },
      {
        id: "special-occasions",
        icon: "calendar-event",
        text: "Temple Events",
        permission: "view_bookings",
        hasSubmenu: true,
        submenu: [
          {
            id: "temple-events/create",
            icon: "plus-circle",
            text: "New Temple Events",
            permission: "view_bookings",
          },
          {
            id: "special-occasions",
            icon: "calendar-check",
            text: "Booking",
            permission: "view_bookings",
          },
          {
            id: "special-occasions/master",
            icon: "gear",
            text: "Master",
            permission: "view_bookings",
          },
          {
            id: "special-occasions/services",
            icon: "wrench",
            text: "Services",
            permission: "view_bookings",
          },
          {
            id: "special-occasions/relocation-report",
            icon: "file-earmark-bar-graph",
            text: "Relocation Report",
            permission: "view_bookings",
          },
          {
            id: "special-occasions/qr-scanner",
            icon: "qr-code-scan",
            text: "QR Scanner",
            permission: "view_bookings",
          },
        ],
      },
      {
        "id": "auspicious-light",
        "icon": "brightness-high",
        "text": "Auspicious Light",
        "permission": "view_bookings",
        "hasSubmenu": true,
        "submenu": [
          {
            "id": "auspicious-light/entry",
            "icon": "plus-circle",
            "text": "New Registration",
            "permission": "manage_pagoda"
          },
          {
            "id": "pagoda/dashboard",
            "icon": "speedometer2",
            "text": "Dashboard",
            "permission": "view_bookings"
          },
          {
            "id": "pagoda/lights",
            "icon": "lightbulb",
            "text": "Lights Management",
            "permission": "manage_pagoda"
          },
          {
            "id": "pagoda/registrations",
            "icon": "list-check",
            "text": "Registrations",
            "permission": "view_bookings"
          },
          {
            "id": "pagoda/devotees",
            "icon": "people",
            "text": "Devotees",
            "permission": "view_bookings"
          },
          {
            "id": "auspicious-light/index",
            "icon": "graph-up",
            "text": "Reports",
            "permission": "view_reports"
          },
          {
            "id": "pagoda/towers",
            "icon": "building",
            "text": "Tower Management",
            "permission": "manage_pagoda"
          },
          {
            "id": "pagoda/tower-categories",
            "icon": "tags",
            "text": "Tower Category",
            "permission": "manage_pagoda",
          },
        ]
      },
      //dharma-assembly
      // {
      //   id: "dharma-assembly",
      //   icon: "people",
      //   text: "Dharma Assembly",
      //   permission: "view_bookings",
      // },

      // {
      //   id: "dharma-assembly",
      //   icon: "calendar-heart",
      //   text: "Dharma Assembly",
      //   permission: "view_bookings",
      //   hasSubmenu: true,
      //   submenu: [
      //     {
      //       id: "dharma-assembly",
      //       icon: "calendar-check",
      //       text: "Bookings",
      //       permission: "view_bookings",
      //     },
      //     {
      //       id: "dharma-assembly/master",
      //       icon: "gear",
      //       text: "Master Settings",
      //       permission: "view_bookings",
      //     },
      //   ],
      // },
      // {
      //   id: "rom-booking",
      //   icon: "heart-fill",
      //   text: "Rom Booking",
      //   permission: "view_bookings",
      //   hasSubmenu: true,
      //   submenu: [
      //     {
      //       id: "rom-booking",
      //       icon: "list-ul",
      //       text: "Booking List",
      //       permission: "view_bookings",
      //     },
      //       {
      //       id: "rom-booking/session-master",
      //       icon: "clock-history",
      //       text: "Session Master",
      //       permission: "view_bookings",
      //     },
      //     {
      //       id: "rom-booking/venue-master",
      //       icon: "building",
      //       text: "Venue Master",
      //       permission: "view_bookings",
      //     },

      //   ],
      // },

      {
        id: "hall-booking/listing",
        icon: "building",
        text: "Hall Booking",
        permission: "view_bookings",
      },

      // Hall booking Master setting
      {
        id: "hall-booking",
        icon: "building",
        text: "Hall Booking Settings",
        permission: "view_bookings",
        hasSubmenu: true,
        submenu: [
          {
            id: "hall-booking/venue-master",
            icon: "building",
            text: "Venue Master",
            permission: "view_bookings",
          },
          {
            id: "hall-booking/session-master",
            icon: "clock-history",
            text: "Session Master",
            permission: "view_bookings",
          },
          {
            id: "hall-booking/package-master",
            icon: "box-seam",
            text: "Package Master",
            permission: "view_bookings",
          },
          {
            id: "hall-booking/addon-services",
            icon: "layers-fill",
            text: "Add-On Services",
            permission: "view_bookings",
          },
        ],
      },
      // ===================================
      // VOLUNTEER MANAGEMENT - NEW SECTION
      // ===================================
      {
        id: "volunteers",
        icon: "people-fill",
        text: "Volunteer Management",
        // permission: "view_volunteers",
        hasSubmenu: true,
        submenu: [

          {
            id: "volunteers/departments",
            icon: "diagram-3",
            text: "Departments",
            // permission: "view_volunteers",
          },
          {
            id: "volunteers/tasks",
            icon: "list-task",
            text: "Tasks",
            // permission: "view_volunteers",
          },
          {
            id: "volunteers/registration/list",
            icon: "person-lines-fill",
            text: "Register Volunteers",
            // permission: "view_volunteers",
          },
          {
            id: "volunteers/approval-queue",
            icon: "clipboard-check",
            text: "Approval Queue",
            // permission: "approve_volunteers",
            badge: "volunteer_pending_approvals",
          },
          {
            id: "volunteers/assignments",
            icon: "calendar-check",
            text: "Task Assignments",
            // permission: "manage_volunteers",
          },
          {
            id: "volunteers/attendance",
            icon: "clock-history",
            text: "Attendance",
            // permission: "manage_volunteers",
          },
          {
            id: "volunteers/reports",
            icon: "file-earmark-bar-graph",
            text: "Reports",
            // permission: "view_reports",
          },
        ],
      },
      // ===================================
      // END VOLUNTEER MANAGEMENT
      // ===================================

      {
        id: "users",
        icon: "people",
        text: "Users",
        permission: "view_users",
        hasSubmenu: true,
        submenu: [
          {
            id: "designation",
            icon: "person-badge",
            text: "Designation",
            permission: "designation.view",
          },
          {
            id: "staff",
            icon: "people",
            text: "Staff",
            permission: "view.staff",
          },
          {
            id: "roles",
            icon: "shield-lock",
            text: "Roles",
            permission: "roles.view",
          },
          {
            id: "permissions",
            icon: "key",
            text: "Permissions",
            permission: "permissions.view",
          },
        ],
      },

      {
        id: "masters",
        icon: "database",
        text: "Masters",
        permission: "view_masters",
        hasSubmenu: true,
        submenu: [
          {
            id: "purchase/masters/payment-modes",
            icon: "wallet2",
            text: "Payment Modes",
            permission: "masters.payment_modes",
          },
          {
            id: "purchase/masters/tax",
            icon: "percent",
            text: "Tax",
            permission: "masters.tax",
          },
          {
            id: "deities",
            icon: "brightness-high",  // or "sun", "star", "moon-stars" for spiritual context
            text: "Deity",
            permission: "view_masters",
          },
      {
            id: "sales/devotees",
            icon: "people",
            text: "Devotees",
            permission: "devotees.view",
          },
        ],
      },
      {
        id: "accounts",
        icon: "calculator",
        text: "Accounts",
        permission: "view_accounts",
        hasSubmenu: true,
        submenu: [
          {
            id: "accounts/coa",
            icon: "diagram-3",
            text: "Chart of Accounts",
            permission: "chart_of_accounts.view",
          },
          {
            id: "accounts/ledger",
            icon: "book",
            text: "Ledger",
            permission: "ledger.view",
          },

          {
            id: "entries",
            icon: "journal-bookmark",
            text: "Book Entries",
            permission: "entries.view",
          },
          {
            id: "entries/payment/approval-list",
            icon: "check2-square",
            text: "Payment Approvals",
            permission: "entries.view",
            badge: "approval_pending",
          },
          {
            id: "budgets",
            icon: "piggy-bank",
            text: "Budget",
            permission: "budget.view",
          },
          {
            id: "accounts/general-ledger",
            icon: "journal-text",
            text: "General Ledger",
            permission: "reports.general_ledger",
          },
          {
            id: "accounts/trial-balance",
            icon: "list-check",
            text: "Trial Balance",
            permission: "trial_balance.view",
          },
          {
            id: "accounts/income-statement",
            icon: "graph-down",
            text: "Profit & Loss",
            permission: "profit_loss.view",
          },
          {
            id: "accounts/balance-sheet",
            icon: "file-earmark-spreadsheet",
            text: "Balance Sheet",
            permission: "balance_sheet.view",
          },
          {
            id: "reports/receipt-payments",
            icon: "cash-stack",
            text: "Receipt & Payments",
            permission: "view_reports",
          },
          {
            id: "reports/cash-flow",
            icon: "currency-exchange",
            text: "Cash Flow",
            permission: "view_reports",
          },
          {
            id: "reconciliation",
            icon: "check2-square",
            text: "Bank Reconciliation",
            permission: "reconciliation.view",
          },
          {
            id: "accounts/year-end-closing",
            icon: "calendar-check",
            text: "Year End Closing",
            permission: "year-end-closing.view",
          },
          {
            id: "accounts/accounting-year",
            icon: "calendar-range",
            text: "Accounting Year",
            permission: "chart_of_accounts.view",
          },
        ],
      },
      {
        id: "inventory",
        icon: "box-seam",
        text: "Inventory",
        permission: "view_inventory",
        hasSubmenu: true,
        submenu: [
          {
            id: "inventory/product",
            icon: "box",
            text: "Product",
            permission: "inventory.product",
          },
          {
            id: "inventory/categories",
            icon: "tags",
            text: "Categories",
            permission: "inventory.categories",
          },
          {
            id: "inventory/uom",
            icon: "activity",
            text: "Unit Measurement",
            permission: "inventory.uom",
          },
          {
            id: "inventory/warehouse",
            icon: "building",
            text: "Warehouses",
            permission: "inventory.warehouse",
          },
          {
            id: "inventory/stock-movement",
            icon: "shuffle",
            text: "Stock Movement",
            permission: "inventory.stock-movement",
          },
          {
            id: "inventory/stock-in",
            icon: "arrow-down-circle",
            text: "Stock In",
            permission: "inventory.stock-in",
          },
          {
            id: "inventory/bulk-stock-in",
            icon: "arrow-down-square",
            text: "Bulk Stock In",
            permission: "inventory.stock-in",
          },
          {
            id: "inventory/stock-out",
            icon: "arrow-up-circle",
            text: "Stock Out",
            permission: "inventory.stock-out",
          },
          {
            id: "inventory/bulk-stock-out",
            icon: "arrow-up-square",
            text: "Bulk Stock Out",
            permission: "inventory.stock-out",
          },
          {
            id: "inventory/stock-transfer",
            icon: "repeat",
            text: "Stock Transfer",
            permission: "inventory.stock-transfer",
          },
        ],
      },

      {
        id: "purchase",
        icon: "cart",
        text: "Purchase",
        permission: "view_purchase",
        hasSubmenu: true,
        submenu: [
          {
            id: "purchase/dashboard",
            icon: "activity",
            text: "Dashboard",
            permission: "dashobarod.view",
          },
          {
            id: "purchase/service_types",
            icon: "tags",
            text: "Service Types",
            permission: "service_types.view",
          },
          {
            id: "purchase/services",
            icon: "collection",
            text: "Services",
            permission: "services.view",
          },
          {
            id: "purchase/suppliers",
            icon: "people",
            text: "Suppliers",
            permission: "suppliers.view",
          },
          {
            id: "purchase/requests",
            icon: "file-earmark-text",
            text: "Requests",
            permission: "requests.view",
          },
          {
            id: "purchase/orders",
            icon: "cart-check",
            text: "Orders",
            permission: "orders.view",
          },
          {
            id: "purchase/invoice",
            icon: "receipt",
            text: "Invoice",
            permission: "invoice.view",
          },
          {
            id: "purchase/payment-approvals",
            icon: "check2-square",
            text: "Payment Approvals",
            permission: "payment_approvals.view",
            badge: "pending_approvals",
          },
          {
            id: "purchase/grn",
            icon: "box-arrow-in-down",
            text: "Goods Received Notes",
            permission: "grn.view",
          },

          {
            id: "purchase/reports/due-report",
            icon: "calendar-x",
            text: "Due Report",
            permission: "reports.view",
            badge: "overdue_count",
          },
          {
            id: "purchase/payment-history",
            icon: "credit-card",
            text: "Payment Tracking",
            permission: "payment-history.view",
          },
          {
            id: "purchase/reports/supplier-statements",
            icon: "file-text",
            text: "Supplier Statements",
            permission: "reports.view",
          },
        ],
      },
      {
        id: "manufacturing",
        icon: "gear-wide-connected",
        text: "Manufacturing",
        permission: "manufacturing.bom.view",
        hasSubmenu: true,
        submenu: [
          {
            id: "manufacturing/bom",
            icon: "diagram-3",
            text: "Bill of Materials",
            permission: "manufacturing.bom.view",
          },
          {
            id: "manufacturing/orders",
            icon: "clipboard-check",
            text: "Production Orders",
            permission: "manufacturing.order.view",
          },
          {
            id: "manufacturing/settings",
            icon: "sliders",
            text: "Settings",
            permission: "manufacturing.settings.manage",
          },
          {
            id: "manufacturing/reports",
            icon: "file-earmark-bar-graph",
            text: "Reports",
            permission: "manufacturing.reports.view",
          },
        ],
      },
      {
        id: "reports",
        icon: "graph-up",
        text: "Reports",
        permission: "view_reports",
      },
      {
        id: "daily-closing",
        icon: "journal-check",
        text: "Daily Closing",
        permission: "manufacturing.reports.view",
      },
      {
        id: "booking-settings",
        icon: "gear-fill",
        text: "Booking Settings",
        permission: "view_settings",
      },
      {
        id: "settings",
        icon: "gear",
        text: "Settings",
        permission: "view_settings",
      },
    ],

    // Initialize sidebar
    init: function () {
      this.render();
      this.checkPermissions();
      this.updateInfo();
      this.bindEvents();
      this.highlightActivePage();
      this.startClock();
      this.restoreSubmenuState();
    },

    // Render sidebar HTML
    render: function () {
      let menuHtml = "";

      // Build menu items
      $.each(this.menuItems, function (index, item) {
        if (item.hasSubmenu) {
          menuHtml += `
                        <div class="nav-item-wrapper">
                            <a class="nav-link nav-link-parent" href="#" data-page="${item.id}" data-permission="${item.permission}">
                                <i class="bi bi-${item.icon}"></i> 
                                <span class="nav-text">${item.text}</span>
                                <i class="bi bi-chevron-right submenu-arrow ms-auto"></i>
                            </a>
                            <div class="submenu" id="submenu-${item.id}">
                    `;

          $.each(item.submenu, function (subIndex, subItem) {
            menuHtml += `
                            <a class="nav-link nav-link-sub" href="#" data-page="${subItem.id}" data-permission="${subItem.permission}">
                                <i class="bi bi-${subItem.icon}"></i> 
                                <span class="nav-text">${subItem.text}</span>
                            </a>
                        `;
          });

          menuHtml += `
                            </div>
                        </div>
                    `;
        } else {
          menuHtml += `
                        <a class="nav-link" href="#" data-page="${item.id}" data-permission="${item.permission}">
                            <i class="bi bi-${item.icon}"></i> 
                            <span class="nav-text">${item.text}</span>
                        </a>
                    `;
        }
      });

      const html = `
                <div class="sidebar">
                    <nav class="nav flex-column" id="sidebarNav">
                        ${menuHtml}
                        
                        <!-- Mobile Only - Logout -->
                        <a class="nav-link d-md-none" href="#" id="mobileLogout">
                            <i class="bi bi-box-arrow-right"></i> 
                            <span class="nav-text">Logout</span>
                        </a>
                    </nav>
                    
                    <!-- Sidebar Footer - Desktop Only -->
                    <div class="sidebar-footer d-none d-md-block">
                        <hr class="my-3">
                        <div class="px-3 text-muted small">
                            <div id="sidebarTempleInfo">
                                <i class="bi bi-building"></i> <span id="sidebarTempleName">Temple</span>
                            </div>
                            <div class="mt-2">
                                <i class="bi bi-clock"></i> <span id="currentTime"></span>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Mobile Sidebar Overlay -->
                <div class="sidebar-overlay d-md-none" id="sidebarOverlay"></div>

                <!-- Submenu Styles -->
                <style>
                    .nav-item-wrapper {
                        position: relative;
                    }

                    .nav-link-parent {
                        position: relative;
                        display: flex;
                        align-items: center;
                    }

                    .submenu-arrow {
                        font-size: 12px;
                        transition: transform 0.3s ease;
                    }

                    .nav-link-parent.expanded .submenu-arrow {
                        transform: rotate(90deg);
                    }

                    .submenu {
                        display: none;
                        background: rgba(0, 0, 0, 0.05);
                        margin-left: 0;
                        padding-left: 0;
                    }

                    .submenu.show {
                        display: block;
                        animation: slideDown 0.3s ease;
                    }

                    .nav-link-sub {
                        padding-left: 2.5rem !important;
                        font-size: 0.9rem;
                    }

                    .nav-link-sub.active {
                        background: rgba(var(--primary-rgb), 0.1);
                        border-left: 3px solid var(--primary-color);
                    }

                    @keyframes slideDown {
                        from {
                            opacity: 0;
                            max-height: 0;
                        }
                        to {
                            opacity: 1;
                            max-height: 500px;
                        }
                    }

                    .sidebar.collapsed .submenu {
                        display: none !important;
                    }

                    .sidebar.collapsed .submenu-arrow {
                        display: none;
                    }

                    @media (max-width: 767px) {
                        .submenu {
                            background: rgba(0, 0, 0, 0.1);
                        }
                    }
                </style>
            `;

      $("#sidebar-container").html(html);
    },

    // Check permissions and hide/show menu items
    checkPermissions: function () {
      const user = JSON.parse(
        localStorage.getItem(APP_CONFIG.STORAGE.USER) || "{}"
      );
      const permissions = user.permissions || [];

      console.log("User type:", user.user_type); // Debug log
      console.log("User permissions:", permissions); // Debug log

      $(".sidebar .nav-link[data-permission]").each(function () {
        const $link = $(this);
        const requiredPermission = $link.data("permission");

        // Super Admin sees everything
        if (user.user_type === "SUPER_ADMIN") {
          $link.show();
          return;
        }

        // Admin sees most things
        if (user.user_type === "ADMIN") {
          // Admin can view all "view_" permissions and chart_of_accounts permissions
          if (
            requiredPermission.startsWith("view_") ||
            requiredPermission.startsWith("chart_of_accounts") ||
            requiredPermission.startsWith("ledger") ||
            requiredPermission.startsWith("trial_balance") ||
            requiredPermission.startsWith("profit_loss") ||
            requiredPermission.startsWith("balance_sheet") ||
            requiredPermission.startsWith("reconciliation")
          ) {
            $link.show();
            return;
          }
        }

        // Check specific permissions
        if (permissions.includes(requiredPermission)) {
          $link.show();
        } else {
          // Don't hide parent menus immediately
          if (!$link.hasClass("nav-link-parent")) {
            $link.hide();
          }
        }
      });

      // Now check parent menus - show parent if at least one child is visible
      $(".nav-link-parent").each(function () {
        const $parent = $(this);
        const $submenu = $parent.siblings(".submenu");
        const visibleItems = $submenu.find(".nav-link-sub").length;

        console.log(
          "Parent menu:",
          $parent.text(),
          "Visible submenu items:",
          visibleItems
        ); // Debug log

        if (visibleItems === 0) {
          // If no submenu items visible, check if parent permission allows viewing
          const parentPermission = $parent.data("permission");
          if (
            user.user_type === "SUPER_ADMIN" ||
            (user.user_type === "ADMIN" &&
              parentPermission.startsWith("view_")) ||
            permissions.includes(parentPermission)
          ) {
            $parent.show();
          } else {
            $parent.closest(".nav-item-wrapper").hide();
          }
        } else {
          // Show parent if it has visible children
          $parent.show();
          $parent.closest(".nav-item-wrapper").show();
        }
      });
    },

    // Update sidebar information
    updateInfo: function () {
      const temple = JSON.parse(
        localStorage.getItem(APP_CONFIG.STORAGE.TEMPLE) || "{}"
      );
      $("#sidebarTempleName").text(temple.name || "Temple");
    },

    // Highlight active page
    highlightActivePage: function () {
      const currentPage = TempleRouter.getCurrentPage();

      $(".sidebar .nav-link").removeClass("active");
      $(".nav-link-parent").removeClass("expanded");
      $(".submenu").removeClass("show");

      // Check if it's a submenu item
      const $subLink = $(`.nav-link-sub[data-page="${currentPage}"]`);
      if ($subLink.length > 0) {
        $subLink.addClass("active");
        // Expand parent menu
        const $parent = $subLink
          .closest(".nav-item-wrapper")
          .find(".nav-link-parent");
        $parent.addClass("expanded");
        $subLink.closest(".submenu").addClass("show");
      } else {
        // Check main menu items
        const pageName = currentPage.split("/")[0];
        const $mainLink = $(`.sidebar .nav-link[data-page="${pageName}"]`);
        $mainLink.addClass("active");

        // If it's a parent with submenu and we're on a sub-page, expand it
        if (
          $mainLink.hasClass("nav-link-parent") &&
          currentPage.includes("/")
        ) {
          $mainLink.addClass("expanded");
          $mainLink.siblings(".submenu").addClass("show");
        }
      }
    },

    // Start clock
    startClock: function () {
      const updateTime = function () {
        const now = new Date();
        const timeString = now.toLocaleTimeString("en-US", {
          hour: "2-digit",
          minute: "2-digit",
          hour12: true,
        });
        $("#currentTime").text(timeString);
      };

      updateTime();
      setInterval(updateTime, 1000);
    },

    // Bind events
    bindEvents: function () {
      const self = this;

      // Parent menu item clicks (toggle submenu)
      $(".nav-link-parent").on("click", function (e) {
        e.preventDefault();

        const $link = $(this);
        const $submenu = $link.siblings(".submenu");
        const $arrow = $link.find(".submenu-arrow");

        // Toggle submenu
        if ($submenu.hasClass("show")) {
          $submenu.removeClass("show");
          $link.removeClass("expanded");
          self.saveSubmenuState($link.data("page"), false);
        } else {
          // Close other submenus (optional - remove if you want multiple open)
          $(".submenu").removeClass("show");
          $(".nav-link-parent").removeClass("expanded");

          $submenu.addClass("show");
          $link.addClass("expanded");
          self.saveSubmenuState($link.data("page"), true);
        }
      });

      // Regular menu item clicks (including submenu items)
      $(".sidebar .nav-link:not(.nav-link-parent)").on("click", function (e) {
        e.preventDefault();

        const $link = $(this);
        const page = $link.data("page");
        const permission = $link.data("permission");

        // Check permission
        if (permission && !TempleCore.hasPermission(permission)) {
          TempleCore.showToast(
            "You do not have permission to access this page",
            "warning"
          );
          return;
        }

        // Navigate to page
        TempleRouter.navigate(page);

        // Update active state will be handled by highlightActivePage

        // Close mobile sidebar if open
        if ($(".sidebar").hasClass("show")) {
          self.closeMobileSidebar();
        }
      });

      // Mobile logout
      $("#mobileLogout").on("click", function (e) {
        e.preventDefault();
        TempleCore.logout();
      });

      // Sidebar overlay click (mobile)
      $("#sidebarOverlay").on("click", function () {
        self.closeMobileSidebar();
      });

      // Listen for page changes to update active state
      $(window).on("pagechange", function () {
        self.highlightActivePage();
      });
    },

    // Save submenu state
    saveSubmenuState: function (menuId, isOpen) {
      const states = JSON.parse(localStorage.getItem("submenu_states") || "{}");
      states[menuId] = isOpen;
      localStorage.setItem("submenu_states", JSON.stringify(states));
    },

    // Restore submenu state
    restoreSubmenuState: function () {
      const states = JSON.parse(localStorage.getItem("submenu_states") || "{}");

      Object.keys(states).forEach(function (menuId) {
        if (states[menuId]) {
          const $parent = $(`.nav-link-parent[data-page="${menuId}"]`);
          if ($parent.length) {
            $parent.addClass("expanded");
            $parent.siblings(".submenu").addClass("show");
          }
        }
      });
    },

    // Close mobile sidebar
    closeMobileSidebar: function () {
      $(".sidebar").removeClass("show");
      $("#sidebarOverlay").removeClass("show");
    },

    // Other existing methods remain the same...
    addMenuItem: function (item) {
      // Implementation for adding dynamic menu items
    },

    removeMenuItem: function (pageId) {
      $(`.nav-link[data-page="${pageId}"]`).remove();
    },

    updateBadge: function (pageId, count) {
      const $link = $(`.nav-link[data-page="${pageId}"]`);
      let $badge = $link.find(".badge");

      if (count > 0) {
        if ($badge.length === 0) {
          $badge = $('<span class="badge bg-danger ms-auto"></span>');
          $link.append($badge);
        }
        $badge.text(count);
      } else {
        $badge.remove();
      }
    },

    toggleCollapse: function () {
      $(".sidebar").toggleClass("collapsed");
      const isCollapsed = $(".sidebar").hasClass("collapsed");
      localStorage.setItem("sidebar_collapsed", isCollapsed);
    },

    applySavedState: function () {
      const isCollapsed = localStorage.getItem("sidebar_collapsed") === "true";
      if (isCollapsed) {
        $(".sidebar").addClass("collapsed");
      }
    },
  };
})(jQuery, window);

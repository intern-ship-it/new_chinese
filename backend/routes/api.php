<?php
// routes/api.php
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\TempleController;
use App\Http\Controllers\OrganizationController;
use App\Http\Controllers\MemberTypeController;
use App\Http\Controllers\UserController;
use App\Http\Controllers\RoleController;
use App\Http\Controllers\PermissionController;
use App\Http\Controllers\ServiceController;
use App\Http\Controllers\PackageController;
use App\Http\Controllers\PaymentController;
use App\Http\Controllers\StockMovementController;
use App\Http\Controllers\SettingsController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\MemberController;
use App\Http\Controllers\SignatureController;
use App\Http\Controllers\ChartOfAccountsController;
use App\Http\Controllers\LedgerController;
use App\Http\Controllers\BudgetController;
use App\Http\Controllers\EntriesController;
use App\Http\Controllers\ReportsController;
use App\Http\Controllers\IncomeStatementController;
use App\Http\Controllers\ReconciliationController;
use App\Http\Controllers\UomController;
use App\Http\Controllers\InventoryCategoryController;
use App\Http\Controllers\ProductController;
use App\Http\Controllers\WarehouseController;
use App\Http\Controllers\EntriesApprovalController;
use App\Http\Controllers\OpeningStockController;
use App\Http\Controllers\ServiceTypeController;
use App\Http\Controllers\SupplierController;
use App\Http\Controllers\PurchaseOrderController;
use App\Http\Controllers\PurchaseInvoiceController;
use App\Http\Controllers\PurchaseRequestController;
use App\Http\Controllers\PurchaseReportController;
use App\Http\Controllers\TaxMasterController;
use App\Http\Controllers\PaymentModeController;
use App\Http\Controllers\GRNController;
use App\Http\Controllers\PurchasePaymentController;
use App\Http\Controllers\PurchaseDashboardController;
use App\Http\Controllers\BomController;
use App\Http\Controllers\ManufacturingSettingsController;
use App\Http\Controllers\ManufacturingOrderController;
use App\Http\Controllers\ManufacturingReportsController;
use App\Http\Controllers\PurchaseDueReportController;
use App\Http\Controllers\DesignationController;
use App\Http\Controllers\StaffController;
use App\Http\Controllers\BookingSettingsController;
use App\Http\Controllers\BookingController;
use App\Http\Controllers\YearEndClosingController;
use App\Http\Controllers\FundBudgetController;
use App\Http\Controllers\FundBudgetTemplateController;
use App\Http\Controllers\AccountingYearController;
use App\Http\Controllers\PagodaTowerController;
use App\Http\Controllers\PagodaBlockController;
use App\Http\Controllers\PagodaLightController;
use App\Http\Controllers\PagodaRegistrationController;
use App\Http\Controllers\PagodaDevoteeController;
use App\Http\Controllers\PagodaSettingsController;
use App\Http\Controllers\PagodaReportsController;
use App\Http\Controllers\MemberApplicationController;
use App\Http\Controllers\DonationMasterController;
use App\Http\Controllers\VenueMasterController;
use App\Http\Controllers\SessionMasterController;
use App\Http\Controllers\PackageMasterController;
use App\Http\Controllers\AddonGroupController;
use App\Http\Controllers\AddonServiceController;

Route::prefix('v1')->group(function () {
	// Temple validation (no middleware needed - this should be accessible without temple context)
	Route::post('/temple/validate', [TempleController::class, 'validateTemple']);

	// Routes that require temple context
	Route::middleware(['temple'])->group(function () {
		// Auth routes (no auth middleware needed for login)
		Route::post('/auth/login', [AuthController::class, 'login']);
		Route::post('/auth/refresh', [AuthController::class, 'refresh']);

		// Protected routes - Require authentication and active user check
		Route::middleware(['auth:api', 'validate.temple.access', 'check.active'])->group(function () {

			// SINGLE ENDPOINT for getting all SYSTEM settings
			Route::get('/temple/settings', [TempleController::class, 'getSystemSettings']);


			Route::prefix('settings')->group(function () {
				// Get settings - can specify type parameter
				// GET /api/v1/settings?type=AWS
				// GET /api/v1/settings (returns all settings)
				Route::get('/', [SettingsController::class, 'getSettings']);

				// Update settings for a specific type
				// POST /api/v1/settings/update
				// Body: { "type": "AWS", "settings": { "aws_bucket_name": "my-bucket" } }
				Route::post('/update', [SettingsController::class, 'updateSettings']);

				// Reset settings to defaults for a specific type
				// POST /api/v1/settings/reset
				// Body: { "type": "SYSTEM" }
				Route::post('/reset', [SettingsController::class, 'resetSettings'])
					->middleware(['role:super_admin']);

				// Export settings
				// GET /api/v1/settings/export?type=AWS (specific type)
				// GET /api/v1/settings/export (all settings)
				Route::get('/export', [SettingsController::class, 'exportSettings'])
					->middleware(['role:super_admin|admin']);
				Route::post('/logo/upload', [SettingsController::class, 'uploadLogo'])
					->middleware(['role:super_admin|admin']);
				Route::delete('/logo/delete', [SettingsController::class, 'deleteLogo'])
					->middleware(['role:super_admin|admin']);
				Route::get('/logo/current', [SettingsController::class, 'getCurrentLogo']);
				// Import settings
				// POST /api/v1/settings/import
				// Body: { "settings": {...}, "override_existing": true }
				Route::post('/import', [SettingsController::class, 'importSettings'])
					->middleware(['role:super_admin']);
				Route::get('/ac-years', [SettingsController::class, 'getAccountingYears'])
					->middleware(['role:super_admin|admin']);

				Route::get('/organization-positions', [SettingsController::class, 'getOrganizationPositions'])
					->middleware(['role:super_admin|admin']);
			});
			Route::get('/settings/default-values', [SupplierController::class, 'getDefaultValues']);


			// Authentication Management
			Route::prefix('auth')->group(function () {
				Route::post('/logout', [AuthController::class, 'logout']);
				Route::get('/user', [AuthController::class, 'getCurrentUser']);
				Route::post('/change-password', [AuthController::class, 'changePassword']);
				Route::get('/devices', [AuthController::class, 'getUserDevices']);
				Route::delete('/devices/{deviceId}', [AuthController::class, 'removeDevice']);
			});

			// Dashboard
			Route::prefix('dashboard')->group(function () {
				Route::get('/stats', [DashboardController::class, 'getStats']);
				Route::get('/recent-activities', [DashboardController::class, 'getRecentActivities']);
				Route::get('/today-bookings', [DashboardController::class, 'getTodayBookings']);
				Route::get('/revenue-summary', [DashboardController::class, 'getRevenueSummary']);
			});

			// Organization Management Routes
			Route::prefix('organization')->group(function () {
				// View permissions (all authenticated users)
				Route::middleware(['permission:manage_organization'])->group(function () {
					Route::get('/positions', [OrganizationController::class, 'getPositions']);
					Route::get('/chart', [OrganizationController::class, 'getOrganizationChart']);
					Route::get('/history', [OrganizationController::class, 'getPositionHistory']);
					Route::get('/available-members', [OrganizationController::class, 'getAvailableMembers']);
				});

				// Admin/Super Admin only - Create and Delete positions
				Route::middleware(['permission:create_position'])->group(function () {
					Route::post('/positions', [OrganizationController::class, 'createPosition']);
				});
				Route::middleware(['permission:edit_position'])->group(function () {
					Route::put('/positions/{id}', [OrganizationController::class, 'updatePosition']);
				});
				Route::middleware(['permission:delete_position'])->group(function () {
					Route::delete('/positions/{id}', [OrganizationController::class, 'deletePosition']);
				});

				// Super Admin only - Assign/Remove members from positions
				Route::middleware(['role:super_admin'])->group(function () {
					Route::post('/assign-position', [OrganizationController::class, 'assignPosition']);
					Route::post('/remove-position', [OrganizationController::class, 'removePosition']);
					Route::post('/extend-term', [OrganizationController::class, 'extendTerm']);
				});
			});

			// Member Types Management
			Route::prefix('member-types')->group(function () {
				// View permissions (all authenticated users)
				Route::get('/', [MemberTypeController::class, 'getMemberTypes']);
				Route::get('/{id}', [MemberTypeController::class, 'getMemberType']);
				Route::get('/{typeId}/members', [MemberTypeController::class, 'getMembersByType']);

				// Admin/Super Admin only
				Route::middleware(['role:super_admin|admin'])->group(function () {
					Route::post('/', [MemberTypeController::class, 'createMemberType']);
					Route::put('/{id}', [MemberTypeController::class, 'updateMemberType']);
					Route::delete('/{id}', [MemberTypeController::class, 'deleteMemberType']);
					Route::post('/assign', [MemberTypeController::class, 'assignMemberType']);
				});
			});

			// Member Subscriptions
			Route::prefix('subscriptions')->group(function () {
				// Route::middleware(['permission:view_members'])->group(function () {
				Route::get('/', [MemberTypeController::class, 'getMemberSubscriptions']);
				Route::get('/expiring', [MemberTypeController::class, 'getExpiringSubscriptions']);
				Route::get('/expired', [MemberTypeController::class, 'getExpiredSubscriptions']);
				// });

				// Route::middleware(['permission:manage_members'])->group(function () {
				Route::post('/renew', [MemberTypeController::class, 'renewSubscription']);
				Route::post('/cancel', [MemberTypeController::class, 'cancelSubscription']);
				// });
			});

			// User Management
			Route::prefix('users')->group(function () {
				// Route::middleware(['permission:view_users'])->group(function () {
				Route::get('/active-staff', [UserController::class, 'getActiveStaff']);
				Route::get('/', [UserController::class, 'index']);
				Route::get('/{id}', [UserController::class, 'show']);
				Route::get('/type/{userType}', [UserController::class, 'getUsersByType']);
				// });


				// Route::middleware(['permission:create_users'])->group(function () {
				Route::post('/', [UserController::class, 'store']);
				// });

				// Route::middleware(['permission:edit_users'])->group(function () {
				Route::put('/{id}', [UserController::class, 'update']);
				Route::post('/{id}/activate', [UserController::class, 'activate']);
				Route::post('/{id}/deactivate', [UserController::class, 'deactivate']);
				Route::post('/{id}/reset-password', [UserController::class, 'resetPassword']);
				// });

				// Route::middleware(['permission:delete_users'])->group(function () {
				Route::delete('/{id}', [UserController::class, 'destroy']);
				// });

				// User roles and permissions
				// Route::middleware(['permission:manage_users'])->group(function () {
				Route::post('/{id}/assign-role', [UserController::class, 'assignRole']);
				Route::post('/{id}/remove-role', [UserController::class, 'removeRole']);
				Route::post('/{id}/sync-permissions', [UserController::class, 'syncPermissions']);
				// });

				Route::post('/{id}/assign-roles', [UserController::class, 'assignRoles']);
				// ->middleware(['permission:users.edit']);
				Route::post('/{id}/sync-permissions', [UserController::class, 'syncPermissions']);
				//	->middleware(['permission:users.edit']);
				Route::get('/{id}/permissions', [UserController::class, 'getUserPermissions']);
				//	->middleware(['permission:users.view']);
			});

			// Member Management

			Route::prefix('members')->group(function () {

				Route::get('/profile', function () {
					$user = auth()->user();
					if ($user->user_type !== 'MEMBER') {
						return response()->json(['success' => false, 'message' => 'Not a member'], 400);
					}
					return app(MemberController::class)->getMember($user->id);
				});

				// Routes that use permission checking
				Route::middleware(['permission:view_users|view_members'])->group(function () {
					Route::get('/', [MemberController::class, 'getMembers']);
					Route::get('/search', [MemberController::class, 'searchMembers']);
					Route::get('/statistics', [MemberController::class, 'getMemberStatistics']);
					Route::get('/{id}', [MemberController::class, 'getMember']);
					Route::get('/{familyHeadId}/family', [MemberController::class, 'getFamilyMembers']);
				});

				Route::middleware(['permission:manage_users|manage_members'])->group(function () {
					Route::post('/', [MemberController::class, 'createMember']);
					Route::put('/{id}', [MemberController::class, 'updateMember']);
					Route::patch('/{id}', [MemberController::class, 'updateMember']);
					Route::delete('/{id}', [MemberController::class, 'deleteMember']);
					Route::post('/bulk-update', [MemberController::class, 'bulkUpdateMembers']);
				});

				Route::middleware(['permission:export_reports'])->group(function () {
					Route::get('/export', [MemberController::class, 'exportMembers']);
				});
			});

			Route::prefix('signatures')->group(function () {
				// Upload or update signature (one per member)
				Route::post('/upload', [SignatureController::class, 'uploadSignature']);

				// Get signature
				Route::get('/{userId}', [SignatureController::class, 'getSignature']);

				// Delete signature
				Route::delete('/{userId}', [SignatureController::class, 'deleteSignature']);

				// Get multiple signatures (for reports/bulk operations)
				Route::post('/multiple', [SignatureController::class, 'getMultipleSignatures']);
			});

			Route::prefix('accounts')->group(function () {
				// List all accounting years
				Route::get('/accounting-years', [AccountingYearController::class, 'index']);
				Route::post('/accounting-years/set-active', [AccountingYearController::class, 'setActiveYear']);
				// Update existing accounting year
				Route::put('/accounting-years/{id}', [AccountingYearController::class, 'update']);
				// Bulk update status
				Route::post('/accounting-years/bulk-update-status', [AccountingYearController::class, 'bulkUpdateStatus']);
				// Chart of Accounts
				Route::prefix('chart-of-accounts')->group(function () {
					// View permissions
					Route::middleware(['role:super_admin|admin'])->group(function () {
						Route::get('/', [ChartOfAccountsController::class, 'index']);
						Route::get('/tree', [ChartOfAccountsController::class, 'getTreeData']);
						Route::get('/summary-totals', [ChartOfAccountsController::class, 'getSummaryTotals']);
						Route::get('/hierarchical-groups', [ChartOfAccountsController::class, 'getHierarchicalGroups']);
					});
					Route::get('/active_year', [ChartOfAccountsController::class, 'active_year']);
					// Group Management
					Route::prefix('groups')->group(function () {
						// View permissions
						Route::middleware(['role:super_admin|admin'])->group(function () {
							Route::get('/{id}', [ChartOfAccountsController::class, 'getGroupDetails']);
						});

						Route::middleware(['role:super_admin|admin'])->group(function () {
							Route::get('/', [ChartOfAccountsController::class, 'group_list']);
						});

						// Create permission
						Route::middleware(['role:super_admin|admin'])->group(function () {
							Route::post('/', [ChartOfAccountsController::class, 'storeGroup']);
						});

						// Edit permission
						Route::middleware(['role:super_admin|admin'])->group(function () {
							Route::put('/{id}', [ChartOfAccountsController::class, 'updateGroup']);
						});

						// Delete permission
						Route::middleware(['role:super_admin|admin'])->group(function () {
							Route::delete('/{id}', [ChartOfAccountsController::class, 'deleteGroup']);
						});
					});

					// Ledger Management
					/* Route::prefix('ledgers')->group(function () {
						// View permissions
						Route::middleware(['role:super_admin|admin'])->group(function () {
							Route::get('/{id}', [ChartOfAccountsController::class, 'getLedgerDetails']);
							Route::get('/{id}/view', [ChartOfAccountsController::class, 'viewLedger']);
						});

						// Create permission
						Route::middleware(['role:super_admin|admin'])->group(function () {
							Route::post('/', [ChartOfAccountsController::class, 'storeLedger']);
						});

						// Edit permission
						Route::middleware(['role:super_admin|admin'])->group(function () {
							Route::put('/{id}', [ChartOfAccountsController::class, 'updateLedger']);
						});

						// Delete permission
						Route::middleware(['role:super_admin|admin'])->group(function () {
							Route::delete('/{id}', [ChartOfAccountsController::class, 'deleteLedger']);
						});
					}); */
				});
				Route::prefix('funds')->group(function () {
					Route::get('/', [ChartOfAccountsController::class, 'funds']);
					Route::post('/', [ChartOfAccountsController::class, 'createFund']);
					Route::put('/{id}', [ChartOfAccountsController::class, 'updateFund']);
					Route::delete('/{id}', [ChartOfAccountsController::class, 'deleteFund']);
				});


				Route::prefix('ledgers')->group(function () {

					// Special Ledger Types
					Route::get('/type/bank-accounts', [LedgerController::class, 'bankAccounts']);
					Route::get('/type/inventory', [LedgerController::class, 'inventoryLedgers']);
					Route::get('/type/normal', [LedgerController::class, 'normalLedgers']);
					Route::get('/type/receivables', [LedgerController::class, 'receivables']);
					Route::get('/type/payables', [LedgerController::class, 'payables']);
					Route::get('/type/expense', [LedgerController::class, 'expenseLedgers']);
					Route::get('/type/income', [LedgerController::class, 'incomeLedgers']);
					Route::get('/type/tax', [LedgerController::class, 'taxLedgers']);

					// Utility Routes
					Route::get('/search/autocomplete', [LedgerController::class, 'search']);
					Route::get('/dashboard/summary', [LedgerController::class, 'dashboard']);

					// Import/Export
					Route::get('/export/csv', [LedgerController::class, 'export']);
					Route::post('/import/csv', [LedgerController::class, 'import']);

					Route::get('/next-code', [LedgerController::class, 'getNextRightCode']);
					Route::get('/available-codes-count', [LedgerController::class, 'getAvailableCodesCount']);

					// Basic CRUD
					Route::get('/', [LedgerController::class, 'index']);
					Route::post('/', [LedgerController::class, 'store']);
					Route::get('/{id}', [LedgerController::class, 'show']);
					Route::put('/{id}', [LedgerController::class, 'update']);
					Route::delete('/{id}', [LedgerController::class, 'destroy']);

					// Balance Management
					Route::get('/{id}/balance', [LedgerController::class, 'balance']);
					Route::post('/{id}/opening-balance', [LedgerController::class, 'updateOpeningBalance']);

					// Transactions and Statements
					Route::get('/{id}/transactions', [LedgerController::class, 'transactions']);
					Route::get('/{id}/statement', [LedgerController::class, 'statement']);
				});
				Route::prefix('entries')->group(function () {
					// List all entries with filters
					Route::get('/', [EntriesController::class, 'index']);
					Route::get('/entry-types', [EntriesController::class, 'getEntryTypes']);

					// Common operations for all entry types
					Route::get('/{id}', [EntriesController::class, 'show']);
					Route::delete('/{id}', [EntriesController::class, 'destroy']);

					Route::put('/update/{id}', [EntriesController::class, 'update']);

					// Receipt endpoints
					Route::post('/receipt', [EntriesController::class, 'storeReceipt']);
					Route::put('/receipt/{id}', [EntriesController::class, 'updateReceipt']);


					// Payment endpoints  
					Route::post('/payment', [EntriesController::class, 'storePayment']);
					Route::put('/payment/{id}', [EntriesController::class, 'updatePayment']);

					// Journal endpoints
					Route::post('/journal', [EntriesController::class, 'storeJournal']);
					Route::put('/journal/{id}', [EntriesController::class, 'updateJournal']);
					Route::get('/journal/print/{id}', [EntriesController::class, 'printJournal']);

					// Contra endpoints
					Route::post('/contra', [EntriesController::class, 'storeContra']);
					Route::put('/contra/{id}', [EntriesController::class, 'updateContra']);

					// Credit Note endpoints
					Route::post('/credit-note', [EntriesController::class, 'storeCreditNote']);
					Route::put('/credit-note/{id}', [EntriesController::class, 'updateCreditNote']);

					Route::get('/ledgers/credit', [EntriesController::class, 'withCreditLedgers']);

					// Debit Note endpoints
					Route::post('/debit-note', [EntriesController::class, 'storeDebitNote']);
					Route::put('/debit-note/{id}', [EntriesController::class, 'updateDebitNote']);

					// Inventory Journal endpoints
					Route::post('/inventory-journal', [EntriesController::class, 'storeInventoryJournal']);
					Route::put('/inventory-journal/{id}', [EntriesController::class, 'updateInventoryJournal']);
					Route::get('/inventory/{ledgerId}/balance', [EntriesController::class, 'getInventoryBalance']);


					// Helper endpoints
					Route::get('/ledgers/by-group/{groupCode}', [EntriesController::class, 'getLedgersByGroup']);
					Route::get('/ledgers/inventory', [EntriesController::class, 'getInventoryLedgers']);
					Route::get('/inventory/{ledgerId}/balance', [EntriesController::class, 'getInventoryBalance']);
					Route::post('/generate-code', [EntriesController::class, 'generateCode']);

					/* Route::get('/pending-approvals', [EntriesController::class, 'getPendingApprovals']);
		Route::get('/pending-approvals/{id}', [EntriesController::class, 'getPendingApprovalDetail']);
		Route::post('/{id}/approve', [EntriesController::class, 'processApproval']);
		Route::get('/approval-history', [EntriesController::class, 'getApprovalHistory']);
		Route::get('/approval-history/{id}', [EntriesController::class, 'getApprovalHistoryDetail']) */
					;
					Route::prefix('approval')->group(function () {
						// View approvals
						Route::get('/list', [EntriesApprovalController::class, 'getPendingApprovals']);
						Route::get('/statistics', [EntriesApprovalController::class, 'getStatistics']);
						Route::get('/{id}', [EntriesApprovalController::class, 'show']);

						// Approval actions
						Route::post('/{id}/approve', [EntriesApprovalController::class, 'approve']);
						Route::post('/{id}/reject', [EntriesApprovalController::class, 'reject']);

						// Edit/Cancel (only for pending approvals)
						Route::put('/{id}', [EntriesApprovalController::class, 'update']);
						Route::delete('/{id}/cancel', [EntriesApprovalController::class, 'cancel']);
					});
				});
				Route::prefix('reports')->group(function () {
					// General Ledger
					Route::get('/general-ledger', [ReportsController::class, 'generalLedger']);
					Route::post('/general-ledger/export', [ReportsController::class, 'exportGeneralLedger']);

					// Trial Balance
					Route::get('/trial-balance', [ReportsController::class, 'trialBalance']);
					Route::post('/trial-balance/export', [ReportsController::class, 'exportTrialBalance']);

					// Balance Sheet
					Route::get('/balance-sheet', [ReportsController::class, 'balanceSheet']);
					Route::post('/balance-sheet/export', [ReportsController::class, 'exportBalanceSheet']);

					// Get Ledgers for selection
					Route::get('/ledgers', [ReportsController::class, 'getLedgers']);
					Route::get('/receipt-payments', [ReportsController::class, 'receiptPayments']);
					Route::post('/receipt-payments/export', [ReportsController::class, 'exportReceiptPayments']);

					// Cash Flow Report
					Route::get('/cash-flow', [ReportsController::class, 'cashFlow']);
					Route::post('/cash-flow/export', [ReportsController::class, 'exportCashFlow']);
				});
				Route::prefix('income-statement')->group(function () {
					// Get income statement with filters
					Route::get('/', [IncomeStatementController::class, 'getIncomeStatement']);

					// Export income statement
					Route::get('/export', [IncomeStatementController::class, 'exportIncomeStatement']);
				});

				Route::prefix('reconciliation')->group(function () {
					Route::get('/', [ReconciliationController::class, 'index']);
					Route::post('/start', [ReconciliationController::class, 'start']);
					Route::get('/ac-years', [ReconciliationController::class, 'AcYears']);
					Route::get('/{id}/process', [ReconciliationController::class, 'process']);
					Route::post('/{id}/update-items', [ReconciliationController::class, 'updateItems']);
					Route::post('/{id}/investigation-note', [ReconciliationController::class, 'addInvestigationNote']);
					Route::post('/{id}/adjustment', [ReconciliationController::class, 'createAdjustment']);
					Route::put('/{id}/finalize', [ReconciliationController::class, 'finalize']);
					Route::put('/{id}/lock', [ReconciliationController::class, 'lock']);
					Route::post('/{id}/update-balance', [ReconciliationController::class, 'updateBalance']);
					Route::get('/{id}/view', [ReconciliationController::class, 'view']);
					Route::get('/{id}/report', [ReconciliationController::class, 'report']);
					Route::delete('/{id}', [ReconciliationController::class, 'destroy']);



					Route::get('ledgers/type/bank-accounts', [ReconciliationController::class, 'ReconciliationbankAccounts']);
				});
				// Year End Closing
				Route::prefix('/year-end-closing')->group(function () {
					Route::post('/validate', [YearEndClosingController::class, 'validateYearEndClosing']);
					Route::get('/summary', [YearEndClosingController::class, 'getYearEndSummary']);
					Route::post('/execute', [YearEndClosingController::class, 'executeYearEndClosing']);
					Route::get('/progress', [YearEndClosingController::class, 'getClosingProgress']);
				})->middleware(['role:super_admin|admin']);
			});
			Route::prefix('inventory')->group(function () {
				// Products
				Route::prefix('products')->group(function () {
					Route::get('/', [ProductController::class, 'index']);
					Route::post('/', [ProductController::class, 'store']);
					Route::get('/ledgers', [ProductController::class, 'getLedgers']);
					Route::get('/low-stock', [ProductController::class, 'getLowStockProducts']);
					Route::get('/{id}', [ProductController::class, 'show']);
					Route::put('/{id}', [ProductController::class, 'update']);
					Route::delete('/{id}', [ProductController::class, 'destroy']);
					Route::patch('/{id}/toggle-status', [ProductController::class, 'toggleStatus']);
					Route::get('/types', [ProductController::class, 'getProductTypes']);
					Route::get('/{id}/uom-family', [ProductController::class, 'getUomFamily']);
				});
				Route::prefix('warehouse')->group(function () {
					Route::get('/', [WarehouseController::class, 'index']);
					Route::post('/', [WarehouseController::class, 'store']);
					Route::get('/{id}', [WarehouseController::class, 'show']);
					Route::put('/{id}', [WarehouseController::class, 'update']);
					Route::delete('/{id}', [WarehouseController::class, 'destroy']);
					Route::patch('/{id}/toggle-status', [WarehouseController::class, 'toggleStatus']);
				});

				Route::prefix('opening-stock')->group(function () {
					Route::get('/product/{productId}', [OpeningStockController::class, 'getProductOpeningStock']);
					Route::get('/history/{productId}', [OpeningStockController::class, 'getHistory']);
					Route::get('/warehouse-stock', [OpeningStockController::class, 'getWarehouseStock']);
					Route::post('/', [OpeningStockController::class, 'store']);
					Route::put('/{id}', [OpeningStockController::class, 'update']);
					Route::delete('/{id}', [OpeningStockController::class, 'destroy']);
				});
				// Categories
				Route::prefix('categories')->group(function () {
					Route::get('/', [InventoryCategoryController::class, 'index']);
					Route::get('/tree', [InventoryCategoryController::class, 'getTree']);
					Route::get('/{id}', [InventoryCategoryController::class, 'show']);
					Route::post('/', [InventoryCategoryController::class, 'store']);
					Route::put('/{id}', [InventoryCategoryController::class, 'update']);
					Route::delete('/{id}', [InventoryCategoryController::class, 'destroy']);
					Route::patch('/{id}/toggle-status', [InventoryCategoryController::class, 'toggleStatus']);
				});
				Route::prefix('uom')->group(function () {
					Route::get('/', [UomController::class, 'index']);
					Route::get('/base-units', [UomController::class, 'baseUnits']);
					Route::get('/{id}', [UomController::class, 'show']);
					Route::post('/', [UomController::class, 'store']);
					Route::post('/convert', [UomController::class, 'convert']);
					Route::put('/{id}', [UomController::class, 'update']);
					Route::delete('/{id}', [UomController::class, 'destroy']);
					Route::patch('/{id}/toggle-status', [UomController::class, 'toggleStatus']);
				});

				// Stock Movements
				Route::get('/stock', [StockMovementController::class, 'index']);
				Route::post('/stock-in', [StockMovementController::class, 'stockIn']);
				Route::post('/stock-transfer', [StockMovementController::class, 'transfer']);
				Route::get('/stock/show/{id}', [StockMovementController::class, 'show']);
				Route::post('/stock/{id}/approve', [StockMovementController::class, 'approve']);
				Route::post('/stock/{id}/reject', [StockMovementController::class, 'reject']);
				Route::post('/stock-in/process', [StockMovementController::class, 'processStockIn']);
				Route::get('/stock-in/recent', [StockMovementController::class, 'getRecentStockIn']);
				Route::get('/stock/item-info', [StockMovementController::class, 'getItemStockInfo']);
				Route::get('/stock/export', [StockMovementController::class, 'export']);
				Route::post('/stock/out', [StockMovementController::class, 'processStockOut']);
				Route::post('/stock/check-location', [StockMovementController::class, 'checkStockAtLocation']);
				Route::get('/stock/out/reasons', [StockMovementController::class, 'getStockOutReasons']);
				Route::post('/stock/bulk-out', [StockMovementController::class, 'processBulkStockOut']);


				Route::prefix('stock/transfer')->group(function () {
					Route::post('/check', [StockMovementController::class, 'checkTransferFeasibility']);
					Route::post('/process', [StockMovementController::class, 'processStockTransfer']);
				});
				Route::prefix('stock-in')->group(function () {
					// New bulk stock-in routes
					Route::post('/bulk', [StockMovementController::class, 'bulkStockIn']);
					Route::get('/bulk/{referenceNumber}', [StockMovementController::class, 'getBulkStockIn']);
					Route::put('/bulk/{referenceNumber}', [StockMovementController::class, 'updateBulkStockIn']);
					Route::delete('/bulk/{referenceNumber}', [StockMovementController::class, 'deleteBulkStockIn']);

					// Validation endpoint for opening stock
					Route::get('/validate-opening', [StockMovementController::class, 'validateOpeningStock']);

					// Get all bulk stock-in records (with pagination)
					Route::get('/bulk-list', [StockMovementController::class, 'getBulkStockInList']);
				});
				// Stock Balance & Reports
				Route::get('/balances', [StockBalanceController::class, 'index']);
				Route::get('/balances/warehouse/{warehouseId}', [StockBalanceController::class, 'byWarehouse']);
				Route::get('/alerts', [StockAlertController::class, 'index']);
				Route::get('/reports/valuation', [StockReportController::class, 'valuation']);
				Route::get('/reports/movements', [StockReportController::class, 'movements']);
				Route::get('/reports/expiry', [StockReportController::class, 'expiryReport']);
			});


			Route::prefix('purchase')->group(function () {

				// Service Types Management
				Route::prefix('service-types')->group(function () {
					// View permission
					// Route::middleware(['permission:service_types.view'])->group(function () {
					Route::get('/', [ServiceTypeController::class, 'index']);
					Route::get('/active', [ServiceTypeController::class, 'getActiveServiceTypes']);
					Route::get('/{id}', [ServiceTypeController::class, 'show']);
					//});

					// Create permission
					// Route::middleware(['permission:service_types.create'])->group(function () {
					Route::post('/', [ServiceTypeController::class, 'store']);
					//});

					// Edit permission
					// Route::middleware(['permission:service_types.edit'])->group(function () {
					Route::put('/{id}', [ServiceTypeController::class, 'update']);
					//	});

					// Delete permission
					// Route::middleware(['permission:service_types.delete'])->group(function () {
					Route::delete('/{id}', [ServiceTypeController::class, 'destroy']);
					// });
				});

				// Services Management
				Route::prefix('services')->group(function () {
					// View permission
					// Route::middleware(['permission:services.view'])->group(function () {
					Route::get('/', [ServiceController::class, 'index']);
					Route::get('/active', [ServiceController::class, 'getActiveServices']);
					Route::get('/form-data', [ServiceController::class, 'getFormData']);
					Route::get('/{id}', [ServiceController::class, 'show']);
					// });

					// Create permission
					// Route::middleware(['permission:services.create'])->group(function () {
					Route::post('/', [ServiceController::class, 'store']);
					//});

					// Edit permission
					// Route::middleware(['permission:services.edit'])->group(function () {
					Route::put('/{id}', [ServiceController::class, 'update']);
					// });

					// Delete permission
					// Route::middleware(['permission:services.delete'])->group(function () {
					Route::delete('/{id}', [ServiceController::class, 'destroy']);
					//});
				});

				Route::prefix('reports')->group(function () {
					Route::get('/due', [PurchaseDueReportController::class, 'getDueReport']);
					Route::get('/due/export/excel', [PurchaseDueReportController::class, 'exportToExcel']);
					Route::get('/due/export/pdf', [PurchaseDueReportController::class, 'exportToPdf']);
				});


				// Enhanced Payment History
				Route::get('/invoices/{id}/timeline', [PurchaseDueReportController::class, 'getPaymentTimeline']);
				Route::get('/invoices/{id}/payments', [PurchaseInvoiceController::class, 'getPaymentHistory']);

				// Dashboard
				Route::get('/dashboard/stats', [PurchaseDashboardController::class, 'getStats']);
				Route::get('/dashboard/recent-activities', [PurchaseDashboardController::class, 'getRecentActivities']);
				Route::get('/dashboard/pending-approvals', [PurchaseDashboardController::class, 'getPendingApprovals']);
			});
			Route::prefix('budgets')->group(function () {
				Route::get('/', [BudgetController::class, 'index']);
				Route::get('/eligible-ledgers', [BudgetController::class, 'getEligibleLedgers']);
				Route::post('/', [BudgetController::class, 'store']);
				Route::post('/bulk', [BudgetController::class, 'bulkCreate']);
				Route::put('/{id}', [BudgetController::class, 'update']);
				Route::post('/{id}/submit', [BudgetController::class, 'submit']);
				Route::post('/{id}/approval', [BudgetController::class, 'processApproval']);
				Route::get('/report', [BudgetController::class, 'report']);
				Route::get('/check-overrun/{ledger_id}/{ac_year_id}', [BudgetController::class, 'checkOverrun']);
			});
			Route::prefix('purchase')->group(function () {

				// Supplier Management
				Route::prefix('suppliers')->group(function () {
					Route::get('/', [SupplierController::class, 'index']);
					Route::post('/', [SupplierController::class, 'store']);
					// ->middleware(['permission:create_suppliers']);
					Route::get('/list', [SupplierController::class, 'getActiveSuppliers']);
					Route::get('/{id}', [SupplierController::class, 'show']);
					Route::put('/update/{id}', [SupplierController::class, 'update']);
					// ->middleware(['permission:edit_suppliers']);
					Route::delete('/{id}', [SupplierController::class, 'destroy']);
					// ->middleware(['permission:delete_suppliers']);
					Route::post('/{id}/activate', [SupplierController::class, 'activate']);
					// ->middleware(['permission:edit_suppliers']);
					Route::post('/{id}/deactivate', [SupplierController::class, 'deactivate']);
					// ->middleware(['permission:edit_suppliers']);
					Route::get('/{id}/transactions', [SupplierController::class, 'getTransactions']);
					Route::get('/{id}/statement', [SupplierController::class, 'getStatement']);
					Route::get('/check-delete/{id}', [SupplierController::class, 'checkCanDelete']);
					Route::delete('/delete/{id}', [SupplierController::class, 'destroy']);

					// Supplier Statement
					Route::get('/{id}/suppliers-statement', [PurchaseDueReportController::class, 'getSupplierStatement']);
				});

				// Purchase Requests
				Route::prefix('requests')->group(function () {
					Route::get('/', [PurchaseRequestController::class, 'index']);
					Route::post('/', [PurchaseRequestController::class, 'store']);
					//	->middleware(['permission:create_purchase_requests']);
					Route::get('/{id}', [PurchaseRequestController::class, 'show']);
					Route::put('/{id}', [PurchaseRequestController::class, 'update']);
					//->middleware(['permission:edit_purchase_requests']);
					Route::delete('/{id}', [PurchaseRequestController::class, 'destroy']);
					//->middleware(['permission:delete_purchase_requests']);
					Route::post('/{id}/submit', [PurchaseRequestController::class, 'submit']);
					//->middleware(['permission:edit_purchase_requests']);
					Route::post('/{id}/approve', [PurchaseRequestController::class, 'approve']);
					//->middleware(['role:super_admin']);
					Route::post('/{id}/reject', [PurchaseRequestController::class, 'reject']);
					//->middleware(['role:super_admin']);
					Route::post('/{id}/convert-po', [PurchaseRequestController::class, 'convertToPO']);
					//->middleware(['permission:create_purchase_orders']);
					Route::post('/bulk-approve', [PurchaseRequestController::class, 'bulkApprove']);
					Route::post('/bulk-convert', [PurchaseRequestController::class, 'bulkConvertToPO']);
					Route::post('/get-prs-for-conversion', [PurchaseRequestController::class, 'getPRsForConversion']);
				});

				// Purchase Orders
				Route::prefix('orders')->group(function () {
					Route::get('/', [PurchaseOrderController::class, 'index']);
					Route::post('/', [PurchaseOrderController::class, 'store']);
					//->middleware(['permission:create_purchase_orders']);
					Route::get('/statistics', [PurchaseOrderController::class, 'getStatistics']);
					Route::get('/{id}', [PurchaseOrderController::class, 'show']);
					Route::put('/{id}', [PurchaseOrderController::class, 'update']);
					//->middleware(['permission:edit_purchase_orders']);
					Route::delete('/{id}', [PurchaseOrderController::class, 'destroy']);
					//->middleware(['permission:delete_purchase_orders']);
					Route::post('/{id}/approve', [PurchaseOrderController::class, 'approve']);
					//->middleware(['role:super_admin']);
					Route::post('/{id}/reject', [PurchaseOrderController::class, 'reject']);
					//->middleware(['role:super_admin']);
					Route::post('/{id}/cancel', [PurchaseOrderController::class, 'cancel']);
					//->middleware(['permission:edit_purchase_orders']);
					Route::post('/{id}/invoice', [PurchaseInvoiceController::class, 'createFromPO']);
					//->middleware(['permission:create_purchase_invoices']);
					Route::post('/{id}/grn', [GRNController::class, 'createFromPO']);
					//->middleware(['permission:create_grn']);
					Route::post('/{id}/submit', [PurchaseOrderController::class, 'submit']);
				});

				// Purchase Invoices
				Route::prefix('invoices')->group(function () {
					Route::get('/', [PurchaseInvoiceController::class, 'index']);
					Route::post('/', [PurchaseInvoiceController::class, 'store']);
					//->middleware(['permission:create_purchase_invoices']);
					Route::get('/{id}', [PurchaseInvoiceController::class, 'show']);
					Route::put('/{id}', [PurchaseInvoiceController::class, 'update']);
					//->middleware(['permission:edit_purchase_invoices']);
					Route::delete('/{id}', [PurchaseInvoiceController::class, 'destroy']);
					//->middleware(['permission:delete_purchase_invoices']);
					Route::post('/{id}/post', [PurchaseInvoiceController::class, 'postInvoice']);
					//->middleware(['permission:post_purchase_invoices']);
					Route::post('/{id}/cancel', [PurchaseInvoiceController::class, 'cancel']);
					//->middleware(['permission:cancel_purchase_invoices']);
					Route::post('/{id}/payment', [PurchaseInvoiceController::class, 'processPayment']);
					//->middleware(['permission:process_payments']);
					Route::get('/{id}/payments', [PurchaseInvoiceController::class, 'getPaymentHistory']);
					Route::get('/user/{userId}/permissions', [PurchaseInvoiceController::class, 'getUserPermissions']);
					Route::get('/supplier/{supplierId}/outstanding', [PurchaseInvoiceController::class, 'getSupplierOutstanding']);
					Route::post('/{id}/migrate-to-accounting', [PurchaseInvoiceController::class, 'migrateToAccounting']);

					Route::post('/bulk-migrate', [PurchaseInvoiceController::class, 'retryFailedMigrations']);
				});

				// Purchase Payments
				Route::prefix('payments')->group(function () {
					Route::get('/', [PurchasePaymentController::class, 'index']);
					Route::get('/history', [PurchasePaymentController::class, 'paymentHistory']);
					Route::get('/pending-approvals', [PurchaseInvoiceController::class, 'getPendingApprovals']);
					Route::post('/{id}/approve', [PurchaseInvoiceController::class, 'approvePayment']);
					Route::get('/{id}', [PurchasePaymentController::class, 'show']);
					Route::post('/', [PurchasePaymentController::class, 'store']);

					Route::post('/{id}/cancel', [PurchasePaymentController::class, 'cancel']);
					Route::get('/report/summary', [PurchasePaymentController::class, 'paymentSummary']);
				});

				// Goods Received Notes (GRN)
				Route::prefix('grn')->group(function () {

					Route::get('/', [GRNController::class, 'index']);
					Route::post('/', [GRNController::class, 'store']);
					//->middleware(['permission:create_grn']);
					Route::get('/{id}', [GRNController::class, 'show']);
					Route::put('/{id}', [GRNController::class, 'update']);
					//->middleware(['permission:edit_grn']);
					Route::delete('/{id}', [GRNController::class, 'destroy']);
					//->middleware(['permission:delete_grn']);
					Route::post('/{id}/complete', [GRNController::class, 'complete']);
					//->middleware(['permission:complete_grn']);
					Route::post('/{id}/cancel', [GRNController::class, 'cancel']);
					//->middleware(['permission:cancel_grn']);
					Route::post('/{id}/quality-check', [GRNController::class, 'qualityCheck']);
					//->middleware(['permission:quality_check']);
					Route::get('/po/{poId}/pending', [GRNController::class, 'getPendingForPO']);

					Route::get('/user/{userId}/permissions', [GRNController::class, 'getUserPermissions']);
				});


				// Reports
				Route::prefix('reports')->group(function () {
					Route::get('/purchase-summary', [PurchaseReportController::class, 'purchaseSummary'])
						->middleware(['permission:view_reports']);
					Route::get('/supplier-analysis', [PurchaseReportController::class, 'supplierAnalysis'])
						->middleware(['permission:view_reports']);
					Route::get('/payment-status', [PurchaseReportController::class, 'paymentStatus'])
						->middleware(['permission:view_reports']);
					Route::get('/stock-receipt', [PurchaseReportController::class, 'stockReceipt'])
						->middleware(['permission:view_reports']);
					Route::get('/pending-deliveries', [PurchaseReportController::class, 'pendingDeliveries'])
						->middleware(['permission:view_reports']);
					Route::get('/tax-summary', [PurchaseReportController::class, 'taxSummary'])
						->middleware(['permission:view_reports']);
					Route::get('/aging-report', [PurchaseReportController::class, 'agingReport'])
						->middleware(['permission:view_reports']);
				});

				// Dashboard
				Route::prefix('dashboard')->group(function () {
					Route::get('/stats', [App\Http\Controllers\PurchaseDashboardController::class, 'getStats']);
					Route::get('/recent-activities', [App\Http\Controllers\PurchaseDashboardController::class, 'getRecentActivities']);
					Route::get('/pending-tasks', [App\Http\Controllers\PurchaseDashboardController::class, 'getPendingTasks']);
					Route::get('/top-suppliers', [App\Http\Controllers\PurchaseDashboardController::class, 'getTopSuppliers']);
					Route::get('/purchase-trends', [App\Http\Controllers\PurchaseDashboardController::class, 'getPurchaseTrends']);
				});

				// Import/Export
				Route::prefix('import-export')->group(function () {
					Route::post('/suppliers/import', [SupplierController::class, 'import'])
						->middleware(['role:super_admin|admin']);
					Route::get('/suppliers/export', [SupplierController::class, 'export'])
						->middleware(['permission:export_data']);
					Route::get('/orders/export', [PurchaseOrderController::class, 'export'])
						->middleware(['permission:export_data']);
					Route::get('/invoices/export', [PurchaseInvoiceController::class, 'export'])
						->middleware(['permission:export_data']);
				});
			});
			Route::get('/suppliers/active', [SupplierController::class, 'getActiveSuppliers']);

			// Master Data
			Route::prefix('masters')->group(function () {
				// Tax Master
				Route::prefix('tax')->group(function () {
					Route::get('/', [TaxMasterController::class, 'index']);
					Route::post('/', [TaxMasterController::class, 'store'])
						->middleware(['role:super_admin|admin']);
					Route::get('/{id}', [TaxMasterController::class, 'show']);
					Route::put('/{id}', [TaxMasterController::class, 'update'])
						->middleware(['role:super_admin|admin']);
					Route::delete('/{id}', [TaxMasterController::class, 'destroy'])
						->middleware(['role:super_admin']);
					Route::get('/user/{userId}/permissions', [TaxMasterController::class, 'getUserPermissions']);
				});

				// Payment Modes
				Route::prefix('payment-modes')->group(function () {
					// Specific routes FIRST
					Route::get('/', [PaymentModeController::class, 'index']);
					Route::get('/active', [PaymentModeController::class, 'getActivePaymentModes']);
					Route::get('/roles', [PaymentModeController::class, 'getRoles']);
					Route::get('/modules', [PaymentModeController::class, 'getModules']);
					Route::get('/icons', [PaymentModeController::class, 'getAvailableIcons']);

					Route::post('/', [PaymentModeController::class, 'store']);

					// Wildcard routes LAST
					Route::get('/{id}', [PaymentModeController::class, 'show']);
					Route::put('/{id}', [PaymentModeController::class, 'update']);
					Route::delete('/{id}', [PaymentModeController::class, 'destroy']);

					Route::get('/user/{userId}/permissions', [PaymentModeController::class, 'getUserPermissions']);
				});
			});
			Route::prefix('manufacturing')->group(function () {

				// Bill of Materials (BOM) Management
				Route::prefix('bom')->group(function () {
					Route::get('/', [BomController::class, 'index']);
					//	->middleware(['permission:manufacturing.bom.view']);

					Route::get('/manufacturable-products', [BomController::class, 'getManufacturableProducts']);
					//->middleware(['permission:manufacturing.bom.view']);

					Route::get('/raw-materials', [BomController::class, 'getRawMaterials']);
					//->middleware(['permission:manufacturing.bom.view']);

					Route::get('/{id}', [BomController::class, 'show']);
					//->middleware(['permission:manufacturing.bom.view']);

					Route::post('/', [BomController::class, 'store']);
					//->middleware(['permission:manufacturing.bom.create']);

					Route::put('/{id}', [BomController::class, 'update']);
					//->middleware(['permission:manufacturing.bom.edit']);

					Route::delete('/{id}', [BomController::class, 'destroy']);
					//->middleware(['permission:manufacturing.bom.delete']);

					Route::post('/{id}/approve', [BomController::class, 'approve']);
					//->middleware(['permission:manufacturing.bom.approve']);

					Route::post('/{id}/duplicate', [BomController::class, 'duplicate']);
					//->middleware(['permission:manufacturing.bom.create']);

					Route::post('/{id}/check-availability', [BomController::class, 'checkAvailability']);
					//->middleware(['permission:manufacturing.bom.view']);

					Route::post('/{id}/update-costs', [BomController::class, 'updateCosts']);
					//->middleware(['permission:manufacturing.bom.edit']);
					Route::get('/user/{userId}/permissions', [BomController::class, 'getUserPermissions']);
				});

				// Manufacturing Orders (To be implemented in Phase 2)
				Route::prefix('orders')->group(function () {
					Route::get('/', [ManufacturingOrderController::class, 'index']);
					//	->middleware(['permission:manufacturing.order.view']);

					Route::get('/dashboard', [ManufacturingOrderController::class, 'dashboard']);
					//->middleware(['permission:manufacturing.order.view']);

					Route::get('/warehouses', [ManufacturingOrderController::class, 'getWarehouses']);
					//->middleware(['permission:manufacturing.order.view']);

					Route::get('/active-boms', [ManufacturingOrderController::class, 'getActiveBoms']);
					//	->middleware(['permission:manufacturing.order.view']);

					Route::get('/{id}', [ManufacturingOrderController::class, 'show']);
					//->middleware(['permission:manufacturing.order.view']);

					Route::post('/', [ManufacturingOrderController::class, 'store']);
					//->middleware(['permission:manufacturing.order.create']);

					Route::put('/{id}', [ManufacturingOrderController::class, 'update']);
					//->middleware(['permission:manufacturing.order.edit']);

					Route::delete('/{id}', [ManufacturingOrderController::class, 'destroy']);
					//->middleware(['permission:manufacturing.order.delete']);
					Route::get('/{id}/check-availability', [ManufacturingOrderController::class, 'checkAvailability']);

					Route::post('/check-availability', [ManufacturingOrderController::class, 'checkStockAvailability']);
					//	->middleware(['permission:manufacturing.order.view']);

					Route::post('/{id}/validate', [ManufacturingOrderController::class, 'validateOrder']);
					//->middleware(['permission:manufacturing.order.validate']);

					Route::post('/{id}/start', [ManufacturingOrderController::class, 'startManufacturing']);
					//->middleware(['permission:manufacturing.order.start']);

					Route::post('/{id}/complete', [ManufacturingOrderController::class, 'completeManufacturing']);
					//->middleware(['permission:manufacturing.order.complete']);

					Route::post('/{id}/cancel', [ManufacturingOrderController::class, 'cancelOrder']);
					//->middleware(['permission:manufacturing.order.cancel']);

					Route::post('/{id}/quality-check', [ManufacturingOrderController::class, 'qualityCheck']);
					//->middleware(['permission:manufacturing.quality.check']);
					Route::delete('/{id}', [ManufacturingOrderController::class, 'destroy']);
					Route::get('/user/{userId}/permissions', [ManufacturingOrderController::class, 'getUserPermissions']);
				});

				// Manufacturing Settings
				Route::prefix('settings')->group(function () {
					Route::get('/products', [ManufacturingSettingsController::class, 'getProductSettings']);
					//->middleware(['permission:manufacturing.settings.manage']);

					Route::post('/products/{productId}', [ManufacturingSettingsController::class, 'updateProductSettings']);
					//->middleware(['permission:manufacturing.settings.manage']);
				});

				// Manufacturing Reports (To be implemented in Phase 3)
				Route::prefix('/reports')->group(function () {

					// Dashboard Analytics
					Route::get('/dashboard', [ManufacturingReportsController::class, 'dashboard']);
					//->middleware(['permission:manufacturing.reports.view']);

					// Cost Analysis Report
					Route::get('/cost-analysis', [ManufacturingReportsController::class, 'costAnalysis']);
					//->middleware(['permission:manufacturing.reports.view']);

					// Raw Material Consumption Report
					Route::get('/material-consumption', [ManufacturingReportsController::class, 'rawMaterialConsumption']);
					//->middleware(['permission:manufacturing.reports.view']);

					// Production Efficiency Report
					Route::get('/production-efficiency', [ManufacturingReportsController::class, 'productionEfficiency']);
					//->middleware(['permission:manufacturing.reports.view']);

					// BOM Cost Comparison
					Route::get('/bom-comparison', [ManufacturingReportsController::class, 'bomCostComparison'])
						->middleware(['permission:manufacturing.reports.view']);

					// Manufacturing Summary Report
					Route::get('/summary', [ManufacturingReportsController::class, 'manufacturingSummary']);
					//->middleware(['permission:manufacturing.reports.view']);

					// Export Reports
					Route::post('/export/{reportType}', [ManufacturingReportsController::class, 'exportReport']);
					//->middleware(['permission:manufacturing.reports.export']);

					// Report Schedule (for automated reports)
					Route::prefix('schedule')->group(function () {
						Route::get('/', [ManufacturingReportsController::class, 'getScheduledReports']);
						//->middleware(['permission:manufacturing.reports.view']);

						Route::post('/', [ManufacturingReportsController::class, 'createScheduledReport']);
						//->middleware(['permission:manufacturing.reports.export']);

						Route::delete('/{id}', [ManufacturingReportsController::class, 'deleteScheduledReport']);
						//->middleware(['permission:manufacturing.reports.export']);
					});

					// Custom Report Builder
					Route::prefix('custom')->group(function () {
						Route::get('/fields', [ManufacturingReportsController::class, 'getReportFields'])
							->middleware(['permission:manufacturing.reports.view']);

						Route::post('/generate', [ManufacturingReportsController::class, 'generateCustomReport'])
							->middleware(['permission:manufacturing.reports.view']);

						Route::get('/saved', [ManufacturingReportsController::class, 'getSavedReports'])
							->middleware(['permission:manufacturing.reports.view']);

						Route::post('/save', [ManufacturingReportsController::class, 'saveCustomReport'])
							->middleware(['permission:manufacturing.reports.export']);

						Route::delete('/{id}', [ManufacturingReportsController::class, 'deleteCustomReport'])
							->middleware(['permission:manufacturing.reports.export']);
					});
				});
			});
			// Staff Management Routes
			Route::prefix('staff')->group(function () {
				// Designation Management
				Route::prefix('designations')->group(function () {
					Route::get('/', [DesignationController::class, 'index']);
					Route::post('/', [DesignationController::class, 'store']);
					Route::get('/hierarchy', [DesignationController::class, 'getHierarchy']);
					Route::get('/roles', [DesignationController::class, 'getRoles']);
					Route::get('/{id}', [DesignationController::class, 'show']);
					Route::put('/{id}', [DesignationController::class, 'update']);
					Route::delete('/{id}', [DesignationController::class, 'destroy']);
				});


				// Staff Management
				Route::get('/', [StaffController::class, 'index']);
				Route::post('/', [StaffController::class, 'store']);
				Route::get('/statistics', [StaffController::class, 'getStatistics']);
				Route::get('/active', [StaffController::class, 'activeStaff']);
				Route::post('/import', [StaffController::class, 'importStaff']);
				Route::get('/export', [StaffController::class, 'exportStaff']);
				Route::put('/{id}', [StaffController::class, 'update']);
				Route::get('/{id}', [StaffController::class, 'show']);

				Route::post('/{id}/terminate', [StaffController::class, 'terminate']);
				Route::post('/{id}/activate', [StaffController::class, 'activate']);
				Route::post('/{id}/reset-password', [StaffController::class, 'resetPassword']);
				Route::post('/{id}/reset-password-manual', [StaffController::class, 'resetPasswordManual']);
				Route::get('/export-download', [StaffController::class, 'exportDownload']);
				Route::get('/template/download', [StaffController::class, 'downloadTemplate']);
			});
			// Role Management Routes
			Route::prefix('roles')->group(function () {
				// View permissions (all authenticated users can view roles)
				Route::get('/', [RoleController::class, 'index']);
				//	->middleware(['permission:roles.view']);
				Route::get('/statistics', [RoleController::class, 'statistics']);
				//->middleware(['permission:roles.view']);
				Route::get('/permissions-for-assignment', [RoleController::class, 'getPermissionsForAssignment']);
				//	->middleware(['permission:roles.view']);
				Route::get('/{id}', [RoleController::class, 'show']);
				//	->middleware(['permission:roles.view']);

				// Create permission
				Route::post('/', [RoleController::class, 'store']);
				//->middleware(['permission:roles.create']);
				Route::post('/{id}/duplicate', [RoleController::class, 'duplicate']);
				//	->middleware(['permission:roles.create']);

				// Edit permission
				Route::put('/{id}', [RoleController::class, 'update']);
				//->middleware(['permission:roles.edit']);
				Route::post('/{id}/assign-permissions', [RoleController::class, 'assignPermissions']);
				//->middleware(['permission:roles.edit']);

				// Delete permission
				Route::delete('/{id}', [RoleController::class, 'destroy']);
				//->middleware(['permission:roles.delete']);
			});

			// Permission Management Routes
			Route::prefix('permissions')->group(function () {
				// View permissions
				Route::get('/', [PermissionController::class, 'index']);
				//	->middleware(['permission:permissions.view']);
				Route::get('/grouped', [PermissionController::class, 'getGroupedByModule']);
				//	->middleware(['permission:permissions.view']);
				Route::get('/modules', [PermissionController::class, 'getModules']);
				//	->middleware(['permission:permissions.view']);
				Route::get('/statistics', [PermissionController::class, 'statistics']);
				//	->middleware(['permission:permissions.view']);
				Route::post('/check', [PermissionController::class, 'checkPermission']);
				Route::get('/{id}', [PermissionController::class, 'show']);
				//	->middleware(['permission:permissions.view']);

				// Create permission
				Route::post('/', [PermissionController::class, 'store']);
				//->middleware(['permission:permissions.create']);
				Route::post('/bulk', [PermissionController::class, 'bulkStore']);
				//->middleware(['permission:permissions.create']);
				Route::post('/generate-crud', [PermissionController::class, 'generateCrudPermissions']);
				//->middleware(['permission:permissions.create']);

				// Edit permission
				Route::put('/{id}', [PermissionController::class, 'update']);
				//	->middleware(['permission:permissions.edit']);

				// Delete permission
				Route::delete('/{id}', [PermissionController::class, 'destroy']);
				//->middleware(['permission:permissions.delete']);
			});

			Route::prefix('booking-settings')->group(function () {
				Route::get('/', [BookingSettingsController::class, 'index']);
				Route::post('/get_all_settings', [BookingSettingsController::class, 'get_all_settings']);
				Route::post('/update', [BookingSettingsController::class, 'update']);

				Route::post('/reset', [BookingSettingsController::class, 'reset']);
			});

			Route::prefix('bookings')->group(function () {
				Route::get('/', [BookingController::class, 'index']);
				Route::get('/{id}', [BookingController::class, 'show']);
				Route::put('/{id}/status', [BookingController::class, 'updateStatus']);
				Route::post('/{id}/payment', [BookingController::class, 'addPayment']);
				Route::post('/{id}/cancel', [BookingController::class, 'cancel']);
				Route::get('/{id}/receipt', [BookingController::class, 'getReceipt']);
				Route::post('/{id}/reprint', [BookingController::class, 'reprintTicket']);
			});
			Route::prefix('fund-budgets')->group(function () {
				Route::get('/groups', [FundBudgetController::class, 'getGroups']);
				Route::get('/ledgers/{group_id}', [FundBudgetController::class, 'getLedgersByGroup']);
				// Utility endpoints - FIXED
				Route::post('/check-availability', [FundBudgetController::class, 'checkAvailability'])->name('fund-budgets.check');
				Route::get('/report', [FundBudgetController::class, 'report'])->name('fund-budgets.report');
				Route::get('/report/comparison', [FundBudgetController::class, 'comparisonReport'])->name('fund-budgets.report.comparison');
				Route::get('/report/utilization', [FundBudgetController::class, 'utilizationReport'])->name('fund-budgets.report.utilization');
				Route::get('/timeline-report', [FundBudgetController::class, 'timelineReport']);

				// Basic CRUD - FIXED: Using proper array syntax
				Route::get('/', [FundBudgetController::class, 'index'])->name('fund-budgets.index');
				Route::get('/{id}', [FundBudgetController::class, 'show'])->name('fund-budgets.show');
				Route::post('/', [FundBudgetController::class, 'store'])->name('fund-budgets.store');
				Route::put('/{id}', [FundBudgetController::class, 'update'])->name('fund-budgets.update');
				Route::delete('/{id}', [FundBudgetController::class, 'destroy'])->name('fund-budgets.destroy');

				// Recurring budgets - FIXED
				Route::post('/recurring', [FundBudgetController::class, 'createRecurring'])->name('fund-budgets.recurring');

				// Workflow actions - FIXED
				Route::post('/{id}/submit', [FundBudgetController::class, 'submit'])->name('fund-budgets.submit');
				Route::post('/{id}/approve', [FundBudgetController::class, 'processApproval'])->name('fund-budgets.approve');
				Route::post('/{id}/close', [FundBudgetController::class, 'close'])->name('fund-budgets.close');
				Route::post('/{id}/reopen', [FundBudgetController::class, 'reopen'])->name('fund-budgets.reopen');
			});

			// Fund Budget Templates - FIXED
			Route::prefix('fund-budget-templates')->group(function () {
				Route::get('/', [FundBudgetTemplateController::class, 'index']);
				Route::get('/{id}', [FundBudgetTemplateController::class, 'show']);
				Route::post('/', [FundBudgetTemplateController::class, 'store']);
				Route::put('/{id}', [FundBudgetTemplateController::class, 'update']);
				Route::delete('/{id}', [FundBudgetTemplateController::class, 'destroy']);
				Route::post('/{id}/activate', [FundBudgetTemplateController::class, 'activate']);
				Route::post('/{id}/deactivate', [FundBudgetTemplateController::class, 'deactivate']);
			});
			// Special Occasions Routes
			Route::prefix('special-occasions')->middleware(['auth:api', 'validate.temple.access'])->group(function () {
				Route::get('/', [App\Http\Controllers\SpecialOccasionController::class, 'index']);
				Route::post('/', [App\Http\Controllers\SpecialOccasionController::class, 'store']);
				Route::get('/{id}', [App\Http\Controllers\SpecialOccasionController::class, 'show']);
				Route::put('/{id}', [App\Http\Controllers\SpecialOccasionController::class, 'update']);
				Route::delete('/{id}', [App\Http\Controllers\SpecialOccasionController::class, 'destroy']);
				Route::patch('/{id}/status', [App\Http\Controllers\SpecialOccasionController::class, 'updateStatus']);
				Route::post('/bookings', [App\Http\Controllers\SpecialOccasionController::class, 'storeBooking']);
				Route::get('/bookings/history', [App\Http\Controllers\SpecialOccasionController::class, 'getBookingHistory']);
			});




			Route::prefix('pagoda')->group(function () {

				// ========================================
				// PAGODA TOWERS MANAGEMENT
				// ========================================
				Route::prefix('towers')->group(function () {
					// List all towers with statistics
					Route::get('/', [PagodaTowerController::class, 'index']);

					// Get single tower details
					Route::get('/{id}', [PagodaTowerController::class, 'show']);

					// Get tower statistics dashboard
					Route::get('/{id}/statistics', [PagodaTowerController::class, 'statistics']);

					// Admin only routes
					Route::middleware(['role:super_admin|admin'])->group(function () {
						// Create new tower
						Route::post('/', [PagodaTowerController::class, 'store']);

						// Update tower
						Route::put('/{id}', [PagodaTowerController::class, 'update']);

						// Delete tower
						Route::delete('/{id}', [PagodaTowerController::class, 'destroy']);
					});
				});

				// ========================================
				// PAGODA BLOCKS MANAGEMENT
				// ========================================
				Route::prefix('blocks')->group(function () {
					// List all blocks (optionally filtered by tower)
					Route::get('/', [PagodaBlockController::class, 'index']);

					// Get blocks for specific tower
					Route::get('/tower/{towerId}', [PagodaBlockController::class, 'index']);

					// Get single block details
					Route::get('/{id}', [PagodaBlockController::class, 'show']);

					// Get light map for a block (floor visualization)
					Route::get('/{id}/light-map', [PagodaBlockController::class, 'getLightMap']);

					// Admin only routes
					Route::middleware(['role:super_admin|admin'])->group(function () {
						// Create new block (with optional auto-light generation)
						Route::post('/', [PagodaBlockController::class, 'store']);

						// Update block
						Route::put('/{id}', [PagodaBlockController::class, 'update']);

						// Delete block
						Route::delete('/{id}', [PagodaBlockController::class, 'destroy']);

						// Generate lights for a block
						Route::post('/{id}/generate-lights', [PagodaBlockController::class, 'generateLights']);
					});
				});

				// ========================================
				// PAGODA LIGHTS (INVENTORY)
				// ========================================
				Route::prefix('lights')->group(function () {
					// Search lights with filters
					Route::get('/', [PagodaLightController::class, 'index']);

					// Get single light details with registration history
					Route::get('/{id}', [PagodaLightController::class, 'show']);

					// Get next available light (for auto-assignment)
					Route::get('/available/next', [PagodaLightController::class, 'getNextAvailable']);

					// Check light availability by light number
					Route::get('/check-availability/{lightNumber}', [PagodaLightController::class, 'checkAvailability']);

					// Get light statistics
					Route::get('/statistics/overview', [PagodaLightController::class, 'statistics']);
				});

				// ========================================
				// PAGODA REGISTRATIONS (BOOKINGS)
				// ========================================
				Route::prefix('registrations')->group(function () {
					// List all registrations with filters
					Route::get('/', [PagodaRegistrationController::class, 'index']);

					// Get single registration details
					Route::get('/{id}', [PagodaRegistrationController::class, 'show']);

					// Search registration by receipt number
					Route::get('/search/receipt/{receiptNumber}', [PagodaRegistrationController::class, 'searchByReceipt']);

					// Get expiring registrations
					Route::get('/expiring/list', [PagodaRegistrationController::class, 'expiring']);

					// Get registration statistics
					Route::get('/statistics/overview', [PagodaRegistrationController::class, 'statistics']);

					// Generate receipt number
					Route::get('/generate/receipt-number', [PagodaRegistrationController::class, 'generateReceiptNumber']);

					// Staff and admin can create registrations
					Route::middleware(['role:super_admin|admin|staff'])->group(function () {
						// Create new registration (main booking endpoint)
						Route::post('/', [PagodaRegistrationController::class, 'store']);

						// Update registration (limited fields)
						Route::put('/{id}', [PagodaRegistrationController::class, 'update']);

						// Renew registration
						Route::post('/{id}/renew', [PagodaRegistrationController::class, 'renew']);

						// Terminate registration
						Route::post('/{id}/terminate', [PagodaRegistrationController::class, 'terminate']);
					});
				});

				// ========================================
				// PAGODA DEVOTEES MANAGEMENT
				// ========================================
				Route::prefix('devotees')->group(function () {


					// List all devotees
					Route::get('/', [PagodaDevoteeController::class, 'index']);

					// Generic search (BEFORE /{id})
					Route::get('/search', [PagodaDevoteeController::class, 'search']);

					// Search devotee by NRIC or contact (BEFORE /{id})
					Route::get('/search-by-nric-or-contact', [PagodaDevoteeController::class, 'searchByNricOrContact']);

					// Get single devotee details (LAST - catches everything else)
					Route::get('/{id}', [PagodaDevoteeController::class, 'show']);

					// Staff and admin routes
					Route::middleware(['role:super_admin|admin|staff'])->group(function () {
						// Create new devotee
						Route::post('/', [PagodaDevoteeController::class, 'store']);

						// Update devotee
						Route::put('/{id}', [PagodaDevoteeController::class, 'update']);
					});
				});

				// ========================================
				// PAGODA SETTINGS
				// ========================================
				Route::prefix('settings')->group(function () {
					// Get all settings
					Route::get('/', [PagodaSettingsController::class, 'index']);

					// Get single setting by key
					Route::get('/{key}', [PagodaSettingsController::class, 'show']);

					// Get booking configuration
					Route::get('/config/booking', [PagodaSettingsController::class, 'getBookingConfig']);

					// Admin only routes
					Route::middleware(['role:super_admin|admin'])->group(function () {
						// Create or update setting
						Route::post('/', [PagodaSettingsController::class, 'store']);

						// Bulk update settings
						Route::post('/bulk-update', [PagodaSettingsController::class, 'bulkUpdate']);

						// Delete setting
						Route::delete('/{key}', [PagodaSettingsController::class, 'destroy']);
					});
				});

				// ========================================
				// REPORTS & ANALYTICS
				// ========================================
				Route::prefix('reports')->group(function () {
					// Dashboard overview
					Route::get('/dashboard', [PagodaReportsController::class, 'dashboard']);

					// Revenue report
					Route::get('/revenue', [PagodaReportsController::class, 'revenue']);

					// Occupancy report
					Route::get('/occupancy', [PagodaReportsController::class, 'occupancy']);

					// Expiry forecast
					Route::get('/expiry-forecast', [PagodaReportsController::class, 'expiryForecast']);

					// Devotee analytics
					Route::get('/devotees', [PagodaReportsController::class, 'devoteeAnalytics']);

					// Export reports
					Route::middleware(['role:super_admin|admin'])->group(function () {
						Route::get('/export/registrations', [PagodaReportsController::class, 'exportRegistrations']);
						Route::get('/export/revenue', [PagodaReportsController::class, 'exportRevenue']);
						Route::get('/export/devotees', [PagodaReportsController::class, 'exportDevotees']);
					});
				});


				/*
				|--------------------------------------------------------------------------
				| Member Application Routes
				|--------------------------------------------------------------------------
				*/
			});
			Route::prefix('member-applications')->group(function () {
				// Public route - Changed from POST to GET
				Route::get('/validate-referral', [MemberApplicationController::class, 'validateReferral']);

				// Protected routes

				// List and statistics
				Route::get('/', [MemberApplicationController::class, 'index']);
				Route::get('/statistics', [MemberApplicationController::class, 'statistics']);

				// CRUD operations
				Route::post('/', [MemberApplicationController::class, 'store']);
				Route::get('/{id}', [MemberApplicationController::class, 'show']);
				Route::put('/{id}', [MemberApplicationController::class, 'update']);
				Route::post('/{id}', [MemberApplicationController::class, 'update']); // For form-data with _method
				Route::delete('/{id}', [MemberApplicationController::class, 'destroy']);

				// Workflow actions
				Route::post('/{id}/verify-referral', [MemberApplicationController::class, 'verifyReferral']);
				Route::post('/{id}/schedule-interview', [MemberApplicationController::class, 'scheduleInterview']);
				Route::post('/{id}/complete-interview', [MemberApplicationController::class, 'completeInterview']);
				Route::post('/{id}/approve', [MemberApplicationController::class, 'approve']);
				Route::post('/{id}/reject', [MemberApplicationController::class, 'reject']);
				Route::post('/{id}/process-refund', [MemberApplicationController::class, 'processRefund']);
				Route::post('/{id}/change-status', [MemberApplicationController::class, 'changeStatus']);
			});

			// Donation Master Routes

			Route::prefix('donation-masters')->group(function () {
				// List all donation masters with pagination
				Route::get('/', [DonationMasterController::class, 'index']);

				// Get active donations for dropdown
				Route::get('/active', [DonationMasterController::class, 'getActiveDonations']);

				// Get single donation master
				Route::get('/{id}', [DonationMasterController::class, 'show']);

				// Create new donation master
				Route::post('/', [DonationMasterController::class, 'store'])
					->middleware(['role:super_admin|admin']);

				// Update donation master
				Route::put('/{id}', [DonationMasterController::class, 'update'])
					->middleware(['role:super_admin|admin']);

				// Delete donation master
				Route::delete('/{id}', [DonationMasterController::class, 'destroy'])
					->middleware(['role:super_admin']);

				// Get user permissions
				Route::get('/user/{userId}/permissions', [DonationMasterController::class, 'getUserPermissions']);
				Route::get('/types', [DonationMasterController::class, 'getTypes']);
			});
			// Add to backend/routes/api.php inside the authenticated group

			// Hall Booking - Venue Master
			Route::prefix('hall-booking/venue-master')->group(function () {
				Route::get('/', [VenueMasterController::class, 'index']);
				Route::get('/active', [VenueMasterController::class, 'getActiveVenues']);
				Route::get('/{id}', [VenueMasterController::class, 'show']);
				Route::post('/', [VenueMasterController::class, 'store']);
				Route::put('/{id}', [VenueMasterController::class, 'update']);
				Route::delete('/{id}', [VenueMasterController::class, 'destroy']);
			});
			// Add to backend/routes/api.php inside the authenticated group

			// Hall Booking - Session Master
			Route::prefix('hall-booking/session-master')->group(function () {
				Route::get('/', [SessionMasterController::class, 'index']);
				Route::get('/active', [SessionMasterController::class, 'getActiveSessions']);
				Route::get('/{id}', [SessionMasterController::class, 'show']);
				Route::post('/', [SessionMasterController::class, 'store']);
				Route::put('/{id}', [SessionMasterController::class, 'update']);
				Route::delete('/{id}', [SessionMasterController::class, 'destroy']);
			});
			// Add to backend/routes/api.php inside the authenticated group

			// Hall Booking - Package Master
			Route::prefix('hall-booking/package-master')->group(function () {
				Route::get('/', [PackageMasterController::class, 'index']);
				Route::get('/active', [PackageMasterController::class, 'getActivePackages']);
				Route::get('/{id}', [PackageMasterController::class, 'show']);
				Route::post('/', [PackageMasterController::class, 'store']);
				Route::put('/{id}', [PackageMasterController::class, 'update']);
				Route::delete('/{id}', [PackageMasterController::class, 'destroy']);
			});
			// Add to backend/routes/api.php inside the authenticated group

			// Hall Booking - Add-On Groups
			Route::prefix('hall-booking/addon-groups')->group(function () {
				Route::get('/', [AddonGroupController::class, 'index']);
				Route::get('/active', [AddonGroupController::class, 'getActiveGroups']);
				Route::get('/{id}', [AddonGroupController::class, 'show']);
				Route::post('/', [AddonGroupController::class, 'store']);
				Route::put('/{id}', [AddonGroupController::class, 'update']);
				Route::delete('/{id}', [AddonGroupController::class, 'destroy']);
			});

			// Hall Booking - Add-On Services
			Route::prefix('hall-booking/addon-services')->group(function () {
				Route::get('/', [AddonServiceController::class, 'index']);
				Route::get('/group/{groupId}', [AddonServiceController::class, 'getServicesByGroup']);
				Route::get('/{id}', [AddonServiceController::class, 'show']);
				Route::post('/', [AddonServiceController::class, 'store']);
				Route::put('/{id}', [AddonServiceController::class, 'update']);
				Route::delete('/{id}', [AddonServiceController::class, 'destroy']);
			});

			Route::prefix('dharma-assembly')->group(function () {

				Route::prefix('masters')->group(function () {
					// List all masters with filters
					Route::get('/', [App\Http\Controllers\DharmaAssemblyMasterController::class, 'index']);

					// Get single master details
					Route::get('/{id}', [App\Http\Controllers\DharmaAssemblyMasterController::class, 'show']);

					// Get active masters only (for dropdown/selection)
					Route::get('/active/list', [App\Http\Controllers\DharmaAssemblyMasterController::class, 'getActiveMasters']);

					// Get master statistics
					Route::get('/statistics/overview', [App\Http\Controllers\DharmaAssemblyMasterController::class, 'getStatistics']);

					// Create new master
					Route::post('/', [App\Http\Controllers\DharmaAssemblyMasterController::class, 'store']);
					//->middleware(['permission:dharma_assembly.create']);

					// Update master
					Route::put('/{id}', [App\Http\Controllers\DharmaAssemblyMasterController::class, 'update']);
					//->middleware(['permission:dharma_assembly.edit']);

					// Delete master (soft delete)
					Route::delete('/{id}', [App\Http\Controllers\DharmaAssemblyMasterController::class, 'destroy']);
					//->middleware(['permission:dharma_assembly.delete']);

					// Toggle master status (Active/Inactive)
					Route::patch('/{id}/toggle-status', [App\Http\Controllers\DharmaAssemblyMasterController::class, 'toggleStatus']);
					//->middleware(['permission:dharma_assembly.edit']);

					// Duplicate master configuration
					Route::post('/{id}/duplicate', [App\Http\Controllers\DharmaAssemblyMasterController::class, 'duplicate']);
					//->middleware(['permission:dharma_assembly.create']);
				});

				// Future booking routes will go here
				// Route::prefix('bookings')->group(function () {
				//     Route::get('/', [DharmaAssemblyBookingController::class, 'index']);
				//     Route::post('/', [DharmaAssemblyBookingController::class, 'store']);
				//     Route::get('/{id}', [DharmaAssemblyBookingController::class, 'show']);
				//     Route::put('/{id}', [DharmaAssemblyBookingController::class, 'update']);
				//     Route::delete('/{id}', [DharmaAssemblyBookingController::class, 'destroy']);
				// });
			});

		});
	});
});

<?php

namespace App\Traits;

use Spatie\Permission\Models\Permission;
use Illuminate\Support\Facades\DB;

trait HasPermissionManagement
{
    /**
     * Sync permissions - adds new ones and removes old ones
     */
    protected function syncPermissions(array $permissions): void
    {
        DB::beginTransaction();
        
        try {
            // Get all current permission names
            $currentPermissions = Permission::pluck('name')->toArray();
            
            // Extract permission names from the new permissions array
            $newPermissionNames = array_column($permissions, 'name');
            
            // Find permissions to delete (exist in DB but not in new array)
            $permissionsToDelete = array_diff($currentPermissions, $newPermissionNames);
            
            // Delete old permissions
            if (!empty($permissionsToDelete)) {
                Permission::whereIn('name', $permissionsToDelete)->delete();
                $this->command->info('Deleted ' . count($permissionsToDelete) . ' old permissions.');
            }
            
            // Add or update permissions
            foreach ($permissions as $permissionData) {
                Permission::updateOrCreate(
                    ['name' => $permissionData['name']],
                    [
                        'module' => $permissionData['module'],
                        'permission' => $permissionData['permission'],
                        'description' => $permissionData['description']
                    ]
                );
            }
            
            DB::commit();
            
            $this->command->info('Permissions synchronized successfully!');
            
        } catch (\Exception $e) {
            DB::rollBack();
            throw $e;
        }
    }
}

// Updated Permission Seeder
namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Traits\HasPermissionManagement;

class PermissionSeeder extends Seeder
{
    use HasPermissionManagement;
    
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Define all permissions
        $permissions = [
            // Dashboard
            [
                'name' => 'dashboard.view',
                'module' => 'dashboard',
                'permission' => 'view',
                'description' => 'View dashboard and statistics'
            ],

            // Temples Management
            [
                'name' => 'temples.create',
                'module' => 'temples',
                'permission' => 'create',
                'description' => 'Create new temples'
            ],
            [
                'name' => 'temples.view',
                'module' => 'temples',
                'permission' => 'view',
                'description' => 'View temple list and details'
            ],
            [
                'name' => 'temples.update',
                'module' => 'temples',
                'permission' => 'update',
                'description' => 'Update temple information'
            ],
            [
                'name' => 'temples.delete',
                'module' => 'temples',
                'permission' => 'delete',
                'description' => 'Delete temples'
            ],
            [
                'name' => 'temples.suspend',
                'module' => 'temples',
                'permission' => 'suspend',
                'description' => 'Suspend/activate temple access'
            ],
            [
                'name' => 'temples.export',
                'module' => 'temples',
                'permission' => 'export',
                'description' => 'Export temple data'
            ],

            // Billing Management
            [
                'name' => 'billing.view',
                'module' => 'billing',
                'permission' => 'view',
                'description' => 'View billing information'
            ],
            [
                'name' => 'billing.update',
                'module' => 'billing',
                'permission' => 'update',
                'description' => 'Update billing details'
            ],
            [
                'name' => 'billing.refund',
                'module' => 'billing',
                'permission' => 'refund',
                'description' => 'Process refunds'
            ],
            [
                'name' => 'billing.export',
                'module' => 'billing',
                'permission' => 'export',
                'description' => 'Export billing reports'
            ],

            // User Management
            [
                'name' => 'users.create',
                'module' => 'users',
                'permission' => 'create',
                'description' => 'Create new users'
            ],
            [
                'name' => 'users.view',
                'module' => 'users',
                'permission' => 'view',
                'description' => 'View user list and details'
            ],
            [
                'name' => 'users.update',
                'module' => 'users',
                'permission' => 'update',
                'description' => 'Update user information'
            ],
            [
                'name' => 'users.delete',
                'module' => 'users',
                'permission' => 'delete',
                'description' => 'Delete users'
            ],
            [
                'name' => 'users.impersonate',
                'module' => 'users',
                'permission' => 'impersonate',
                'description' => 'Login as another user'
            ],

            // Role Management
            [
                'name' => 'roles.create',
                'module' => 'roles',
                'permission' => 'create',
                'description' => 'Create new roles'
            ],
            [
                'name' => 'roles.view',
                'module' => 'roles',
                'permission' => 'view',
                'description' => 'View roles and permissions'
            ],
            [
                'name' => 'roles.update',
                'module' => 'roles',
                'permission' => 'update',
                'description' => 'Update roles and assign permissions'
            ],
            [
                'name' => 'roles.delete',
                'module' => 'roles',
                'permission' => 'delete',
                'description' => 'Delete roles'
            ],

            // Reports
            [
                'name' => 'reports.view',
                'module' => 'reports',
                'permission' => 'view',
                'description' => 'View reports'
            ],
            [
                'name' => 'reports.export',
                'module' => 'reports',
                'permission' => 'export',
                'description' => 'Export reports'
            ],
            [
                'name' => 'reports.financial',
                'module' => 'reports',
                'permission' => 'financial',
                'description' => 'View financial reports'
            ],

            // Settings
            [
                'name' => 'settings.view',
                'module' => 'settings',
                'permission' => 'view',
                'description' => 'View system settings'
            ],
            [
                'name' => 'settings.update',
                'module' => 'settings',
                'permission' => 'update',
                'description' => 'Update system settings'
            ],

            // Audit Logs
            [
                'name' => 'audit_logs.view',
                'module' => 'audit_logs',
                'permission' => 'view',
                'description' => 'View audit logs and login activities'
            ],
            [
                'name' => 'audit_logs.export',
                'module' => 'audit_logs',
                'permission' => 'export',
                'description' => 'Export audit logs'
            ],

            // IP Restrictions
            [
                'name' => 'ip_restrictions.create',
                'module' => 'ip_restrictions',
                'permission' => 'create',
                'description' => 'Create IP restrictions'
            ],
            [
                'name' => 'ip_restrictions.view',
                'module' => 'ip_restrictions',
                'permission' => 'view',
                'description' => 'View IP restrictions'
            ],
            [
                'name' => 'ip_restrictions.update',
                'module' => 'ip_restrictions',
                'permission' => 'update',
                'description' => 'Update IP restrictions'
            ],
            [
                'name' => 'ip_restrictions.delete',
                'module' => 'ip_restrictions',
                'permission' => 'delete',
                'description' => 'Delete IP restrictions'
            ],

            // System Maintenance
            [
                'name' => 'system.maintenance',
                'module' => 'system',
                'permission' => 'maintenance',
                'description' => 'Access system maintenance functions'
            ],
            [
                'name' => 'system.backup',
                'module' => 'system',
                'permission' => 'backup',
                'description' => 'Create and manage backups'
            ],
            [
                'name' => 'system.logs',
                'module' => 'system',
                'permission' => 'logs',
                'description' => 'View system logs'
            ],
        ];
        
        // Sync permissions (will add new and remove old)
        $this->syncPermissions($permissions);
    }
}
<?php

namespace App\Providers;

use Illuminate\Foundation\Support\Providers\AuthServiceProvider as ServiceProvider;
use Illuminate\Support\Facades\Gate;

class AuthServiceProvider extends ServiceProvider
{
    /**
     * The model to policy mappings for the application.
     *
     * @var array<class-string, class-string>
     */
    protected $policies = [
        // 'App\Models\Model' => 'App\Policies\ModelPolicy',
    ];

    /**
     * Register any authentication / authorization services.
     */
    public function boot(): void
    {
        $this->registerPolicies();

        // Implicitly grant "Super Admin" role all permissions
        // This works in the app by using gate-related functions like auth()->user->can() and @can()
        Gate::before(function ($user, $ability) {
            return $user->hasRole('Super Admin') ? true : null;
        });

        // Define custom gates if needed
        Gate::define('access-admin-panel', function ($user) {
            return $user->is_active && $user->hasAnyRole(['Super Admin', 'Admin', 'Manager', 'Support']);
        });

        Gate::define('manage-temples', function ($user) {
            return $user->can('temples.view') || $user->can('temples.create') || $user->can('temples.update');
        });

        Gate::define('manage-billing', function ($user) {
            return $user->can('billing.view') || $user->can('billing.update') || $user->can('billing.refund');
        });

        Gate::define('view-sensitive-data', function ($user) {
            return $user->hasAnyRole(['Super Admin', 'Admin']);
        });
    }
}
<?php

namespace App\Providers;

use App\Services\StockService;
use Illuminate\Support\ServiceProvider;
use Illuminate\Support\Facades\Route;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        $this->app->singleton(TempleService::class, function ($app) {
            return new TempleService();
        });

        // Bind S3ConfigManager as singleton
        $this->app->singleton(S3ConfigManager::class, function ($app) {
            return new S3ConfigManager($app->make(TempleService::class));
        });

        // Bind S3UploadService with dependency
        $this->app->bind(S3UploadService::class, function ($app) {
            return new S3UploadService($app->make(S3ConfigManager::class));
        });
        $this->app->singleton(TempleLogoService::class, function ($app) {
            return new TempleLogoService($app->make(S3ConfigManager::class));
        });
           $this->app->singleton(StockService::class, function ($app) {
            return new StockService();
        });
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        // Register middleware aliases
        Route::aliasMiddleware('check.ip.restriction', \App\Http\Middleware\CheckIpRestriction::class);
        Route::aliasMiddleware('role', \Spatie\Permission\Middleware\RoleMiddleware::class);
        Route::aliasMiddleware('permission', \Spatie\Permission\Middleware\PermissionMiddleware::class);
        Route::aliasMiddleware('role_or_permission', \Spatie\Permission\Middleware\RoleOrPermissionMiddleware::class);
        Route::aliasMiddleware('temple', \App\Http\Middleware\TempleMiddleware::class);
        Route::aliasMiddleware('check.active', \App\Http\Middleware\CheckUserActive::class);
        Route::aliasMiddleware('check.user.type', \App\Http\Middleware\CheckUserType::class);
        Route::aliasMiddleware('org.permission', \App\Http\Middleware\CheckOrganizationPermission::class);
        Route::aliasMiddleware('validate.temple.access', \App\Http\Middleware\ValidateTempleAccess::class);
    }
}

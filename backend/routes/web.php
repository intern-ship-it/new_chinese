<?php
use App\Http\Controllers\Auth\AuthController;
use Illuminate\Support\Facades\Route;
use App\Http\Middleware\CheckIpRestriction;

Route::get('/', function () {
    return response()->json([
        'name' => 'Temple Management System API',
        'version' => '1.0.0',
        'status' => 'running',
        'documentation' => '/api/documentation',
        'health_check' => '/api/health'
    ]);
});

// Optional: API documentation route
Route::get('/documentation', function () {
    return response()->json([
        'message' => 'API documentation will be available here',
        'postman_collection' => '/api/v1/postman-collection.json'
    ]);
});
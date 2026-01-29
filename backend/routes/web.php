<?php
use App\Http\Controllers\Auth\AuthController;
use Illuminate\Support\Facades\Route;
use App\Http\Middleware\CheckIpRestriction;
use App\Http\Controllers\FiuuPaymentController;
use App\Http\Middleware\VerifyCsrfToken;

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
Route::prefix('payment')->middleware('payment')->group(function () {
    Route::get('/', [FiuuPaymentController::class, 'showPaymentForm'])->name('payment.form');
    Route::post('/create', [FiuuPaymentController::class, 'createPayment'])->name('payment.create');
    Route::post('/response', [FiuuPaymentController::class, 'handleResponse'])->name('payment.response');
    Route::post('/webhook', [FiuuPaymentController::class, 'handleWebhook'])->name('payment.webhook');
    Route::get('/cancel', [FiuuPaymentController::class, 'handleCancel'])->name('payment.cancel');
});
<?php

use Illuminate\Support\Facades\Route;
use Illuminate\Support\Facades\Artisan;

/*
|--------------------------------------------------------------------------
| Web Routes
|--------------------------------------------------------------------------
|
| Here is where you can register web routes for your application. These
| routes are loaded by the RouteServiceProvider and all of them will
| be assigned to the "web" middleware group. Make something great!
|
*/

Route::get('/', function () {
    return view('welcome');
});

// One-time setup route for database migrations
Route::get('/setup-database', function () {
    try {
        // Run migrations
        Artisan::call('migrate', ['--force' => true]);
        $migrateOutput = Artisan::output();
        
        // Create storage link
        Artisan::call('storage:link', ['--force' => true]);
        $storageOutput = Artisan::output();
        
        return response()->json([
            'success' => true,
            'message' => 'Database setup completed successfully',
            'migrate_output' => $migrateOutput,
            'storage_output' => $storageOutput,
        ]);
    } catch (Exception $e) {
        return response()->json([
            'success' => false,
            'message' => 'Database setup failed',
            'error' => $e->getMessage(),
        ], 500);
    }
});

// Clear all caches
Route::get('/clear-cache', function () {
    try {
        Artisan::call('config:clear');
        Artisan::call('route:clear');  
        Artisan::call('view:clear');
        Artisan::call('cache:clear');
        
        return response()->json([
            'success' => true,
            'message' => 'All caches cleared successfully',
        ]);
    } catch (Exception $e) {
        return response()->json([
            'success' => false,
            'message' => 'Cache clearing failed',
            'error' => $e->getMessage(),
        ], 500);
    }
});

// Create default account configuration
Route::get('/create-account-config', function () {
    try {
        $accountConfig = \HiEvents\Models\AccountConfiguration::firstOrCreate(
            ['is_system_default' => true],
            [
                'id' => 1,
                'name' => 'Default',
                'is_system_default' => true,
                'application_fees' => [
                    'percentage' => 1.5,
                    'fixed' => 0,
                ],
            ]
        );
        
        return response()->json([
            'success' => true,
            'message' => 'Account configuration created successfully',
            'config' => $accountConfig,
        ]);
    } catch (Exception $e) {
        return response()->json([
            'success' => false,
            'message' => 'Account configuration creation failed',
            'error' => $e->getMessage(),
        ], 500);
    }
});

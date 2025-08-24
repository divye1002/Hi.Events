<?php

use Illuminate\Support\Facades\Route;

// Special route for running migrations via HTTP request (one-time use)
Route::get('/migrate-setup', function () {
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

// Regular routes
require __DIR__.'/api.php';

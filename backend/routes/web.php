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

<?php

use App\Http\Controllers\InquiryController;
use Illuminate\Support\Facades\Route;

Route::get('/', [InquiryController::class, 'index'])->name('inquiry');
Route::post('/code', [InquiryController::class, 'code'])->middleware('throttle:inquiry-code')->block()->name('inquiry.code');
Route::post('/inquiry', [InquiryController::class, 'submit'])->middleware('throttle:20,1')->block()->name('inquiry.submit');
Route::post('/reset', [InquiryController::class, 'reset'])->block()->name('inquiry.reset');

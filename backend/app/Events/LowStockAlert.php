<?php

namespace App\Events;

use App\Models\Product;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class LowStockAlert
{
    use Dispatchable, InteractsWithSockets, SerializesModels;
    
    public $product;
    public $currentStock;
    
    public function __construct(Product $product, $currentStock)
    {
        $this->product = $product;
        $this->currentStock = $currentStock;
    }
}
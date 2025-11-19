<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreGRNRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        // Check if user has permission to create GRN
        return auth()->user()->can('grn.create') || 
               in_array(auth()->user()->user_type, ['ADMIN', 'SUPER_ADMIN', 'STAFF']);
    }

    /**
     * Get the validation rules that apply to the request.
     */
    public function rules(): array
    {
        return [
            // Basic Information
            'grn_date' => 'required|date|before_or_equal:today',
            
            // Type and Reference
            'grn_type' => 'required|in:DIRECT,PO_BASED',
            'po_id' => [
                'nullable',
                'uuid',
                'exists:purchase_orders,id',
                Rule::requiredIf($this->grn_type === 'PO_BASED')
            ],
            'invoice_id' => 'nullable|uuid|exists:purchase_invoices,id',
            
            // Supplier
            'supplier_id' => 'required|uuid|exists:suppliers,id',
            
            // Delivery Information
            'delivery_challan_no' => 'nullable|string|max:100',
            'delivery_date' => 'nullable|date|before_or_equal:grn_date',
            'vehicle_number' => 'nullable|string|max:50',
            
            // Quality Check
            'quality_check_done' => 'boolean',
            'quality_check_by' => 'nullable|uuid|exists:users,id|required_if:quality_check_done,true',
            'quality_check_notes' => 'nullable|string|max:500',
            
            // Status
            'status' => ['nullable', Rule::in(['DRAFT', 'COMPLETED'])],
            
            // Warehouse
            'warehouse_id' => 'required|exists:warehouses,id',
            
            // Additional Information
            'notes' => 'nullable|string',
            
            // Items Array
            'items' => 'required|array|min:1',
            'items.*.po_item_id' => [
                'nullable',
                'uuid',
                'exists:purchase_order_items,id',
                Rule::requiredIf($this->grn_type === 'PO_BASED')
            ],
            'items.*.product_id' => 'required|exists:products,id',
            'items.*.description' => 'nullable|string|max:500',
            
            // Quantities
            'items.*.ordered_quantity' => 'nullable|numeric|min:0',
            'items.*.received_quantity' => 'required|numeric|min:0',
            'items.*.accepted_quantity' => 'required|numeric|min:0',
            'items.*.rejected_quantity' => 'nullable|numeric|min:0',
            
            // Over Delivery
            'items.*.over_delivery_tolerance' => 'nullable|numeric|min:0|max:100',
            'items.*.is_over_delivery' => 'boolean',
            
            // Quality and Condition
            'items.*.rejection_reason' => 'nullable|string|max:500|required_if:items.*.rejected_quantity,>,0',
            'items.*.condition_on_receipt' => 'nullable|in:GOOD,DAMAGED,EXPIRED',
            
            // Unit Details
            'items.*.uom_id' => 'nullable|exists:uom,id',
            'items.*.unit_price' => 'nullable|numeric|min:0',
            
            // Batch and Expiry
            'items.*.batch_number' => 'nullable|string|max:50',
            'items.*.manufacture_date' => 'nullable|date|before_or_equal:today',
            'items.*.expiry_date' => 'nullable|date|after:items.*.manufacture_date',
            
            // Serial Numbers
            'items.*.serial_numbers' => 'nullable|array',
            'items.*.serial_numbers.*' => 'string|max:50',
            'items.*.warranty_period_months' => 'nullable|integer|min:0',
            'items.*.warranty_end_date' => 'nullable|date|after:today',
            
            // Storage Location
            'items.*.warehouse_id' => 'nullable|exists:warehouses,id',
            'items.*.rack_location' => 'nullable|string|max:50',
            
            // Notes
            'items.*.notes' => 'nullable|string|max:500'
        ];
    }

    /**
     * Get custom messages for validator errors.
     */
    public function messages(): array
    {
        return [
            'grn_date.required' => 'GRN date is required',
            'grn_date.before_or_equal' => 'GRN date cannot be in the future',
            'grn_type.required' => 'Please select GRN type',
            'po_id.required_if' => 'Purchase order is required for PO-based GRN',
            'supplier_id.required' => 'Please select a supplier',
            'warehouse_id.required' => 'Please select a warehouse',
            'items.required' => 'At least one item is required',
            'items.min' => 'At least one item is required',
            'items.*.product_id.required' => 'Product is required for each item',
            'items.*.received_quantity.required' => 'Received quantity is required',
            'items.*.accepted_quantity.required' => 'Accepted quantity is required',
            'items.*.rejection_reason.required_if' => 'Rejection reason is required when quantity is rejected',
            'delivery_date.before_or_equal' => 'Delivery date cannot be after GRN date',
            'items.*.expiry_date.after' => 'Expiry date must be after manufacture date'
        ];
    }

    /**
     * Prepare the data for validation.
     */
    protected function prepareForValidation(): void
    {
        // Set default status if not provided
        if (!$this->has('status')) {
            $this->merge([
                'status' => 'DRAFT'
            ]);
        }

        // Calculate rejected quantity if not provided
        if ($this->has('items')) {
            $items = $this->items;
            foreach ($items as $index => $item) {
                if (isset($item['received_quantity']) && 
                    isset($item['accepted_quantity']) && 
                    !isset($item['rejected_quantity'])) {
                    $items[$index]['rejected_quantity'] = 
                        $item['received_quantity'] - $item['accepted_quantity'];
                }
                
                // Set warehouse_id for items if not provided
                if (!isset($item['warehouse_id']) && $this->warehouse_id) {
                    $items[$index]['warehouse_id'] = $this->warehouse_id;
                }
            }
            $this->merge(['items' => $items]);
        }
    }

    /**
     * Configure the validator instance.
     */
    public function withValidator($validator): void
    {
        $validator->after(function ($validator) {
            // For PO-based GRN, validate against PO
            if ($this->grn_type === 'PO_BASED' && $this->po_id) {
                $po = \App\Models\PurchaseOrder::find($this->po_id);
                if ($po) {
                    // Check if PO is approved
                    if ($po->status !== 'APPROVED') {
                        $validator->errors()->add('po_id', 'Purchase order must be approved before creating GRN');
                    }
                    
                    // Check if supplier matches
                    if ($po->supplier_id !== $this->supplier_id) {
                        $validator->errors()->add('supplier_id', 'Supplier must match the purchase order supplier');
                    }
                }
            }

            // Validate items
            if ($this->has('items')) {
                foreach ($this->items as $index => $item) {
                    // Validate accepted quantity doesn't exceed received
                    if (isset($item['received_quantity']) && isset($item['accepted_quantity'])) {
                        if ($item['accepted_quantity'] > $item['received_quantity']) {
                            $validator->errors()->add(
                                "items.{$index}.accepted_quantity",
                                'Accepted quantity cannot exceed received quantity'
                            );
                        }
                    }
                    
                    // For PO-based items, validate against PO item
                    if (isset($item['po_item_id'])) {
                        $poItem = \App\Models\PurchaseOrderItem::find($item['po_item_id']);
                        if ($poItem) {
                            // Check if product matches
                            if ($poItem->product_id != $item['product_id']) {
                                $validator->errors()->add(
                                    "items.{$index}.product_id",
                                    'Product must match the PO item product'
                                );
                            }
                            
                            // Check for over-delivery
                            $remainingQty = $poItem->quantity - $poItem->received_quantity;
                            $tolerance = $item['over_delivery_tolerance'] ?? 0;
                            $maxAllowedQty = $remainingQty * (1 + $tolerance / 100);
                            
                            if (isset($item['received_quantity']) && 
                                $item['received_quantity'] > $maxAllowedQty) {
                                $validator->errors()->add(
                                    "items.{$index}.received_quantity",
                                    "Received quantity exceeds PO quantity with tolerance (Max allowed: {$maxAllowedQty})"
                                );
                            }
                        }
                    }
                    
                    // Validate serial numbers count matches quantity for serialized items
                    if (isset($item['serial_numbers']) && is_array($item['serial_numbers'])) {
                        $serialCount = count($item['serial_numbers']);
                        if (isset($item['accepted_quantity']) && 
                            $serialCount > 0 && 
                            $serialCount != $item['accepted_quantity']) {
                            $validator->errors()->add(
                                "items.{$index}.serial_numbers",
                                "Number of serial numbers ({$serialCount}) must match accepted quantity ({$item['accepted_quantity']})"
                            );
                        }
                        
                        // Check for duplicate serial numbers
                        $uniqueSerials = array_unique($item['serial_numbers']);
                        if (count($uniqueSerials) != $serialCount) {
                            $validator->errors()->add(
                                "items.{$index}.serial_numbers",
                                'Duplicate serial numbers found'
                            );
                        }
                    }
                }
            }
        });
    }
}
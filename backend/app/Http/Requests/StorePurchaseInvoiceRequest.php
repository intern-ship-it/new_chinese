<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StorePurchaseInvoiceRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        // Check if user has permission to create purchase invoices
        return auth()->user()->can('purchase_invoices.create') || 
               in_array(auth()->user()->user_type, ['ADMIN', 'SUPER_ADMIN', 'STAFF']);
    }

    /**
     * Get the validation rules that apply to the request.
     */
    public function rules(): array
    {
        return [
            // Basic Information
            'supplier_invoice_no' => 'nullable|string|max:100',
            'invoice_date' => 'required|date|before_or_equal:today',
            
            // Type and Reference
            'invoice_type' => 'required|in:DIRECT,PO_BASED',
            'po_id' => [
                'required_if:invoice_type,PO_BASED',
                'nullable',
                'uuid',
                'exists:purchase_orders,id'
            ],
            'supplier_id' => 'required|uuid|exists:suppliers,id',
            
            // Financial Details
            'shipping_charges' => 'nullable|numeric|min:0',
            'other_charges' => 'nullable|numeric|min:0',
            'discount_amount' => 'nullable|numeric|min:0',
            
            // Payment Information
            'payment_due_date' => 'nullable|date|after_or_equal:invoice_date',
            
            // Status
            'status' => ['nullable', Rule::in(['DRAFT', 'POSTED'])],
            
            // GRN Settings
            'grn_required' => 'boolean',
            
            // Additional Information
            'terms_conditions' => 'nullable|string',
            'notes' => 'nullable|string',
            
            // Items Array (required for DIRECT invoices)
            'items' => [
                Rule::requiredIf($this->invoice_type === 'DIRECT'),
                'nullable',
                'array',
                'min:1'
            ],
            'items.*.po_item_id' => 'nullable|uuid|exists:purchase_order_items,id',
            'items.*.item_type' => 'required_with:items|in:product,service',
            'items.*.product_id' => [
                'required_if:items.*.item_type,product',
                'nullable',
                'exists:products,id'
            ],
            'items.*.service_id' => [
                'required_if:items.*.item_type,service',
                'nullable',
                'exists:services,id'
            ],
            'items.*.description' => 'nullable|string|max:500',
            'items.*.quantity' => 'required_with:items|numeric|min:0.001',
            'items.*.uom_id' => 'nullable|exists:uom,id',
            'items.*.unit_price' => 'required_with:items|numeric|min:0',
            
            // Tax and Discount for items
            'items.*.tax_id' => 'nullable|exists:tax_master,id',
            'items.*.discount_type' => 'nullable|in:percent,amount',
            'items.*.discount_value' => 'nullable|numeric|min:0',
            'items.*.notes' => 'nullable|string|max:500'
        ];
    }

    /**
     * Get custom messages for validator errors.
     */
    public function messages(): array
    {
        return [
            'invoice_date.required' => 'Invoice date is required',
            'invoice_date.before_or_equal' => 'Invoice date cannot be in the future',
            'invoice_type.required' => 'Please select invoice type',
            'po_id.required_if' => 'Purchase order is required for PO-based invoices',
            'po_id.exists' => 'Selected purchase order does not exist',
            'supplier_id.required' => 'Please select a supplier',
            'supplier_id.exists' => 'Selected supplier does not exist',
            'items.required' => 'At least one item is required for direct invoices',
            'items.min' => 'At least one item is required',
            'payment_due_date.after_or_equal' => 'Payment due date must be on or after invoice date'
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

        // Set GRN required based on items type
        if (!$this->has('grn_required') && $this->has('items')) {
            $hasProducts = collect($this->items)->contains('item_type', 'product');
            $this->merge([
                'grn_required' => $hasProducts
            ]);
        }

        // Clean numeric values
        $numericFields = ['shipping_charges', 'other_charges', 'discount_amount'];
        foreach ($numericFields as $field) {
            if ($this->has($field)) {
                $this->merge([
                    $field => floatval($this->$field)
                ]);
            }
        }
    }

    /**
     * Configure the validator instance.
     */
    public function withValidator($validator): void
    {
        $validator->after(function ($validator) {
            // For PO-based invoices, validate that PO is approved
            if ($this->invoice_type === 'PO_BASED' && $this->po_id) {
                $po = \App\Models\PurchaseOrder::find($this->po_id);
                if ($po) {
                    if ($po->status !== 'APPROVED') {
                        $validator->errors()->add('po_id', 'Purchase order must be approved before creating invoice');
                    }
                    
                    // Check if supplier matches
                    if ($po->supplier_id !== $this->supplier_id) {
                        $validator->errors()->add('supplier_id', 'Supplier must match the purchase order supplier');
                    }
                    
                    // Check if PO is already fully invoiced
                    if ($po->invoice_status === 'INVOICED') {
                        $validator->errors()->add('po_id', 'This purchase order has already been fully invoiced');
                    }
                }
            }

            // Validate item quantities for PO-based invoices
            if ($this->invoice_type === 'PO_BASED' && $this->has('items')) {
                foreach ($this->items as $index => $item) {
                    if (isset($item['po_item_id'])) {
                        $poItem = \App\Models\PurchaseOrderItem::find($item['po_item_id']);
                        if ($poItem) {
                            $remainingQty = $poItem->quantity - $poItem->invoiced_quantity;
                            if (isset($item['quantity']) && $item['quantity'] > $remainingQty) {
                                $validator->errors()->add(
                                    "items.{$index}.quantity",
                                    "Quantity exceeds remaining PO quantity (Available: {$remainingQty})"
                                );
<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StorePurchaseOrderRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        // Check if user has permission to create purchase orders
        return auth()->user()->can('purchase_orders.create') || 
               in_array(auth()->user()->user_type, ['ADMIN', 'SUPER_ADMIN']);
    }

    /**
     * Get the validation rules that apply to the request.
     */
    public function rules(): array
    {
        return [
            // Basic Information
            'po_date' => 'required|date|before_or_equal:today',
            'supplier_id' => 'required|uuid|exists:suppliers,id',
            
            // Reference Information
            'pr_id' => 'nullable|uuid|exists:purchase_requests,id',
            'quotation_ref' => 'nullable|string|max:100',
            
            // Delivery Details
            'delivery_date' => 'nullable|date|after_or_equal:po_date',
            'delivery_address' => 'nullable|string|max:500',
            'shipping_method' => 'nullable|string|max:50',
            
            // Financial Details
            'shipping_charges' => 'nullable|numeric|min:0',
            'other_charges' => 'nullable|numeric|min:0',
            'discount_amount' => 'nullable|numeric|min:0',
            
            // Payment Terms
            'payment_terms' => 'nullable|string|max:500',
            'payment_due_date' => 'nullable|date|after_or_equal:po_date',
            
            // Status
            'status' => ['nullable', Rule::in(['DRAFT', 'PENDING_APPROVAL'])],
            'approval_required' => 'boolean',
            
            // Terms and Notes
            'terms_conditions' => 'nullable|string',
            'internal_notes' => 'nullable|string',
            
            // Items Array
            'items' => 'required|array|min:1',
            'items.*.item_type' => 'required|in:product,service',
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
            'items.*.quantity' => 'required|numeric|min:0.001',
            'items.*.uom_id' => 'nullable|exists:uom,id',
            'items.*.unit_price' => 'required|numeric|min:0',
            
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
            'po_date.required' => 'Purchase order date is required',
            'po_date.before_or_equal' => 'Purchase order date cannot be in the future',
            'supplier_id.required' => 'Please select a supplier',
            'supplier_id.exists' => 'Selected supplier does not exist',
            'items.required' => 'At least one item is required',
            'items.min' => 'At least one item is required',
            'items.*.quantity.min' => 'Item quantity must be greater than 0',
            'items.*.unit_price.min' => 'Item price cannot be negative',
            'delivery_date.after_or_equal' => 'Delivery date must be on or after PO date',
            'payment_due_date.after_or_equal' => 'Payment due date must be on or after PO date'
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

        // Set default approval_required based on user type
        if (!$this->has('approval_required')) {
            $this->merge([
                'approval_required' => auth()->user()->user_type !== 'SUPER_ADMIN'
            ]);
        }

        // Clean numeric values
        if ($this->has('shipping_charges')) {
            $this->merge([
                'shipping_charges' => floatval($this->shipping_charges)
            ]);
        }

        if ($this->has('other_charges')) {
            $this->merge([
                'other_charges' => floatval($this->other_charges)
            ]);
        }

        if ($this->has('discount_amount')) {
            $this->merge([
                'discount_amount' => floatval($this->discount_amount)
            ]);
        }
    }

    /**
     * Configure the validator instance.
     */
    public function withValidator($validator): void
    {
        $validator->after(function ($validator) {
            // Validate that PR is not already converted if pr_id is provided
            if ($this->pr_id) {
                $pr = \App\Models\PurchaseRequest::find($this->pr_id);
                if ($pr && $pr->converted_to_po) {
                    $validator->errors()->add('pr_id', 'This purchase request has already been converted to a PO');
                }
            }

            // Validate discount values
            if ($this->has('items')) {
                foreach ($this->items as $index => $item) {
                    if (isset($item['discount_type']) && isset($item['discount_value'])) {
                        if ($item['discount_type'] === 'percent' && $item['discount_value'] > 100) {
                            $validator->errors()->add(
                                "items.{$index}.discount_value",
                                'Discount percentage cannot exceed 100%'
                            );
                        }
                        if ($item['discount_type'] === 'amount' && 
                            isset($item['unit_price']) && 
                            isset($item['quantity']) &&
                            $item['discount_value'] > ($item['unit_price'] * $item['quantity'])) {
                            $validator->errors()->add(
                                "items.{$index}.discount_value",
                                'Discount amount cannot exceed item subtotal'
                            );
                        }
                    }
                }
            }
        });
    }
}
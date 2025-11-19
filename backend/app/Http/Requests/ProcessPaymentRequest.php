<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class ProcessPaymentRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        // Check if user has permission to process payments
        return auth()->user()->can('purchase_payments.create') || 
               in_array(auth()->user()->user_type, ['ADMIN', 'SUPER_ADMIN']);
    }

    /**
     * Get the validation rules that apply to the request.
     */
    public function rules(): array
    {
        return [
            // Basic Information
            'payment_date' => 'required|date|before_or_equal:today',
            
            // Invoice Reference
            'invoice_id' => 'required|uuid|exists:purchase_invoices,id',
            'supplier_id' => 'required|uuid|exists:suppliers,id',
            
            // Payment Details
            'payment_mode_id' => 'required|integer|exists:payment_modes,id',
            'amount' => 'required|numeric|min:0.01',
            
            // Bank/Cheque Details
            'reference_number' => 'nullable|string|max:100',
            'bank_name' => 'nullable|string|max:100|required_if:payment_mode,cheque',
            'bank_branch' => 'nullable|string|max:100',
            'cheque_date' => 'nullable|date|required_if:payment_mode,cheque',
            
            // Status
            'status' => ['nullable', Rule::in(['PENDING', 'COMPLETED', 'FAILED', 'CANCELLED'])],
            
            // Additional Information
            'notes' => 'nullable|string|max:500'
        ];
    }

    /**
     * Get custom messages for validator errors.
     */
    public function messages(): array
    {
        return [
            'payment_date.required' => 'Payment date is required',
            'payment_date.before_or_equal' => 'Payment date cannot be in the future',
            'invoice_id.required' => 'Please select an invoice',
            'invoice_id.exists' => 'Selected invoice does not exist',
            'supplier_id.required' => 'Supplier is required',
            'payment_mode_id.required' => 'Please select a payment mode',
            'payment_mode_id.exists' => 'Selected payment mode does not exist',
            'amount.required' => 'Payment amount is required',
            'amount.min' => 'Payment amount must be greater than 0',
            'bank_name.required_if' => 'Bank name is required for cheque payments',
            'cheque_date.required_if' => 'Cheque date is required for cheque payments'
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
                'status' => 'COMPLETED'
            ]);
        }

        // Clean amount value
        if ($this->has('amount')) {
            $this->merge([
                'amount' => floatval($this->amount)
            ]);
        }

        // Get payment mode name for conditional validation
        if ($this->payment_mode_id) {
            $paymentMode = \App\Models\PaymentMode::find($this->payment_mode_id);
            if ($paymentMode) {
                $this->merge([
                    'payment_mode' => strtolower($paymentMode->name)
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
            // Validate invoice and supplier match
            if ($this->invoice_id && $this->supplier_id) {
                $invoice = \App\Models\PurchaseInvoice::find($this->invoice_id);
                if ($invoice) {
                    // Check if supplier matches
                    if ($invoice->supplier_id !== $this->supplier_id) {
                        $validator->errors()->add('supplier_id', 'Supplier must match the invoice supplier');
                    }
                    
                    // Check if invoice is posted
                    if ($invoice->status !== 'POSTED') {
                        $validator->errors()->add('invoice_id', 'Invoice must be posted before processing payment');
                    }
                    
                    // Check if invoice is already fully paid
                    if ($invoice->payment_status === 'PAID') {
                        $validator->errors()->add('invoice_id', 'This invoice has already been fully paid');
                    }
                    
                    // Check if payment amount doesn't exceed balance
                    if ($this->amount > $invoice->balance_amount) {
                        $validator->errors()->add(
                            'amount',
                            "Payment amount exceeds invoice balance (Balance: {$invoice->balance_amount})"
                        );
                    }
                }
            }

            // Validate cheque date
            if ($this->cheque_date && $this->payment_date) {
                $chequeDate = \Carbon\Carbon::parse($this->cheque_date);
                $paymentDate = \Carbon\Carbon::parse($this->payment_date);
                
                // Cheque date should not be too far in the future (e.g., 6 months)
                if ($chequeDate->diffInMonths($paymentDate) > 6) {
                    $validator->errors()->add(
                        'cheque_date',
                        'Cheque date cannot be more than 6 months from payment date'
                    );
                }
            }

            // Check for duplicate payment reference
            if ($this->reference_number) {
                $exists = \App\Models\PurchasePayment::where('reference_number', $this->reference_number)
                    ->where('supplier_id', $this->supplier_id)
                    ->where('status', '!=', 'CANCELLED')
                    ->exists();
                
                if ($exists) {
                    $validator->errors()->add(
                        'reference_number',
                        'A payment with this reference number already exists for this supplier'
                    );
                }
            }
        });
    }
}
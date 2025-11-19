<?php
namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreLedgerRequest extends FormRequest
{
    public function authorize()
    {
        return true;
    }

    public function rules()
    {
        return [
            'name' => 'required|string|max:300|unique:ledgers,name',
            'group_id' => 'required|exists:groups,id',
            'type' => 'boolean',
            'reconciliation' => 'boolean',
            'pa' => 'boolean',
            'hb' => 'boolean',
            'aging' => 'boolean',
            'credit_aging' => 'boolean',
            'iv' => 'boolean',
            'notes' => 'nullable|string|max:200',
            'left_code' => 'nullable|string|max:200|unique:ledgers,left_code',
            'right_code' => 'nullable|string|max:200|unique:ledgers,right_code',
            'opening_balance' => 'nullable|numeric|min:0',
            'opening_balance_type' => 'nullable|in:dr,cr,Dr,Cr',
            'opening_quantity' => 'nullable|integer|min:0',
            'opening_unit_price' => 'nullable|numeric|min:0',
            'opening_uom_id' => 'nullable|exists:uom,id'
        ];
    }

    public function messages()
    {
        return [
            'name.required' => 'Ledger name is required',
            'name.unique' => 'This ledger name already exists',
            'group_id.required' => 'Please select a group',
            'group_id.exists' => 'Selected group does not exist'
        ];
    }
}
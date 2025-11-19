<?php
namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class UpdateLedgerRequest extends FormRequest
{
    public function authorize()
    {
        return true;
    }

    public function rules()
    {
        $ledgerId = $this->route('id');
        
        return [
            'name' => 'string|max:300|unique:ledgers,name,' . $ledgerId,
            'group_id' => 'exists:groups,id',
            'type' => 'boolean',
            'reconciliation' => 'boolean',
            'pa' => 'boolean',
            'hb' => 'boolean',
            'aging' => 'boolean',
            'credit_aging' => 'boolean',
            'iv' => 'boolean',
            'notes' => 'nullable|string|max:200',
            'left_code' => 'nullable|string|max:200|unique:ledgers,left_code,' . $ledgerId,
            'right_code' => 'nullable|string|max:200|unique:ledgers,right_code,' . $ledgerId
        ];
    }
}
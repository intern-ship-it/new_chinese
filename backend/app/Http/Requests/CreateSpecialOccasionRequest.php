<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Contracts\Validation\Validator;
use Illuminate\Http\Exceptions\HttpResponseException;

class CreateSpecialOccasionRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return true; // Change based on your authorization logic
    }

    /**
     * Get the validation rules that apply to the request.
     */
    public function rules(): array
    {
        return [
            'occasion_name_primary' => 'required|string|max:255',
            'primary_lang' => 'nullable|string|max:50',
            'secondary_lang' => 'nullable|string|max:50',
            'occasion_name_secondary' => 'nullable|string|max:255',
            'occasion_options' => 'nullable|array',
            'occasion_options.*.option_name' => 'required_with:occasion_options|string|max:255',
            'occasion_options.*.amount' => 'required_with:occasion_options|numeric|min:0',
            'status' => 'nullable|in:active,inactive'
        ];
    }

    /**
     * Get custom messages for validator errors.
     */
    public function messages(): array
    {
        return [
            'occasion_name_primary.required' => 'Primary occasion name is required',
            'occasion_name_primary.max' => 'Primary occasion name cannot exceed 255 characters',
            'occasion_options.array' => 'Occasion options must be an array',
            'occasion_options.*.option_name.required_with' => 'Each option must have a name',
            'occasion_options.*.amount.required_with' => 'Each option must have an amount',
            'occasion_options.*.amount.numeric' => 'Amount must be a number',
            'occasion_options.*.amount.min' => 'Amount must be greater than or equal to 0',
            'status.in' => 'Status must be either active or inactive'
        ];
    }

    /**
     * Handle a failed validation attempt.
     */
    protected function failedValidation(Validator $validator)
    {
        throw new HttpResponseException(
            response()->json([
                'success' => false,
                'message' => 'Validation error',
                'errors' => $validator->errors()
            ], 422)
        );
    }
}
<?php

namespace App\Exports;

use Maatwebsite\Excel\Concerns\FromCollection;
use Maatwebsite\Excel\Concerns\WithHeadings;
use Maatwebsite\Excel\Concerns\WithStyles;
use Maatwebsite\Excel\Concerns\WithTitle;
use PhpOffice\PhpSpreadsheet\Worksheet\Worksheet;
use PhpOffice\PhpSpreadsheet\Style\Fill;
use PhpOffice\PhpSpreadsheet\Style\Border;

class MemberReportExport implements FromCollection, WithHeadings, WithStyles, WithTitle
{
    protected $members;
    protected $filters;

    public function __construct($members, $filters = [])
    {
        $this->members = $members;
        $this->filters = $filters;
    }

    /**
     * Return collection of data
     */
    public function collection()
    {
        return $this->members->map(function ($member, $index) {
            $memberDetails = $member['member_details'] ?? [];

            return [
                'no' => $index + 1,
                'member_code' => $memberDetails['member_code'] ?? '-',
                'name' => $member['name'] ?? '-',
                'email' => $member['email'] ?? '-',
                'mobile' => ($member['mobile_code'] ?? '') . ' ' . ($member['mobile_no'] ?? '-'),
                'gender' => $member['gender'] ?? '-',
                'date_of_birth' => $member['date_of_birth'] ?? '-',
                'member_type' => $memberDetails['member_type']['name'] ?? '-',
                'membership_date' => $memberDetails['membership_date'] ?? '-',
                'subscription_status' => $memberDetails['subscription_status'] ?? '-',
                'subscription_end_date' => $memberDetails['subscription_end_date'] ?? '-',
                'city' => $member['city'] ?? '-',
                'state' => $member['state'] ?? '-',
                'country' => $member['country'] ?? '-',
                'occupation' => $memberDetails['occupation'] ?? '-',
                'qualification' => $memberDetails['qualification'] ?? '-',
                'status' => $member['is_active'] ? 'Active' : 'Inactive',
            ];
        });
    }

    /**
     * Define headings
     */
    public function headings(): array
    {
        return [
            '#',
            'Member Code',
            'Name',
            'Email',
            'Mobile',
            'Gender',
            'Date of Birth',
            'Member Type',
            'Membership Date',
            'Subscription Status',
            'Subscription End Date',
            'City',
            'State',
            'Country',
            'Occupation',
            'Qualification',
            'Status',
        ];
    }

    /**
     * Style the worksheet
     */
    public function styles(Worksheet $sheet)
    {
        return [
            // Style the first row (header)
            1 => [
                'font' => ['bold' => true, 'size' => 12],
                'fill' => [
                    'fillType' => Fill::FILL_SOLID,
                    'startColor' => ['rgb' => '0d6efd']
                ],
                'alignment' => [
                    'horizontal' => \PhpOffice\PhpSpreadsheet\Style\Alignment::HORIZONTAL_CENTER,
                ],
            ],
        ];
    }

    /**
     * Set sheet title
     */
    public function title(): string
    {
        return 'Members Report';
    }
}
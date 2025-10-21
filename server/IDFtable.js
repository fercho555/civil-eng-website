import React from 'react';

const IdfTable = ({ data }) => {
    if (!data || data.length === 0) {
        return null;
    }

    const headers = ['Duration', '2 yr', '5 yr', '10 yr', '25 yr', '50 yr', '100 yr'];
    const returnPeriods = ['2', '5', '10', '25', '50', '100'];

    return (
        <div className="overflow-x-auto mt-8">
            <h3 className="text-xl font-bold mb-4">IDF Data Table (mm/hr)</h3>
            <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                    <tr>
                        {headers.map((header, index) => (
                            <th
                                key={index}
                                scope="col"
                                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                            >
                                {header}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                    {data.map((row, rowIndex) => (
                        <tr key={rowIndex}>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                {row.duration < 60 ? `${row.duration} min` : `${row.duration / 60} hr`}
                            </td>
                            {returnPeriods.map((rp, colIndex) => {
                                const depth = row[rp];
                                const duration = row.duration;
                                let intensity = '-';
                                if (depth !== null && duration > 0) {
                                    intensity = ((depth / duration) * 60).toFixed(2);
                                }
                                return (
                                    <td key={colIndex} className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {intensity}
                                    </td>
                                );
                            })}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

export default IdfTable;
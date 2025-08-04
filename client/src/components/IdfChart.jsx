import React from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import downloadjs from 'downloadjs';
import html2canvas from 'html2canvas';

// ✅ Colors for return periods
const COLORS = {
  '2yr': 'red',
  '5yr': 'gold',
  '10yr': 'green',
  '25yr': 'skyblue',
  '50yr': 'blue',
  '100yr': 'magenta'
};

const labelMap = {
  '2yr': '2 yr',
  '5yr': '5 yr',
  '10yr': '10 yr',
  '25yr': '25 yr',
  '50yr': '50 yr',
  '100yr': '100 yr'
};

// ✅ Convert IDF JSON to Recharts array with duration in minutes
function normalizeIdfData(idfRaw) {
  if (!idfRaw) return [];

  const durations = [
    '5 min', '10 min', '15 min', '30 min',
    '60 min', '120 min', '180 min', '240 min', '1440 min'
  ];

  // Map for converting to total minutes for X-axis
  const toMinutes = (label) => {
    const [num, unit] = label.split(' ');
    return unit.startsWith('min') ? parseInt(num) : parseInt(num) * 60;
  };

  const chartData = durations.map(dur => {
    const entry = { duration: toMinutes(dur) }; // numeric for log scale
    Object.keys(idfRaw).forEach(rp => {
      entry[rp] = idfRaw[rp]?.[dur] ?? null;
    });
    return entry;
  });

  console.log("📊 Normalized IDF data for chart:", chartData);
  return chartData;
}

export default function IdfChart({ idf }) {
  if (!idf) return null;

  const data = normalizeIdfData(idf);

  const handleDownload = () => {
    const chart = document.getElementById('chart-container');
    html2canvas(chart).then(canvas => {
      canvas.toBlob(blob => {
        downloadjs(blob, 'idf_chart.png', 'image/png');
      });
    });
  };

  // X-axis ticks in minutes for log scale
  const logTicks = [5, 10, 15, 30, 60, 120, 180, 240, 1440];

  return (
    <div className="bg-yellow-50 rounded-xl p-4 mt-4">
      <h3 className="font-semibold mb-2 flex items-center">
        <input type="checkbox" checked readOnly className="mr-2" />
        IDF Curves
      </h3>

      <div className="flex items-center justify-between">
        <h4 className="font-bold mb-2 flex items-center">
          <input type="checkbox" checked readOnly className="mr-2" />
          IDF Curve (mm/hr)
        </h4>
        <button className="bg-blue-600 text-white px-3 py-1 rounded" onClick={handleDownload}>
          📥 Download PNG
        </button>
      </div>

      <div id="chart-container" className="bg-white rounded shadow p-4">
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey="duration"
              type="number"
              scale="log"
              domain={['dataMin', 'dataMax']}
              ticks={logTicks}
              tickFormatter={(val) => {
                if (val < 60) return `${val} min`;
                const hr = val / 60;
                return `${hr} hr`;
              }}
              tick={{ fontSize: 12 }}
              tickMargin={8}
            />
            <YAxis
              label={{ value: 'mm/hr', angle: -90, position: 'insideLeft' }}
              tick={{ fontSize: 12 }}
            />
            <Tooltip
              formatter={(value) => value !== null ? `${value} mm/hr` : ''}
              labelFormatter={(val) => {
                if (val < 60) return `${val} min`;
                const hr = val / 60;
                return `${hr} hr`;
              }}
            />
            <Legend />
            {Object.keys(COLORS).map(rp => (
              <Line
                key={rp}
                type="monotone"
                dataKey={rp}
                stroke={COLORS[rp]}
                dot={{ r: 2 }}
                name={labelMap[rp]}
                connectNulls
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

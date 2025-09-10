import React, { useEffect, useState } from 'react';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  LogarithmicScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import IdfTable from './IdfTable';

ChartJS.register(
  CategoryScale,
  LinearScale,
  LogarithmicScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

const IdfChart = ({ stationId, locationName }) => {
  const [chartData, setChartData] = useState({ datasets: [] });
  const [tableData, setTableData] = useState([]);
  const [loading, setLoading] = useState(false);
  const API_URL = 'http://127.0.0.1:5000/api';

  // Helper function to get human-readable duration labels
  const getDurationLabel = (durationInMinutes) => {
    if (durationInMinutes < 60) return `${durationInMinutes} min`;
    return `${durationInMinutes / 60} h`;
  };

  useEffect(() => {
    const fetchData = async () => {
      if (!stationId) {
        setChartData({ datasets: [] });
        setTableData([]);
        return;
      }
      setLoading(true);

      try {
        const idfResponse = await fetch(`${API_URL}/idf/curves?stationId=${String(stationId)}`);
        if (!idfResponse.ok) {
          throw new Error('IDF data not found');
        }
        const { data: idfData } = await idfResponse.json();

        idfData.sort((a, b) => a.duration - b.duration);

        // Extract all unique durations to use as x-axis labels
        const allDurations = [...new Set(idfData.map(d => d.duration))].sort((a, b) => a - b);
        const durationLabels = allDurations.map(d => getDurationLabel(d));

        const returnPeriods = ['2', '5', '10', '25', '50', '100'];
        const datasets = returnPeriods.map(rp => ({
          label: `${rp} yr`,
          data: idfData.map(d => {
            const intensity = (d[rp] / d.duration) * 60;
            return { x: allDurations.indexOf(d.duration), y: intensity }; // Map duration to its index
          }),
          borderColor: `hsl(${Math.random() * 360}, 70%, 50%)`,
          tension: 0.2,
          pointRadius: 4,
          fill: false,
        }));

        setChartData({
          labels: durationLabels,
          datasets: datasets,
        });
        setTableData(idfData);

      } catch (error) {
        console.error('Error fetching data:', error);
        setChartData({ datasets: [] });
        setTableData([]);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [stationId]);

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      x: {
        type: 'category',
        title: {
          display: true,
          text: 'Duration (minutes)',
        },
        ticks: {
          maxRotation: 90,
          minRotation: 90,
        },
      },
      y: {
        type: 'logarithmic',
        title: {
          display: true,
          text: 'Rainfall Intensity (mm/hr)',
        },
        ticks: {
          callback: function(value) {
            if (value >= 1) return Number(value).toFixed(1);
            return '';
          },
        },
        min: 1,
      },
    },
    plugins: {
      legend: {
        position: 'bottom',
        labels: {
          usePointStyle: true,
        },
      },
      title: {
        display: true,
        text: `IDF Curves for ${locationName || 'Selected Station'}`,
        font: {
          size: 16
        },
      },
      tooltip: {
        callbacks: {
          label: function(context) {
            let label = context.dataset.label || '';
            if (label) {
              label += ': ';
            }
            if (context.parsed.y !== null) {
              label += `${context.parsed.y.toFixed(2)} mm/hr`;
            }
            return label;
          },
          title: function(context) {
            const index = context[0].parsed.x;
            const duration = chartData.labels[index];
            return duration;
          },
        },
      },
    },
  };

  return (
    <div style={{ width: '100%', height: '500px' }}>
      {loading ? (
        <p>Loading chart data...</p>
      ) : stationId && chartData.datasets.length > 0 ? (
        <>
          <Line data={chartData} options={options} />
          <IdfTable data={tableData} />
        </>
      ) : (
        <p>No IDF data available for this location. Please select another location.</p>
      )}
    </div>
  );
};

export default IdfChart;
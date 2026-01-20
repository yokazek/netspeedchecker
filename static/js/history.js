import { api } from './api.js';
import { formatValue, formatTime, getTZOffset, formatPing } from './utils.js';
import { getCommonDatasets, getChartOptions } from './chart-config.js';

let speedChart;

document.addEventListener('DOMContentLoaded', () => {
    // ローカルタイム(ブラウザ基準)で今日を取得
    const today = new Date().toLocaleDateString('sv-SE'); // YYYY-MM-DD format
    document.getElementById('history-date').value = today;

    initChart();
    fetchHistory(today);

    document.getElementById('history-date').addEventListener('change', (e) => {
        const selectedDate = e.target.value;
        if (selectedDate) {
            fetchHistory(selectedDate);
        }
    });
});

function initChart() {
    const ctx = document.getElementById('speedChart').getContext('2d');
    speedChart = new Chart(ctx, {
        type: 'line',
        data: { labels: [], datasets: getCommonDatasets() },
        options: getChartOptions()
    });
}

async function fetchHistory(date) {
    const status = document.getElementById('status-history');
    const noData = document.getElementById('no-data');
    const chartWrapper = document.querySelector('.main-chart-wrapper');
    const tableBody = document.getElementById('history-table-body');

    status.innerText = 'データを読み込み中...';

    try {
        const offset = getTZOffset();
        const data = await api.fetchHistoryByDay(date, offset);

        if (data.length === 0) {
            noData.style.display = 'block';
            chartWrapper.style.display = 'none';
            tableBody.innerHTML = '<tr><td colspan="4" style="text-align: center;">データがありません</td></tr>';
            status.innerText = '';

            document.getElementById('day-averages').innerHTML = '';
            speedChart.data.labels = [];
            speedChart.data.datasets.forEach(ds => ds.data = []);
            speedChart.update();
            return;
        }

        noData.style.display = 'none';
        chartWrapper.style.display = 'block';

        updateUI(data);
        status.innerText = '';

    } catch (error) {
        console.error('Error fetching history:', error);
        status.innerText = 'エラーが発生しました。';
    }
}

function updateUI(data) {
    const labels = data.map(d => formatTime(d.timestamp));
    const downloads = data.map(d => d.download);
    const uploads = data.map(d => d.upload);
    const pings = data.map(d => d.ping);

    // Calculate averages
    const avgDownload = downloads.reduce((a, b) => a + b, 0) / data.length;
    const avgUpload = uploads.reduce((a, b) => a + b, 0) / data.length;
    const avgPing = pings.reduce((a, b) => a + b, 0) / data.length;

    // Update Average Display
    document.getElementById('day-averages').innerHTML = `
        <div class="avg-item">
            <span class="label">平均 Download</span>
            <span class="value" style="color: var(--accent-blue)">${formatValue(avgDownload, 2)}<span class="unit">Mbps</span></span>
        </div>
        <div class="avg-item">
            <span class="label">平均 Upload</span>
            <span class="value" style="color: var(--accent-green)">${formatValue(avgUpload, 2)}<span class="unit">Mbps</span></span>
        </div>
        <div class="avg-item">
            <span class="label">平均 Ping</span>
            <span class="value" style="color: var(--accent-pink)">${formatPing(avgPing)}<span class="unit">ms</span></span>
        </div>
    `;

    // Update Chart
    speedChart.data.labels = labels;

    // Main Data
    speedChart.data.datasets[0].data = downloads;
    speedChart.data.datasets[1].data = uploads;
    speedChart.data.datasets[2].data = pings;

    // Add Average Lines if not present
    if (speedChart.data.datasets.length === 3) {
        speedChart.data.datasets.push({
            label: 'Avg Download',
            data: Array(data.length).fill(avgDownload),
            borderColor: 'rgba(56, 189, 248, 0.4)',
            borderWidth: 1.5,
            borderDash: [10, 5],
            pointRadius: 0,
            fill: false,
            yAxisID: 'y'
        });
        speedChart.data.datasets.push({
            label: 'Avg Upload',
            data: Array(data.length).fill(avgUpload),
            borderColor: 'rgba(74, 222, 128, 0.4)',
            borderWidth: 1.5,
            borderDash: [10, 5],
            pointRadius: 0,
            fill: false,
            yAxisID: 'y'
        });
        speedChart.data.datasets.push({
            label: 'Avg Ping',
            data: Array(data.length).fill(avgPing),
            borderColor: 'rgba(244, 114, 182, 0.4)',
            borderWidth: 1.5,
            borderDash: [10, 5],
            pointRadius: 0,
            fill: false,
            yAxisID: 'y1'
        });
    } else {
        // Update existing average lines
        speedChart.data.datasets[3].data = Array(data.length).fill(avgDownload);
        speedChart.data.datasets[4].data = Array(data.length).fill(avgUpload);
        speedChart.data.datasets[5].data = Array(data.length).fill(avgPing);
    }

    speedChart.update();

    // Update Table
    const html = data.map(d => {
        const timeStr = formatTime(d.timestamp);

        return `
            <tr>
                <td>${timeStr}</td>
                <td style="color: var(--accent-blue)">${formatValue(d.download, 2)}</td>
                <td style="color: var(--accent-green)">${formatValue(d.upload, 2)}</td>
                <td style="color: var(--accent-pink)">${formatValue(d.ping, 2)}</td>
            </tr>
        `;
    }).reverse().join('');

    document.getElementById('history-table-body').innerHTML = html;
}

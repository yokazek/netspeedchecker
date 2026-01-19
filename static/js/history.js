import { api } from './api.js';
import { formatValue, formatTime, getTZOffset } from './utils.js';
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

    // Update Chart
    speedChart.data.labels = labels;
    speedChart.data.datasets[0].data = downloads;
    speedChart.data.datasets[1].data = uploads;
    speedChart.data.datasets[2].data = pings;
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

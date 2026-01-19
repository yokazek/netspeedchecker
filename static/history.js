let speedChart;
let historyData = [];

document.addEventListener('DOMContentLoaded', () => {
    // 今日をデフォルト値に設定
    const today = new Date().toISOString().split('T')[0];
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
        data: {
            labels: [],
            datasets: [
                {
                    label: 'Download (Mbps)',
                    borderColor: '#38bdf8',
                    backgroundColor: 'rgba(56, 189, 248, 0.1)',
                    borderWidth: 3,
                    tension: 0.4,
                    fill: true,
                    data: [],
                    yAxisID: 'y'
                },
                {
                    label: 'Upload (Mbps)',
                    borderColor: '#4ade80',
                    backgroundColor: 'rgba(74, 222, 128, 0.1)',
                    borderWidth: 3,
                    tension: 0.4,
                    fill: true,
                    data: [],
                    yAxisID: 'y'
                },
                {
                    label: 'Ping (ms)',
                    borderColor: '#f472b6',
                    backgroundColor: 'transparent',
                    borderWidth: 2,
                    borderDash: [5, 5],
                    tension: 0.4,
                    fill: false,
                    data: [],
                    yAxisID: 'y1'
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                mode: 'index',
                intersect: false,
            },
            plugins: {
                legend: {
                    labels: { color: '#94a3b8', font: { family: 'Inter' } }
                }
            },
            scales: {
                x: {
                    grid: { color: 'rgba(255, 255, 255, 0.05)' },
                    ticks: { color: '#94a3b8' }
                },
                y: {
                    type: 'linear',
                    display: true,
                    position: 'left',
                    title: { display: true, text: 'Speed (Mbps)', color: '#94a3b8' },
                    grid: { color: 'rgba(255, 255, 255, 0.1)' },
                    ticks: { color: '#94a3b8' }
                },
                y1: {
                    type: 'linear',
                    display: true,
                    position: 'right',
                    title: { display: true, text: 'Ping (ms)', color: '#f472b6' },
                    grid: { drawOnChartArea: false },
                    ticks: { color: '#f472b6' },
                    min: 0
                }
            }
        }
    });
}

async function fetchHistory(date) {
    const status = document.getElementById('status-history');
    const noData = document.getElementById('no-data');
    const chartWrapper = document.querySelector('.main-chart-wrapper');
    const tableBody = document.getElementById('history-table-body');

    status.innerText = 'データを読み込み中...';

    try {
        const response = await fetch(`/api/history/day?date=${date}`);
        const data = await response.json();

        historyData = data;

        if (data.length === 0) {
            noData.style.display = 'block';
            chartWrapper.style.display = 'none';
            tableBody.innerHTML = '<tr><td colspan="4" style="text-align: center;">データがありません</td></tr>';
            status.innerText = '';

            // Clear chart
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
    const labels = data.map(d => {
        const date = new Date(d.timestamp + " UTC");
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    });

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
        const date = new Date(d.timestamp + " UTC");
        const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const formatValue = (val) => (val !== null && val !== undefined) ? val.toFixed(2) : '--';

        return `
            <tr>
                <td>${timeStr}</td>
                <td style="color: var(--accent-blue)">${formatValue(d.download)}</td>
                <td style="color: var(--accent-green)">${formatValue(d.upload)}</td>
                <td style="color: var(--accent-pink)">${formatValue(d.ping)}</td>
            </tr>
        `;
    }).reverse().join(''); // 最新を上に表示

    document.getElementById('history-table-body').innerHTML = html;
}

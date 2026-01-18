let speedChart;

document.addEventListener('DOMContentLoaded', () => {
    initChart();
    fetchData();
    fetchLogs();

    document.getElementById('btn-test').addEventListener('click', startManualTest);
    document.getElementById('btn-refresh-logs').addEventListener('click', fetchLogs);
    document.getElementById('btn-clear-history').addEventListener('click', clearHistory);
    document.getElementById('btn-clear-logs').addEventListener('click', clearLogs);

    // 1分ごとにデータを更新
    setInterval(() => {
        fetchData();
        fetchLogs();
    }, 60000);
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
                    data: [],
                    borderWidth: 3,
                    tension: 0.4,
                    fill: true,
                    yAxisID: 'y'
                },
                {
                    label: 'Upload (Mbps)',
                    borderColor: '#4ade80',
                    backgroundColor: 'rgba(74, 222, 128, 0.1)',
                    data: [],
                    borderWidth: 3,
                    tension: 0.4,
                    fill: true,
                    yAxisID: 'y'
                },
                {
                    label: 'Ping (ms)',
                    borderColor: '#f472b6',
                    backgroundColor: 'transparent',
                    data: [],
                    borderWidth: 2,
                    borderDash: [5, 5],
                    tension: 0.4,
                    fill: false,
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

async function fetchData() {
    try {
        const response = await fetch('/api/history');
        const data = await response.json();

        if (data.length > 0) {
            updateDashboard(data);
        }
    } catch (error) {
        console.error('Error fetching data:', error);
    }
}

function updateDashboard(data) {
    // 最新のデータをカードに反映 (dataは降順)
    const latest = data[0];
    document.querySelector('#card-download .value').innerHTML = `${latest.download.toFixed(1)} <span class="unit">Mbps</span>`;
    document.querySelector('#card-upload .value').innerHTML = `${latest.upload.toFixed(1)} <span class="unit">Mbps</span>`;
    document.querySelector('#card-ping .value').innerHTML = `${Math.round(latest.ping)} <span class="unit">ms</span>`;

    // グラフの更新 (昇順にする必要がある)
    const chartData = [...data].reverse();
    // タイムゾーン補正: SQLiteの文字列に ' UTC' を付加して Date オブジェクトを作成
    speedChart.data.labels = chartData.map(d => {
        const date = new Date(d.timestamp + " UTC");
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    });
    speedChart.data.datasets[0].data = chartData.map(d => d.download);
    speedChart.data.datasets[1].data = chartData.map(d => d.upload);
    speedChart.data.datasets[2].data = chartData.map(d => d.ping);

    // データが null の場合に線を途切れさせる設定 (spanGaps: false はデフォルトだが、明示的に設定)
    speedChart.data.datasets.forEach(ds => ds.spanGaps = false);

    speedChart.update();

    // テーブルの更新
    const tbody = document.querySelector('#table-history tbody');
    tbody.innerHTML = '';
    data.forEach(d => {
        const date = new Date(d.timestamp + " UTC");
        const tr = document.createElement('tr');

        const formatValue = (val, unit) => (val === null || val === undefined) ? `<span class="error-text">Error</span>` : `${val.toFixed(val >= 10 ? 1 : 2)} ${unit}`;

        tr.innerHTML = `
            <td>${date.toLocaleString()}</td>
            <td>${formatValue(d.download, 'Mbps')}</td>
            <td>${formatValue(d.upload, 'Mbps')}</td>
            <td>${formatValue(d.ping, 'ms')}</td>
        `;
        tbody.appendChild(tr);
    });
}

async function startManualTest() {
    const btn = document.getElementById('btn-test');
    const status = document.getElementById('status-message');

    btn.disabled = true;
    status.innerText = '測定中... (これには1分ほどかかる場合があります)';

    try {
        const response = await fetch('/api/test', { method: 'POST' });
        const result = await response.json();

        // 測定はバックグラウンドで行われるため、少し待ってからデータを再取得
        // 実際にはポーリングなどで状態を確認するのがベストだが、簡易化のため10秒おきに数回チェック
        let attempts = 0;
        const checkInterval = setInterval(async () => {
            attempts++;
            await fetchData();
            if (attempts >= 6) { // 最大1分間チェック
                clearInterval(checkInterval);
                btn.disabled = false;
                status.innerText = '測定が完了しました。';
                setTimeout(() => { status.innerText = ''; }, 5000);
            }
        }, 10000);

    } catch (error) {
        console.error('Error starting test:', error);
        btn.disabled = false;
        status.innerText = 'エラーが発生しました。';
    }
}

async function fetchLogs() {
    try {
        const response = await fetch('/api/logs');
        const data = await response.json();
        const viewer = document.getElementById('log-viewer');
        viewer.innerText = data.logs;
        // 一番下にスクロール
        viewer.scrollTop = viewer.scrollHeight;
    } catch (error) {
        console.error('Error fetching logs:', error);
    }
}

async function clearHistory() {
    if (!confirm('全ての測定履歴を削除しますか？')) return;
    try {
        await fetch('/api/history', { method: 'DELETE' });
        fetchData(); // 画面を更新
    } catch (error) {
        console.error('Error clearing history:', error);
    }
}

async function clearLogs() {
    if (!confirm('システムログをクリアしますか？')) return;
    try {
        await fetch('/api/logs', { method: 'DELETE' });
        fetchLogs(); // 画面を更新
    } catch (error) {
        console.error('Error clearing logs:', error);
    }
}

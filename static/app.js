let speedChart;

document.addEventListener('DOMContentLoaded', () => {
    initChart();
    fetchData();

    document.getElementById('btn-test').addEventListener('click', startManualTest);

    // 1分ごとにデータを更新
    setInterval(fetchData, 60000);
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
                    fill: true
                },
                {
                    label: 'Upload (Mbps)',
                    borderColor: '#4ade80',
                    backgroundColor: 'rgba(74, 222, 128, 0.1)',
                    data: [],
                    borderWidth: 3,
                    tension: 0.4,
                    fill: true
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
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
                    grid: { color: 'rgba(255, 255, 255, 0.05)' },
                    ticks: { color: '#94a3b8' }
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
    speedChart.data.labels = chartData.map(d => new Date(d.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}));
    speedChart.data.datasets[0].data = chartData.map(d => d.download);
    speedChart.data.datasets[1].data = chartData.map(d => d.upload);
    speedChart.update();

    // テーブルの更新
    const tbody = document.querySelector('#table-history tbody');
    tbody.innerHTML = '';
    data.forEach(d => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${new Date(d.timestamp).toLocaleString()}</td>
            <td>${d.download.toFixed(2)} Mbps</td>
            <td>${d.upload.toFixed(2)} Mbps</td>
            <td>${d.ping.toFixed(1)} ms</td>
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

# Network Speed Monitor Setup for Windows

Write-Host "🚀 Network Speed Monitor のセットアップを開始します..." -ForegroundColor Cyan

# 仮想環境の作成
if (-not (Test-Path "venv")) {
    Write-Host "🐍 仮想環境 (venv) を作成中..."
    python -m venv venv
} else {
    Write-Host "✅ 仮想環境は既に存在します。"
}

# 依存ライブラリのインストール
Write-Host "📥 依存ライブラリをインストール中..."
.\venv\Scripts\python -m pip install --upgrade pip
.\venv\Scripts\pip install -r requirements.txt

Write-Host ""
Write-Host "✨ セットアップが完了しました！" -ForegroundColor Green
Write-Host "👉 '.\run_windows.ps1' を実行してツールを起動してください。"
Write-Host "🌐 ブラウザで 'http://localhost:8080' を開くとダッシュボードが見れます。"

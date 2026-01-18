#!/bin/bash

# NetChecker Installer for Raspberry Pi

echo "🚀 NetChecker のセットアップを開始します..."

# システムパッケージの更新確認
echo "📦 システムパッケージを確認中..."
sudo apt-get update
sudo apt-get install -y python3-venv python3-pip

# 仮想環境の作成
if [ ! -d "venv" ]; then
    echo "🐍 仮想環境 (venv) を作成中..."
    python3 -m venv venv
else
    echo "✅ 仮想環境は既に存在します。"
fi

# 依存ライブラリのインストール
echo "📥 依存ライブラリをインストール中..."
./venv/bin/pip install --upgrade pip
./venv/bin/pip install -r requirements.txt

echo ""
echo "✨ セットアップが完了しました！"
echo "👉 './run.sh' を実行してツールを起動してください。"
echo "🌐 ブラウザで 'http://[ラズパイのIPアドレス]:8080' を開くとダッシュボードが見れます。"

# NetSpeedChecker

[English Version (英語版)](README.en.md)

ネットワーク速度測定ツールです。一定間隔で速度を計測し、モダンな Web ダッシュボードで履歴を確認できます。
 
## 背景
Nuro光 に変更してからなんかWifi使っていると、つまりみたいなのがあり使うのにすごく時間がかかったり意図せずルーターが再起動しているようで、サポートに連絡してもらちが明かないので、定期的にネットワークに接続する。速度を測るツールを作ってみました。


## 特徴
- 🚀 **自動計測**: 指定した間隔（デフォルト1時間）で自動的に速度を測定。
- 📊 **可視化**: Chart.js を使用した見やすいグラフ表示。
- 💎 **モダン UI**: 高級感のあるダークテーマとグラスモーフィズムデザイン。
- 🐍 **簡単セットアップ**: ラズパイ向けインストーラーを同梱。

## セットアップ (Raspberry Pi / Linux)

```bash
# クローンまたはコピー後、ディレクトリに移動
cd netspeedchecker

# 実行権限を付与
chmod +x install.sh run.sh

# インストール（初回のみ）
./install.sh

# 起動
./run.sh
```

## セットアップ (Windows)

```powershell
.\setup_windows.ps1
.\run_windows.ps1
```

起動後、ブラウザで `http://[ラズパイのIPアドレス]:8080` にアクセスしてください。

## 設定
`main.py` の `CHECK_INTERVAL` を変更することで、測定間隔を調整できます。
デフォルトは 15 分間隔です。

```python
CHECK_INTERVAL = {"minutes": 30}  # 30分間隔にする場合
```

## 技術スタック
- **Backend**: Python / FastAPI / APScheduler / SQLite
- **Frontend**: Vanilla JS / CSS / Chart.js

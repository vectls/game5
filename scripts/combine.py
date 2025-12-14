import os
import argparse
from datetime import datetime # datetimeモジュールを追加

def combine_source_code(root_dir, output_file, 
                        # 除外ディレクトリ
                        exclude_dirs=['.git', '__pycache__', 'node_modules', 'dist', 'build', 'vendor', 'coverage', '.pytest_cache'], 
                        # 除外拡張子
                        exclude_extensions=['.pyc', '.o', '.exe', '.dll', '.bin', '.pdb', '.log', '.out', '.zip', '.tar', '.gz', '.jpg', '.jpeg', '.png', '.gif', '.svg', '.ico', '.webp', '.pdf', '.docx', '.xlsx', '.csv']):
    """
    指定されたルートディレクトリ以下のソースコードファイルの内容と階層情報を結合します。
    """
    combined_content = []

    # タイムスタンプの処理 (ファイル名が自動生成の場合にのみ使用)
    if not output_file:
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        output_file = f"combined_code_for_copilot_{timestamp}.txt"
        print(f"📄 出力ファイル名が指定されなかったため、自動生成します: {output_file}")
    
    print(f"✅ 走査を開始: {os.path.abspath(root_dir)}")
    print(f"📁 除外ディレクトリ: {exclude_dirs}")
    print(f"🚫 除外拡張子: {exclude_extensions}")
    print("-" * 40)

    for dirpath, dirnames, filenames in os.walk(root_dir, topdown=True):
        # 除外ディレクトリのスキップ処理
        dirnames[:] = [d for d in dirnames if d not in exclude_dirs]

        for filename in filenames:
            # 除外拡張子のスキップ
            if any(filename.endswith(ext) for ext in exclude_extensions):
                continue
            
            full_path = os.path.join(dirpath, filename)
            relative_path = os.path.relpath(full_path, root_dir)

            try:
                # ファイルサイズの制限チェック（例: 1MBを超えるファイルをスキップ）
                if os.path.getsize(full_path) > 1024 * 1024:
                    print(f"   [スキップ] ファイルサイズが大きすぎます (>1MB): {relative_path}")
                    continue
                    
                with open(full_path, 'r', encoding='utf-8') as f:
                    content = f.read()

                # ファイルの階層情報と内容を特定のフォーマットで結合
                combined_content.append(f"======== FILE START: {relative_path} ========\n")
                combined_content.append(content)
                combined_content.append(f"\n======== FILE END: {relative_path} ========\n\n")
                print(f"   [追加] {relative_path}")

            except UnicodeDecodeError:
                print(f"   [スキップ] バイナリまたはエンコードエラー: {relative_path}")
            except Exception as e:
                print(f"   [エラー] {relative_path}: {e}")

    # すべての内容を単一の文字列に結合
    final_output = "".join(combined_content)

    # 結果を指定されたファイルに書き出す
    try:
        output_path = os.path.abspath(output_file)
        with open(output_path, 'w', encoding='utf-8') as f:
            f.write(final_output)
        
        print("-" * 40)
        print(f"✨ 結合が完了しました！")
        print(f"💾 出力ファイル: {output_path}")
        print(f"📏 サイズ: {len(final_output):,} 文字")
    except Exception as e:
        print(f"❌ 出力ファイルへの書き込みに失敗しました: {e}")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(
        description="指定フォルダ内の全ソースコードを結合し、ファイルパスと内容を含む単一のテキストファイルを作成します。"
    )
    parser.add_argument(
        "root_directory",
        type=str,
        help="走査対象のルートディレクトリ（例: ./my_project）"
    )
    parser.add_argument(
        "-o", "--output",
        type=str,
        default=None, # デフォルト値をNoneに変更
        help="出力ファイル名 (指定しない場合、タイムスタンプ付きで自動生成されます)"
    )
    
    args = parser.parse_args()
    
    if not os.path.isdir(args.root_directory):
        print(f"❌ エラー: 指定されたディレクトリ '{args.root_directory}' が見つかりません。")
    else:
        # スクリプトを実行。引数で指定されたファイル名を渡す
        combine_source_code(args.root_directory, args.output)
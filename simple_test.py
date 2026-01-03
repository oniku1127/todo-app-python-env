#!/usr/bin/env python3
"""
シンプルなPython開発環境テストスクリプト
"""

import sys
import platform

def test_python_basics():
    """基本的なPython機能をテスト"""
    print("=" * 50)
    print("Python Environment Test")
    print("=" * 50)

    print(f"Python Version: {sys.version}")
    print(f"Python Executable: {sys.executable}")
    print(f"Platform: {platform.system()} {platform.release()}")
    print()

def test_packages():
    """インストールされたパッケージをテスト"""
    print("Testing Installed Packages")
    print("-" * 30)

    packages = ['numpy', 'pandas', 'matplotlib', 'requests']
    successful = 0

    for package in packages:
        try:
            module = __import__(package)
            version = getattr(module, '__version__', 'Unknown')
            print(f"OK  {package} v{version}")
            successful += 1
        except ImportError:
            print(f"FAIL {package} - not found")

    print(f"\nSuccess rate: {successful}/{len(packages)}")
    print()

def test_numpy():
    """NumPyの基本テスト"""
    try:
        import numpy as np
        print("Testing NumPy...")

        arr = np.array([1, 2, 3, 4, 5])
        print(f"Array: {arr}")
        print(f"Mean: {np.mean(arr)}")
        print(f"Sum: {np.sum(arr)}")
        print("NumPy test passed!")
        print()
    except Exception as e:
        print(f"NumPy test failed: {e}")
        print()

def test_pandas():
    """Pandasの基本テスト"""
    try:
        import pandas as pd
        print("Testing Pandas...")

        data = {'A': [1, 2, 3], 'B': [4, 5, 6]}
        df = pd.DataFrame(data)
        print(f"DataFrame shape: {df.shape}")
        print("Pandas test passed!")
        print()
    except Exception as e:
        print(f"Pandas test failed: {e}")
        print()

def test_matplotlib():
    """Matplotlibの基本テスト"""
    try:
        import matplotlib
        matplotlib.use('Agg')  # GUI不要
        import matplotlib.pyplot as plt
        import numpy as np

        print("Testing Matplotlib...")

        x = np.linspace(0, 5, 50)
        y = np.sin(x)

        plt.figure()
        plt.plot(x, y)
        plt.savefig('test_plot.png')
        plt.close()

        print("Graph saved as 'test_plot.png'")
        print("Matplotlib test passed!")
        print()
    except Exception as e:
        print(f"Matplotlib test failed: {e}")
        print()

def test_requests():
    """Requestsの基本テスト"""
    try:
        import requests
        print("Testing Requests...")

        response = requests.get('https://httpbin.org/json', timeout=10)
        print(f"Status code: {response.status_code}")

        if response.status_code == 200:
            print("HTTP request test passed!")
        else:
            print("HTTP request test failed!")
        print()
    except Exception as e:
        print(f"Requests test failed: {e}")
        print()

def main():
    """メインテスト関数"""
    test_python_basics()
    test_packages()
    test_numpy()
    test_pandas()
    test_matplotlib()
    test_requests()

    print("=" * 50)
    print("Python Environment Test Complete!")
    print("=" * 50)
    print("Your Python development environment is ready!")

if __name__ == "__main__":
    main()
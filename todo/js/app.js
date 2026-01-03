/**
 * App Initialization - アプリケーション初期化
 * TODOアプリの起動と初期設定を管理
 */

/**
 * アプリケーション本体クラス
 */
class TodoApp {
    constructor() {
        this.version = '1.0.0';
        this.storageManager = null;
        this.todoManager = null;
        this.uiManager = null;

        // 初期化フラグ
        this.initialized = false;
        this.debugMode = false;

        // パフォーマンス監視
        this.performanceMetrics = {
            startTime: performance.now(),
            loadTime: null,
            initTime: null
        };
    }

    /**
     * アプリケーションを初期化
     * @returns {Promise<void>}
     */
    async initialize() {
        try {
            console.log(`🚀 TODOアプリ v${this.version} を初期化中...`);

            // デバッグモードの設定
            this.debugMode = this.checkDebugMode();

            if (this.debugMode) {
                console.log('🐛 デバッグモードが有効です');
                this.enableDebugFeatures();
            }

            // 1. ストレージマネージャーの初期化
            this.initializeStorageManager();

            // 2. TODOマネージャーの初期化
            this.initializeTodoManager();

            // 3. UIマネージャーの初期化
            this.initializeUIManager();

            // 4. グローバルエラーハンドラーの設定
            this.setupGlobalErrorHandling();

            // 5. サービスワーカーの登録（オフライン対応）
            await this.setupServiceWorker();

            // 6. パフォーマンス監視
            this.setupPerformanceMonitoring();

            // 7. アクセシビリティの設定
            this.setupAccessibility();

            // 8. 自動保存の設定
            this.setupAutoSave();

            // 9. 期限切れ通知の設定
            this.setupDueDateNotifications();

            // 初期化完了
            this.initialized = true;
            this.performanceMetrics.initTime = performance.now() - this.performanceMetrics.startTime;

            console.log(`✅ アプリケーションの初期化が完了しました (${Math.round(this.performanceMetrics.initTime)}ms)`);

            // 初期化イベントを発火
            this.dispatchEvent('app:initialized', { app: this });

        } catch (error) {
            console.error('❌ アプリケーションの初期化に失敗しました:', error);
            this.handleInitializationError(error);
        }
    }

    /**
     * ストレージマネージャーを初期化
     */
    initializeStorageManager() {
        try {
            this.storageManager = new StorageManager('todos', 'todos_backup');

            // ストレージのクリーンアップを実行
            StorageManager.cleanup();

            if (this.debugMode) {
                const info = this.storageManager.getStorageInfo();
                console.log('📊 ストレージ情報:', info);
            }

        } catch (error) {
            console.error('ストレージマネージャーの初期化に失敗:', error);
            throw error;
        }
    }

    /**
     * TODOマネージャーを初期化
     */
    initializeTodoManager() {
        try {
            this.todoManager = new TodoManager(this.storageManager);

            if (this.debugMode) {
                const stats = this.todoManager.getStatistics();
                console.log('📈 TODO統計:', stats);
            }

        } catch (error) {
            console.error('TODOマネージャーの初期化に失敗:', error);
            throw error;
        }
    }

    /**
     * UIマネージャーを初期化
     */
    initializeUIManager() {
        try {
            this.uiManager = new UIManager(this.todoManager);

            if (this.debugMode) {
                console.log('🎨 UIマネージャーが初期化されました');
            }

        } catch (error) {
            console.error('UIマネージャーの初期化に失敗:', error);
            throw error;
        }
    }

    /**
     * グローバルエラーハンドラーを設定
     */
    setupGlobalErrorHandling() {
        // JavaScript エラー
        window.addEventListener('error', (event) => {
            console.error('グローバルエラー:', event.error);
            this.handleGlobalError(event.error, 'JavaScript Error');
        });

        // Promise の未処理拒否
        window.addEventListener('unhandledrejection', (event) => {
            console.error('未処理のPromise拒否:', event.reason);
            this.handleGlobalError(event.reason, 'Unhandled Promise Rejection');
        });
    }

    /**
     * サービスワーカーを設定（将来の拡張用）
     */
    async setupServiceWorker() {
        if ('serviceWorker' in navigator) {
            try {
                // 現在はサービスワーカーファイルがないため、コメントアウト
                // const registration = await navigator.serviceWorker.register('/sw.js');
                // console.log('サービスワーカーが登録されました:', registration);
            } catch (error) {
                if (this.debugMode) {
                    console.log('サービスワーカーの登録をスキップしました:', error.message);
                }
            }
        }
    }

    /**
     * パフォーマンス監視を設定
     */
    setupPerformanceMonitoring() {
        if (!this.debugMode) return;

        // ページロード時間の監視
        window.addEventListener('load', () => {
            this.performanceMetrics.loadTime = performance.now() - this.performanceMetrics.startTime;
            console.log(`📊 ページロード時間: ${Math.round(this.performanceMetrics.loadTime)}ms`);
        });

        // メモリ使用量の監視（Chrome のみ）
        if ('memory' in performance) {
            setInterval(() => {
                const memoryInfo = performance.memory;
                if (memoryInfo.usedJSHeapSize > 50 * 1024 * 1024) { // 50MB以上
                    console.warn('⚠️ メモリ使用量が高くなっています:', Math.round(memoryInfo.usedJSHeapSize / 1024 / 1024) + 'MB');
                }
            }, 60000); // 1分ごと
        }
    }

    /**
     * アクセシビリティ設定
     */
    setupAccessibility() {
        // フォーカス管理の改善
        document.addEventListener('keydown', (e) => {
            // タブキーでのフォーカス移動を視覚化
            if (e.key === 'Tab') {
                document.body.classList.add('keyboard-navigation');
            }
        });

        document.addEventListener('mousedown', () => {
            document.body.classList.remove('keyboard-navigation');
        });

        // 高コントラストモードの検出
        if (window.matchMedia('(prefers-contrast: high)').matches) {
            document.body.classList.add('high-contrast');
            console.log('🎯 高コントラストモードが検出されました');
        }

        // 縮小モーションの検出
        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
            document.body.classList.add('reduced-motion');
            console.log('🎯 縮小モーションモードが検出されました');
        }
    }

    /**
     * 自動保存を設定
     */
    setupAutoSave() {
        // 定期的なバックアップ（5分ごと）
        setInterval(() => {
            try {
                if (this.todoManager && this.storageManager) {
                    const todos = this.todoManager.getAllTodos();
                    this.storageManager.saveTodos(todos);

                    if (this.debugMode) {
                        console.log('🔄 自動保存が実行されました');
                    }
                }
            } catch (error) {
                console.error('自動保存に失敗しました:', error);
            }
        }, 5 * 60 * 1000); // 5分

        // ページを離れる前の保存
        window.addEventListener('beforeunload', () => {
            try {
                if (this.todoManager && this.storageManager) {
                    const todos = this.todoManager.getAllTodos();
                    this.storageManager.saveTodos(todos);
                }
            } catch (error) {
                console.error('終了時保存に失敗しました:', error);
            }
        });
    }

    /**
     * 期限切れ通知を設定
     */
    setupDueDateNotifications() {
        // 30分ごとに期限をチェック
        setInterval(() => {
            if (!this.todoManager) return;

            const todos = this.todoManager.getAllTodos();
            const overdueTodos = todos.filter(todo =>
                !todo.completed && todo.getDueStatus() === 'overdue'
            );

            if (overdueTodos.length > 0) {
                this.showDueDateNotification(overdueTodos);
            }
        }, 30 * 60 * 1000); // 30分
    }

    /**
     * デバッグモードをチェック
     * @returns {boolean}
     */
    checkDebugMode() {
        return (
            window.location.hostname === 'localhost' ||
            window.location.search.includes('debug=true') ||
            localStorage.getItem('todo_debug') === 'true'
        );
    }

    /**
     * デバッグ機能を有効化
     */
    enableDebugFeatures() {
        // グローバルオブジェクトとして公開（デバッグ用）
        window.TodoApp = this;
        window.TodoManager = this.todoManager;
        window.StorageManager = this.storageManager;
        window.UIManager = this.uiManager;

        // デバッグ用のCSS追加
        document.body.classList.add('debug-mode');

        // キーボードショートカット: Ctrl+Shift+D でデバッグ情報表示
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey && e.shiftKey && e.key === 'D') {
                this.showDebugInfo();
            }
        });
    }

    /**
     * 期限切れ通知を表示
     * @param {Array<Todo>} overdueTodos 期限切れのTodo配列
     */
    showDueDateNotification(overdueTodos) {
        if ('Notification' in window && Notification.permission === 'granted') {
            const count = overdueTodos.length;
            const message = count === 1
                ? `"${overdueTodos[0].title}" の期限が過ぎています`
                : `${count}件のタスクの期限が過ぎています`;

            new Notification('TODOアプリ - 期限切れ通知', {
                body: message,
                icon: '/favicon.ico',
                tag: 'todo-overdue'
            });
        } else if (this.uiManager) {
            // ブラウザ通知が使えない場合はトースト通知
            const count = overdueTodos.length;
            const message = count === 1
                ? `"${overdueTodos[0].title}" の期限が過ぎています`
                : `${count}件のタスクの期限が過ぎています`;

            this.uiManager.showToast(message, 'warning', 10000);
        }
    }

    /**
     * デバッグ情報を表示
     */
    showDebugInfo() {
        const info = {
            version: this.version,
            initialized: this.initialized,
            performance: this.performanceMetrics,
            todoStats: this.todoManager ? this.todoManager.getStatistics() : null,
            storageInfo: this.storageManager ? this.storageManager.getStorageInfo() : null,
            userAgent: navigator.userAgent,
            localStorage: {
                available: this.storageManager?.isStorageAvailable,
                usage: this.storageManager?.getStorageInfo()
            }
        };

        console.group('🐛 TODOアプリ デバッグ情報');
        console.table(info);
        console.groupEnd();

        // モーダルでも表示
        if (this.uiManager) {
            this.uiManager.showConfirmModal(
                'デバッグ情報',
                `<pre>${JSON.stringify(info, null, 2)}</pre>`,
                () => {}
            );
        }
    }

    /**
     * グローバルエラーを処理
     * @param {Error} error エラーオブジェクト
     * @param {string} type エラータイプ
     */
    handleGlobalError(error, type) {
        if (this.debugMode) {
            console.group(`❌ ${type}`);
            console.error(error);
            console.trace();
            console.groupEnd();
        }

        // ユーザーに通知
        if (this.uiManager) {
            this.uiManager.showToast(
                'アプリケーションでエラーが発生しました。ページをリロードしてください。',
                'error',
                10000
            );
        }
    }

    /**
     * 初期化エラーを処理
     * @param {Error} error 初期化エラー
     */
    handleInitializationError(error) {
        // 基本的なエラーメッセージを表示
        const errorContainer = document.createElement('div');
        errorContainer.className = 'init-error';
        errorContainer.innerHTML = `
            <div style="
                background: #f8d7da;
                border: 1px solid #f5c6cb;
                color: #721c24;
                padding: 20px;
                margin: 20px;
                border-radius: 8px;
                text-align: center;
                font-family: Arial, sans-serif;
            ">
                <h2>❌ アプリケーションの初期化に失敗しました</h2>
                <p>ページをリロードしてもう一度お試しください。</p>
                <p>問題が続く場合は、ブラウザのキャッシュをクリアしてください。</p>
                <button onclick="location.reload()" style="
                    background: #dc3545;
                    color: white;
                    border: none;
                    padding: 10px 20px;
                    border-radius: 4px;
                    cursor: pointer;
                    margin-top: 10px;
                ">ページをリロード</button>
            </div>
        `;

        document.body.insertBefore(errorContainer, document.body.firstChild);
    }

    /**
     * カスタムイベントを発火
     * @param {string} eventName イベント名
     * @param {*} detail イベントデータ
     */
    dispatchEvent(eventName, detail) {
        const event = new CustomEvent(eventName, { detail });
        window.dispatchEvent(event);
    }

    /**
     * 通知許可をリクエスト
     */
    async requestNotificationPermission() {
        if ('Notification' in window && Notification.permission === 'default') {
            try {
                const permission = await Notification.requestPermission();
                console.log('通知許可状態:', permission);
                return permission === 'granted';
            } catch (error) {
                console.error('通知許可の取得に失敗:', error);
                return false;
            }
        }
        return Notification.permission === 'granted';
    }
}

// ===== アプリケーション起動 =====

/**
 * DOM読み込み完了後にアプリケーションを初期化
 */
document.addEventListener('DOMContentLoaded', async () => {
    try {
        // アプリケーションインスタンスを作成
        const app = new TodoApp();

        // アプリケーションを初期化
        await app.initialize();

        // 通知許可をリクエスト（ユーザーが操作した後）
        document.addEventListener('click', async () => {
            await app.requestNotificationPermission();
        }, { once: true });

        // グローバルに公開（デバッグ用）
        window.todoApp = app;

    } catch (error) {
        console.error('アプリケーションの起動に失敗しました:', error);
    }
});

// ===== パフォーマンス監視 =====

// ページロード時間を監視
if ('performance' in window) {
    window.addEventListener('load', () => {
        setTimeout(() => {
            const perfData = performance.getEntriesByType('navigation')[0];
            if (perfData) {
                console.log(`📊 ページパフォーマンス:
                - DNS解決: ${Math.round(perfData.domainLookupEnd - perfData.domainLookupStart)}ms
                - サーバー応答: ${Math.round(perfData.responseEnd - perfData.requestStart)}ms
                - DOM構築: ${Math.round(perfData.domContentLoadedEventEnd - perfData.domContentLoadedEventStart)}ms
                - 総読み込み時間: ${Math.round(perfData.loadEventEnd - perfData.navigationStart)}ms`);
            }
        }, 0);
    });
}
/**
 * StorageManager Class - ローカルストレージ管理
 * データの永続化、バックアップ、復元機能を提供
 */
class StorageManager {
    /**
     * StorageManagerインスタンスを作成
     * @param {string} [storageKey='todos'] - ローカルストレージのキー名
     * @param {string} [backupKey='todos_backup'] - バックアップキー名
     */
    constructor(storageKey = 'todos', backupKey = 'todos_backup') {
        this.storageKey = storageKey;
        this.backupKey = backupKey;
        this.version = '1.0.0';

        // ローカルストレージの使用可能性をチェック
        this.isStorageAvailable = this._checkStorageAvailability();

        if (!this.isStorageAvailable) {
            console.warn('LocalStorage is not available. Data will not be persisted.');
        }
    }

    /**
     * すべてのTODOデータを保存
     * @param {Array<Todo>} todos - Todo配列
     * @returns {boolean} - 保存成功の可否
     */
    saveTodos(todos) {
        if (!this.isStorageAvailable) {
            console.error('LocalStorage is not available');
            return false;
        }

        try {
            // バリデーション
            if (!Array.isArray(todos)) {
                throw new Error('Todos must be an array');
            }

            // 保存前にバックアップを作成
            this._createBackup();

            // データの準備
            const data = {
                version: this.version,
                timestamp: new Date().toISOString(),
                todos: todos.map(todo => {
                    if (todo && typeof todo.toJSON === 'function') {
                        return todo.toJSON();
                    } else if (typeof todo === 'object' && todo !== null) {
                        return todo;
                    } else {
                        throw new Error('Invalid todo object');
                    }
                })
            };

            // 保存実行
            const jsonString = JSON.stringify(data);
            localStorage.setItem(this.storageKey, jsonString);

            // ストレージサイズの確認
            this._checkStorageUsage();

            return true;

        } catch (error) {
            console.error('Error saving todos:', error);

            // 保存失敗時はバックアップから復元を試行
            this._restoreFromBackup();

            return false;
        }
    }

    /**
     * すべてのTODOデータを読み込み
     * @returns {Array<Todo>} - Todo配列
     */
    loadTodos() {
        if (!this.isStorageAvailable) {
            return [];
        }

        try {
            const jsonString = localStorage.getItem(this.storageKey);

            if (!jsonString) {
                return [];
            }

            const data = JSON.parse(jsonString);

            // データ形式のバリデーション
            if (!this._validateDataStructure(data)) {
                throw new Error('Invalid data structure');
            }

            // バージョン互換性チェック
            if (data.version && data.version !== this.version) {
                console.info(`Data version mismatch. Expected: ${this.version}, Found: ${data.version}`);
                // 必要に応じてデータ移行処理を実装
                data = this._migrateData(data);
            }

            // Todo配列の復元
            if (Array.isArray(data.todos)) {
                return Todo.fromJSONArray(data.todos);
            } else {
                // 古い形式との互換性
                return Array.isArray(data) ? Todo.fromJSONArray(data) : [];
            }

        } catch (error) {
            console.error('Error loading todos:', error);

            // 読み込み失敗時はバックアップから復元を試行
            return this._loadFromBackup();
        }
    }

    /**
     * 特定のTODOを保存（部分保存）
     * @param {Todo} todo - 保存するTodo
     * @returns {boolean} - 保存成功の可否
     */
    saveTodo(todo) {
        const todos = this.loadTodos();
        const existingIndex = todos.findIndex(t => t.id === todo.id);

        if (existingIndex >= 0) {
            todos[existingIndex] = todo;
        } else {
            todos.push(todo);
        }

        return this.saveTodos(todos);
    }

    /**
     * 特定のTODOを削除
     * @param {string} todoId - 削除するTodoのID
     * @returns {boolean} - 削除成功の可否
     */
    deleteTodo(todoId) {
        const todos = this.loadTodos();
        const filteredTodos = todos.filter(todo => todo.id !== todoId);

        if (filteredTodos.length !== todos.length) {
            return this.saveTodos(filteredTodos);
        }

        return true; // 削除対象が存在しない場合も成功とする
    }

    /**
     * すべてのデータをクリア
     * @returns {boolean} - クリア成功の可否
     */
    clearAll() {
        if (!this.isStorageAvailable) {
            return false;
        }

        try {
            // バックアップを作成してからクリア
            this._createBackup();
            localStorage.removeItem(this.storageKey);
            return true;
        } catch (error) {
            console.error('Error clearing todos:', error);
            return false;
        }
    }

    /**
     * データをエクスポート（JSON形式）
     * @returns {string|null} - JSON文字列、またはエラー時はnull
     */
    exportData() {
        try {
            const todos = this.loadTodos();
            const exportData = {
                version: this.version,
                exportDate: new Date().toISOString(),
                appName: 'TODOアプリ',
                todos: todos.map(todo => todo.toJSON())
            };

            return JSON.stringify(exportData, null, 2);
        } catch (error) {
            console.error('Error exporting data:', error);
            return null;
        }
    }

    /**
     * データをインポート（JSON形式）
     * @param {string} jsonString - インポートするJSON文字列
     * @param {boolean} [merge=false] - 既存データと結合するか
     * @returns {boolean} - インポート成功の可否
     */
    importData(jsonString, merge = false) {
        try {
            const importData = JSON.parse(jsonString);

            // インポートデータのバリデーション
            if (!importData.todos || !Array.isArray(importData.todos)) {
                throw new Error('Invalid import data format');
            }

            // 現在のデータを取得
            const currentTodos = merge ? this.loadTodos() : [];
            const importedTodos = Todo.fromJSONArray(importData.todos);

            // IDの重複チェックと処理
            const finalTodos = this._mergeWithConflictResolution(currentTodos, importedTodos);

            // 保存実行
            return this.saveTodos(finalTodos);

        } catch (error) {
            console.error('Error importing data:', error);
            return false;
        }
    }

    /**
     * ストレージ使用量を取得
     * @returns {Object} - 使用量情報
     */
    getStorageInfo() {
        if (!this.isStorageAvailable) {
            return { available: false };
        }

        try {
            const data = localStorage.getItem(this.storageKey);
            const backup = localStorage.getItem(this.backupKey);

            // サイズ計算（概算）
            const dataSize = data ? new Blob([data]).size : 0;
            const backupSize = backup ? new Blob([backup]).size : 0;
            const totalSize = dataSize + backupSize;

            // LocalStorageの制限（概算5MB）
            const estimatedLimit = 5 * 1024 * 1024;
            const usagePercentage = (totalSize / estimatedLimit) * 100;

            return {
                available: true,
                dataSize,
                backupSize,
                totalSize,
                estimatedLimit,
                usagePercentage: Math.round(usagePercentage * 100) / 100,
                todoCount: this.loadTodos().length
            };

        } catch (error) {
            console.error('Error getting storage info:', error);
            return { available: false, error: error.message };
        }
    }

    // ===== プライベートメソッド =====

    /**
     * ローカルストレージの使用可能性をチェック
     * @returns {boolean} - 使用可能な場合true
     * @private
     */
    _checkStorageAvailability() {
        try {
            const testKey = 'storage_test';
            localStorage.setItem(testKey, 'test');
            localStorage.removeItem(testKey);
            return true;
        } catch (error) {
            return false;
        }
    }

    /**
     * データ構造をバリデーション
     * @param {*} data - チェック対象のデータ
     * @returns {boolean} - 有効な場合true
     * @private
     */
    _validateDataStructure(data) {
        if (!data) return false;

        // 新しい形式
        if (data.version && Array.isArray(data.todos)) {
            return true;
        }

        // 旧い形式（配列のみ）との互換性
        if (Array.isArray(data)) {
            return true;
        }

        return false;
    }

    /**
     * データのバージョン移行
     * @param {Object} data - 移行対象のデータ
     * @returns {Object} - 移行後のデータ
     * @private
     */
    _migrateData(data) {
        // 現在のバージョンでは移行処理は不要
        // 将来的なバージョンアップ時に実装
        return data;
    }

    /**
     * バックアップを作成
     * @private
     */
    _createBackup() {
        try {
            const currentData = localStorage.getItem(this.storageKey);
            if (currentData) {
                localStorage.setItem(this.backupKey, currentData);
            }
        } catch (error) {
            console.warn('Failed to create backup:', error);
        }
    }

    /**
     * バックアップから復元
     * @returns {Array<Todo>} - 復元されたTodo配列
     * @private
     */
    _restoreFromBackup() {
        try {
            console.info('Attempting to restore from backup...');
            const backupData = localStorage.getItem(this.backupKey);

            if (backupData) {
                const data = JSON.parse(backupData);

                if (this._validateDataStructure(data)) {
                    const todos = Array.isArray(data.todos) ? data.todos : data;
                    return Todo.fromJSONArray(todos);
                }
            }
        } catch (error) {
            console.error('Failed to restore from backup:', error);
        }

        return [];
    }

    /**
     * バックアップから復元（保存時エラー用）
     * @private
     */
    _restoreFromBackup() {
        try {
            console.info('Restoring data from backup due to save error...');
            const backupData = localStorage.getItem(this.backupKey);

            if (backupData) {
                localStorage.setItem(this.storageKey, backupData);
            }
        } catch (error) {
            console.error('Failed to restore from backup:', error);
        }
    }

    /**
     * ストレージ使用量をチェック
     * @private
     */
    _checkStorageUsage() {
        const info = this.getStorageInfo();

        if (info.usagePercentage > 80) {
            console.warn(`Storage usage is high: ${info.usagePercentage}%`);
        }

        if (info.usagePercentage > 95) {
            console.error('Storage is nearly full. Consider cleaning up old data.');
        }
    }

    /**
     * データの結合（重複処理付き）
     * @param {Array<Todo>} currentTodos - 現在のTodo配列
     * @param {Array<Todo>} importedTodos - インポートされたTodo配列
     * @returns {Array<Todo>} - 結合されたTodo配列
     * @private
     */
    _mergeWithConflictResolution(currentTodos, importedTodos) {
        const result = [...currentTodos];
        const existingIds = new Set(currentTodos.map(todo => todo.id));

        for (const importedTodo of importedTodos) {
            if (existingIds.has(importedTodo.id)) {
                // ID重複の場合：新しいIDを生成
                const newTodo = importedTodo.clone();
                result.push(newTodo);
            } else {
                result.push(importedTodo);
            }
        }

        return result;
    }

    // ===== 静的メソッド =====

    /**
     * ストレージクリーンアップ（静的メソッド）
     * 古いバックアップファイルなどを削除
     * @static
     */
    static cleanup() {
        try {
            const keysToRemove = [];

            // LocalStorageの全キーをチェック
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);

                // 古い形式のキーを検出
                if (key && key.startsWith('todo_') && key.includes('backup_old')) {
                    keysToRemove.push(key);
                }
            }

            // 古いキーを削除
            keysToRemove.forEach(key => {
                localStorage.removeItem(key);
                console.info(`Cleaned up old storage key: ${key}`);
            });

        } catch (error) {
            console.error('Error during storage cleanup:', error);
        }
    }
}
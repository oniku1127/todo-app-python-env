/**
 * TodoManager Class - CRUD操作とビジネスロジック管理
 * TODOアプリの中核となるビジネスロジックを提供
 */
class TodoManager {
    /**
     * TodoManagerインスタンスを作成
     * @param {StorageManager} [storageManager] - ストレージマネージャー（省略時は新規作成）
     */
    constructor(storageManager = null) {
        this.storageManager = storageManager || new StorageManager();
        this.todos = [];
        this.filteredTodos = [];
        this.currentFilter = {
            search: '',
            category: '',
            priority: '',
            status: '',
            sortBy: 'createdAt',
            sortOrder: 'desc'
        };

        // イベント管理
        this.eventListeners = new Map();
        this.eventListeners.set('todosChanged', []);
        this.eventListeners.set('todoAdded', []);
        this.eventListeners.set('todoUpdated', []);
        this.eventListeners.set('todoDeleted', []);
        this.eventListeners.set('todoToggled', []);
        this.eventListeners.set('filterChanged', []);

        // 初期データ読み込み
        this.loadTodos();
    }

    // ===== CRUD操作 =====

    /**
     * 新しいTODOを追加
     * @param {Object} todoData - TODO項目のデータ
     * @returns {Todo|null} - 追加されたTodoインスタンス、エラー時はnull
     */
    addTodo(todoData) {
        try {
            // バリデーション
            if (!todoData || !todoData.title || typeof todoData.title !== 'string') {
                throw new Error('タスクタイトルが必要です');
            }

            // 重複チェック（同じタイトルの未完了タスク）
            const duplicateExists = this.todos.some(todo =>
                todo.title.toLowerCase() === todoData.title.toLowerCase() && !todo.completed
            );

            if (duplicateExists) {
                throw new Error('同じタイトルの未完了タスクが既に存在します');
            }

            // 新しいTodoを作成
            const newTodo = new Todo(todoData);

            // メモリに追加
            this.todos.push(newTodo);

            // ストレージに保存
            if (!this.storageManager.saveTodos(this.todos)) {
                // 保存失敗時はメモリからも削除
                this.todos.pop();
                throw new Error('データの保存に失敗しました');
            }

            // フィルターを再適用
            this.applyFilter();

            // イベント発火
            this.emit('todoAdded', { todo: newTodo });
            this.emit('todosChanged', { todos: this.todos });

            return newTodo;

        } catch (error) {
            console.error('Error adding todo:', error);
            throw error;
        }
    }

    /**
     * TODOを更新
     * @param {string} todoId - 更新するTodoのID
     * @param {Object} updateData - 更新データ
     * @returns {Todo|null} - 更新されたTodoインスタンス、エラー時はnull
     */
    updateTodo(todoId, updateData) {
        try {
            const todoIndex = this.todos.findIndex(todo => todo.id === todoId);

            if (todoIndex === -1) {
                throw new Error('指定されたタスクが見つかりません');
            }

            const originalTodo = this.todos[todoIndex];

            // タイトル重複チェック（自身以外で同じタイトルの未完了タスク）
            if (updateData.title) {
                const duplicateExists = this.todos.some(todo =>
                    todo.id !== todoId &&
                    todo.title.toLowerCase() === updateData.title.toLowerCase() &&
                    !todo.completed
                );

                if (duplicateExists) {
                    throw new Error('同じタイトルの未完了タスクが既に存在します');
                }
            }

            // Todoを更新
            const updatedTodo = originalTodo.update(updateData);

            // ストレージに保存
            if (!this.storageManager.saveTodos(this.todos)) {
                // 保存失敗時は元に戻す
                this.todos[todoIndex] = originalTodo;
                throw new Error('データの保存に失敗しました');
            }

            // フィルターを再適用
            this.applyFilter();

            // イベント発火
            this.emit('todoUpdated', { todo: updatedTodo, originalTodo });
            this.emit('todosChanged', { todos: this.todos });

            return updatedTodo;

        } catch (error) {
            console.error('Error updating todo:', error);
            throw error;
        }
    }

    /**
     * TODOを削除
     * @param {string} todoId - 削除するTodoのID
     * @returns {boolean} - 削除成功の可否
     */
    deleteTodo(todoId) {
        try {
            const todoIndex = this.todos.findIndex(todo => todo.id === todoId);

            if (todoIndex === -1) {
                throw new Error('指定されたタスクが見つかりません');
            }

            const deletedTodo = this.todos[todoIndex];

            // メモリから削除
            this.todos.splice(todoIndex, 1);

            // ストレージに保存
            if (!this.storageManager.saveTodos(this.todos)) {
                // 保存失敗時は元に戻す
                this.todos.splice(todoIndex, 0, deletedTodo);
                throw new Error('データの保存に失敗しました');
            }

            // フィルターを再適用
            this.applyFilter();

            // イベント発火
            this.emit('todoDeleted', { todo: deletedTodo });
            this.emit('todosChanged', { todos: this.todos });

            return true;

        } catch (error) {
            console.error('Error deleting todo:', error);
            throw error;
        }
    }

    /**
     * TODOの完了状態を切り替え
     * @param {string} todoId - 切り替えるTodoのID
     * @returns {Todo|null} - 切り替え後のTodoインスタンス、エラー時はnull
     */
    toggleTodo(todoId) {
        try {
            const todo = this.todos.find(t => t.id === todoId);

            if (!todo) {
                throw new Error('指定されたタスクが見つかりません');
            }

            const wasCompleted = todo.completed;
            todo.toggleCompleted();

            // ストレージに保存
            if (!this.storageManager.saveTodos(this.todos)) {
                // 保存失敗時は元に戻す
                todo.toggleCompleted();
                throw new Error('データの保存に失敗しました');
            }

            // フィルターを再適用
            this.applyFilter();

            // イベント発火
            this.emit('todoToggled', { todo, wasCompleted });
            this.emit('todosChanged', { todos: this.todos });

            return todo;

        } catch (error) {
            console.error('Error toggling todo:', error);
            throw error;
        }
    }

    /**
     * IDでTODOを取得
     * @param {string} todoId - 取得するTodoのID
     * @returns {Todo|null} - Todoインスタンス、見つからない場合はnull
     */
    getTodoById(todoId) {
        return this.todos.find(todo => todo.id === todoId) || null;
    }

    // ===== データ操作 =====

    /**
     * ストレージからTODOを読み込み
     * @returns {Array<Todo>} - 読み込まれたTodo配列
     */
    loadTodos() {
        try {
            this.todos = this.storageManager.loadTodos();
            this.applyFilter();

            // イベント発火
            this.emit('todosChanged', { todos: this.todos });

            return this.todos;

        } catch (error) {
            console.error('Error loading todos:', error);
            this.todos = [];
            this.filteredTodos = [];
            return [];
        }
    }

    /**
     * すべてのTODOをクリア
     * @returns {boolean} - クリア成功の可否
     */
    clearAllTodos() {
        try {
            const originalTodos = [...this.todos];

            // メモリをクリア
            this.todos = [];
            this.filteredTodos = [];

            // ストレージをクリア
            if (!this.storageManager.clearAll()) {
                // 失敗時は元に戻す
                this.todos = originalTodos;
                this.applyFilter();
                throw new Error('データのクリアに失敗しました');
            }

            // イベント発火
            this.emit('todosChanged', { todos: this.todos });

            return true;

        } catch (error) {
            console.error('Error clearing todos:', error);
            throw error;
        }
    }

    // ===== フィルター・検索・ソート =====

    /**
     * フィルターを設定
     * @param {Object} filter - フィルター設定
     * @param {string} [filter.search=''] - 検索キーワード
     * @param {string} [filter.category=''] - カテゴリフィルター
     * @param {string} [filter.priority=''] - 優先度フィルター
     * @param {string} [filter.status=''] - 状態フィルター
     * @param {string} [filter.sortBy='createdAt'] - ソート基準
     * @param {string} [filter.sortOrder='desc'] - ソート順序
     */
    setFilter(filter) {
        this.currentFilter = {
            ...this.currentFilter,
            ...filter
        };

        this.applyFilter();

        // イベント発火
        this.emit('filterChanged', { filter: this.currentFilter });
    }

    /**
     * 現在のフィルター設定を適用
     */
    applyFilter() {
        let filtered = [...this.todos];

        // 検索フィルター
        if (this.currentFilter.search) {
            const searchTerm = this.currentFilter.search.toLowerCase();
            filtered = filtered.filter(todo =>
                todo.getSearchText().includes(searchTerm)
            );
        }

        // カテゴリフィルター
        if (this.currentFilter.category) {
            filtered = filtered.filter(todo => todo.category === this.currentFilter.category);
        }

        // 優先度フィルター
        if (this.currentFilter.priority) {
            filtered = filtered.filter(todo => todo.priority === this.currentFilter.priority);
        }

        // 状態フィルター
        if (this.currentFilter.status) {
            if (this.currentFilter.status === 'completed') {
                filtered = filtered.filter(todo => todo.completed);
            } else if (this.currentFilter.status === 'pending') {
                filtered = filtered.filter(todo => !todo.completed);
            }
        }

        // ソート
        filtered.sort((a, b) => {
            let comparison = 0;

            switch (this.currentFilter.sortBy) {
                case 'title':
                    comparison = a.title.localeCompare(b.title);
                    break;
                case 'priority':
                    comparison = Todo.getPriorityValue(b.priority) - Todo.getPriorityValue(a.priority);
                    break;
                case 'dueDate':
                    const aDate = a.dueDate ? new Date(a.dueDate) : new Date('9999-12-31');
                    const bDate = b.dueDate ? new Date(b.dueDate) : new Date('9999-12-31');
                    comparison = aDate - bDate;
                    break;
                case 'createdAt':
                default:
                    comparison = new Date(a.createdAt) - new Date(b.createdAt);
                    break;
            }

            return this.currentFilter.sortOrder === 'desc' ? -comparison : comparison;
        });

        this.filteredTodos = filtered;
    }

    /**
     * フィルターをクリア
     */
    clearFilter() {
        this.currentFilter = {
            search: '',
            category: '',
            priority: '',
            status: '',
            sortBy: 'createdAt',
            sortOrder: 'desc'
        };

        this.applyFilter();

        // イベント発火
        this.emit('filterChanged', { filter: this.currentFilter });
    }

    // ===== 統計・分析 =====

    /**
     * TODO統計を取得
     * @returns {Object} - 統計情報
     */
    getStatistics() {
        const total = this.todos.length;
        const completed = this.todos.filter(todo => todo.completed).length;
        const pending = total - completed;

        // カテゴリ別統計
        const categoryStats = {};
        this.todos.forEach(todo => {
            const category = todo.category || 'その他';
            categoryStats[category] = (categoryStats[category] || 0) + 1;
        });

        // 優先度別統計
        const priorityStats = {};
        this.todos.forEach(todo => {
            priorityStats[todo.priority] = (priorityStats[todo.priority] || 0) + 1;
        });

        // 期限状態統計
        const dueStats = {
            overdue: 0,
            dueSoon: 0,
            normal: 0,
            noDueDate: 0
        };

        this.todos.filter(todo => !todo.completed).forEach(todo => {
            if (!todo.dueDate) {
                dueStats.noDueDate++;
            } else {
                const status = todo.getDueStatus();
                dueStats[status]++;
            }
        });

        return {
            total,
            completed,
            pending,
            completionRate: total > 0 ? Math.round((completed / total) * 100) : 0,
            categoryStats,
            priorityStats,
            dueStats
        };
    }

    // ===== エクスポート・インポート =====

    /**
     * データをエクスポート
     * @returns {string|null} - JSON文字列、エラー時はnull
     */
    exportData() {
        return this.storageManager.exportData();
    }

    /**
     * データをインポート
     * @param {string} jsonString - インポートするJSON文字列
     * @param {boolean} [merge=false] - 既存データと結合するか
     * @returns {boolean} - インポート成功の可否
     */
    importData(jsonString, merge = false) {
        try {
            if (!this.storageManager.importData(jsonString, merge)) {
                throw new Error('データのインポートに失敗しました');
            }

            // データを再読み込み
            this.loadTodos();

            return true;

        } catch (error) {
            console.error('Error importing data:', error);
            throw error;
        }
    }

    // ===== イベント管理 =====

    /**
     * イベントリスナーを追加
     * @param {string} eventName - イベント名
     * @param {function} callback - コールバック関数
     */
    addEventListener(eventName, callback) {
        if (!this.eventListeners.has(eventName)) {
            this.eventListeners.set(eventName, []);
        }

        this.eventListeners.get(eventName).push(callback);
    }

    /**
     * イベントリスナーを削除
     * @param {string} eventName - イベント名
     * @param {function} callback - コールバック関数
     */
    removeEventListener(eventName, callback) {
        if (this.eventListeners.has(eventName)) {
            const listeners = this.eventListeners.get(eventName);
            const index = listeners.indexOf(callback);
            if (index > -1) {
                listeners.splice(index, 1);
            }
        }
    }

    /**
     * イベントを発火
     * @param {string} eventName - イベント名
     * @param {*} data - イベントデータ
     */
    emit(eventName, data) {
        if (this.eventListeners.has(eventName)) {
            const listeners = this.eventListeners.get(eventName);
            listeners.forEach(callback => {
                try {
                    callback(data);
                } catch (error) {
                    console.error(`Error in event listener for ${eventName}:`, error);
                }
            });
        }
    }

    // ===== Getter =====

    /**
     * すべてのTODOを取得
     * @returns {Array<Todo>} - Todo配列
     */
    getAllTodos() {
        return [...this.todos];
    }

    /**
     * フィルターされたTODOを取得
     * @returns {Array<Todo>} - フィルター済みTodo配列
     */
    getFilteredTodos() {
        return [...this.filteredTodos];
    }

    /**
     * 現在のフィルター設定を取得
     * @returns {Object} - フィルター設定
     */
    getCurrentFilter() {
        return { ...this.currentFilter };
    }

    /**
     * ストレージ情報を取得
     * @returns {Object} - ストレージ使用量情報
     */
    getStorageInfo() {
        return this.storageManager.getStorageInfo();
    }
}
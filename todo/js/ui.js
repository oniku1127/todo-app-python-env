/**
 * UIManager Class - DOM操作とイベント処理
 * ユーザーインターフェースの管理とインタラクションを制御
 */
class UIManager {
    /**
     * UIManagerインスタンスを作成
     * @param {TodoManager} todoManager - TodoManagerインスタンス
     */
    constructor(todoManager) {
        this.todoManager = todoManager;
        this.currentEditingTodo = null;
        this.modal = null;

        // DOM要素の参照を保持
        this.elements = {};

        // デバウンス用タイマー
        this.searchDebounceTimer = null;

        // 初期化
        this.initElements();
        this.attachEventListeners();
        this.setupTodoManagerEvents();

        // 初期表示
        this.updateDisplay();
    }

    // ===== 初期化 =====

    /**
     * DOM要素の参照を初期化
     */
    initElements() {
        this.elements = {
            // フォーム要素
            todoForm: document.getElementById('todoForm'),
            todoTitle: document.getElementById('todoTitle'),
            todoDescription: document.getElementById('todoDescription'),
            todoCategory: document.getElementById('todoCategory'),
            todoPriority: document.getElementById('todoPriority'),
            todoDueDate: document.getElementById('todoDueDate'),
            submitBtn: document.getElementById('submitBtn'),
            resetBtn: document.getElementById('resetBtn'),
            titleError: document.getElementById('titleError'),

            // フィルター要素
            searchInput: document.getElementById('searchInput'),
            filterCategory: document.getElementById('filterCategory'),
            filterPriority: document.getElementById('filterPriority'),
            filterStatus: document.getElementById('filterStatus'),
            sortBy: document.getElementById('sortBy'),
            clearFilters: document.getElementById('clearFilters'),

            // リスト要素
            todoList: document.getElementById('todoList'),
            emptyState: document.getElementById('emptyState'),
            exportBtn: document.getElementById('exportBtn'),
            importBtn: document.getElementById('importBtn'),
            importFile: document.getElementById('importFile'),

            // 統計要素
            totalTasks: document.getElementById('totalTasks'),
            completedTasks: document.getElementById('completedTasks'),
            remainingTasks: document.getElementById('remainingTasks'),

            // モーダル要素
            modal: document.getElementById('modal'),
            modalTitle: document.getElementById('modalTitle'),
            modalClose: document.querySelector('.modal-close'),
            modalCancel: document.getElementById('modalCancel'),
            modalConfirm: document.getElementById('modalConfirm'),

            // トースト要素
            toastContainer: document.getElementById('toastContainer')
        };

        // 要素の存在チェック
        Object.keys(this.elements).forEach(key => {
            if (!this.elements[key]) {
                console.warn(`Element not found: ${key}`);
            }
        });
    }

    /**
     * イベントリスナーを設定
     */
    attachEventListeners() {
        // フォーム送信
        this.elements.todoForm?.addEventListener('submit', (e) => this.handleFormSubmit(e));
        this.elements.resetBtn?.addEventListener('click', () => this.resetForm());

        // 検索とフィルター（デバウンス付き）
        this.elements.searchInput?.addEventListener('input', (e) => this.handleSearchInput(e));
        this.elements.filterCategory?.addEventListener('change', (e) => this.handleFilterChange(e));
        this.elements.filterPriority?.addEventListener('change', (e) => this.handleFilterChange(e));
        this.elements.filterStatus?.addEventListener('change', (e) => this.handleFilterChange(e));
        this.elements.sortBy?.addEventListener('change', (e) => this.handleFilterChange(e));
        this.elements.clearFilters?.addEventListener('click', () => this.clearFilters());

        // エクスポート・インポート
        this.elements.exportBtn?.addEventListener('click', () => this.exportData());
        this.elements.importBtn?.addEventListener('click', () => this.triggerImport());
        this.elements.importFile?.addEventListener('change', (e) => this.handleImport(e));

        // モーダル
        this.elements.modalClose?.addEventListener('click', () => this.closeModal());
        this.elements.modalCancel?.addEventListener('click', () => this.closeModal());
        this.elements.modal?.addEventListener('click', (e) => {
            if (e.target === this.elements.modal) this.closeModal();
        });

        // キーボードショートカット
        document.addEventListener('keydown', (e) => this.handleKeyboardShortcuts(e));
    }

    /**
     * TodoManagerのイベントを設定
     */
    setupTodoManagerEvents() {
        this.todoManager.addEventListener('todosChanged', () => this.updateDisplay());
        this.todoManager.addEventListener('todoAdded', (data) => this.showToast('タスクが追加されました', 'success'));
        this.todoManager.addEventListener('todoUpdated', (data) => this.showToast('タスクが更新されました', 'info'));
        this.todoManager.addEventListener('todoDeleted', (data) => this.showToast('タスクが削除されました', 'warning'));
        this.todoManager.addEventListener('todoToggled', (data) => {
            const message = data.todo.completed ? 'タスクを完了しました' : 'タスクを未完了に戻しました';
            this.showToast(message, 'success');
        });
        this.todoManager.addEventListener('filterChanged', () => this.updateDisplay());
    }

    // ===== 表示更新 =====

    /**
     * 全体表示を更新
     */
    updateDisplay() {
        this.updateTodoList();
        this.updateStatistics();
        this.updateEmptyState();
    }

    /**
     * TODOリストを更新
     */
    updateTodoList() {
        if (!this.elements.todoList) return;

        const filteredTodos = this.todoManager.getFilteredTodos();

        // リストをクリア
        this.elements.todoList.innerHTML = '';

        // 各TODOアイテムを作成
        filteredTodos.forEach(todo => {
            const todoElement = this.createTodoElement(todo);
            this.elements.todoList.appendChild(todoElement);
        });
    }

    /**
     * TODOアイテムのDOM要素を作成
     * @param {Todo} todo - Todoインスタンス
     * @returns {HTMLElement} - TODO要素
     */
    createTodoElement(todo) {
        const li = document.createElement('li');
        li.className = `todo-item${todo.completed ? ' completed' : ''}`;
        li.setAttribute('data-todo-id', todo.id);

        // 期限の状態に応じてクラスを追加
        const dueStatus = todo.getDueStatus();
        if (dueStatus !== 'normal') {
            li.classList.add(dueStatus);
        }

        li.innerHTML = `
            <input type="checkbox" class="todo-checkbox" ${todo.completed ? 'checked' : ''}
                   aria-label="タスクを完了としてマークする">
            <div class="todo-content">
                <h3 class="todo-title">${this.escapeHtml(todo.title)}</h3>
                ${todo.description ? `<p class="todo-description">${this.escapeHtml(todo.description)}</p>` : ''}
                <div class="todo-meta">
                    ${todo.category ? `<span class="todo-category ${todo.category}">${Todo.getCategoryDisplayName(todo.category)}</span>` : ''}
                    <span class="todo-priority ${todo.priority}">${Todo.getPriorityDisplayName(todo.priority)}</span>
                    ${todo.dueDate ? `<span class="todo-due-date ${dueStatus}">${todo.getFormattedDueDate()}</span>` : ''}
                    <span class="todo-created">作成: ${this.formatDate(todo.createdAt)}</span>
                </div>
            </div>
            <div class="todo-actions">
                <button class="btn btn-outline edit-btn" title="編集">
                    <span class="btn-icon">✏️</span>
                </button>
                <button class="btn btn-outline duplicate-btn" title="複製">
                    <span class="btn-icon">📋</span>
                </button>
                <button class="btn btn-outline delete-btn" title="削除">
                    <span class="btn-icon">🗑️</span>
                </button>
            </div>
        `;

        // イベントリスナーを設定
        this.setupTodoItemEvents(li, todo);

        return li;
    }

    /**
     * TODOアイテムにイベントリスナーを設定
     * @param {HTMLElement} element - TODO要素
     * @param {Todo} todo - Todoインスタンス
     */
    setupTodoItemEvents(element, todo) {
        // チェックボックス
        const checkbox = element.querySelector('.todo-checkbox');
        checkbox?.addEventListener('change', (e) => {
            e.stopPropagation();
            this.handleTodoToggle(todo.id);
        });

        // 編集ボタン
        const editBtn = element.querySelector('.edit-btn');
        editBtn?.addEventListener('click', (e) => {
            e.stopPropagation();
            this.editTodo(todo);
        });

        // 複製ボタン
        const duplicateBtn = element.querySelector('.duplicate-btn');
        duplicateBtn?.addEventListener('click', (e) => {
            e.stopPropagation();
            this.duplicateTodo(todo);
        });

        // 削除ボタン
        const deleteBtn = element.querySelector('.delete-btn');
        deleteBtn?.addEventListener('click', (e) => {
            e.stopPropagation();
            this.confirmDeleteTodo(todo);
        });
    }

    /**
     * 統計情報を更新
     */
    updateStatistics() {
        const stats = this.todoManager.getStatistics();

        if (this.elements.totalTasks) this.elements.totalTasks.textContent = stats.total;
        if (this.elements.completedTasks) this.elements.completedTasks.textContent = stats.completed;
        if (this.elements.remainingTasks) this.elements.remainingTasks.textContent = stats.pending;
    }

    /**
     * 空の状態表示を更新
     */
    updateEmptyState() {
        if (!this.elements.emptyState || !this.elements.todoList) return;

        const filteredTodos = this.todoManager.getFilteredTodos();
        const isEmpty = filteredTodos.length === 0;

        this.elements.emptyState.style.display = isEmpty ? 'block' : 'none';

        // 空の状態メッセージをカスタマイズ
        if (isEmpty) {
            const filter = this.todoManager.getCurrentFilter();
            const hasActiveFilter = filter.search || filter.category || filter.priority || filter.status;

            if (hasActiveFilter) {
                this.elements.emptyState.innerHTML = `
                    <div class="empty-icon">🔍</div>
                    <h3 class="empty-title">該当するタスクがありません</h3>
                    <p class="empty-description">
                        フィルター条件に一致するタスクが見つかりません<br>
                        検索条件を変更してください
                    </p>
                `;
            } else {
                this.elements.emptyState.innerHTML = `
                    <div class="empty-icon">📝</div>
                    <h3 class="empty-title">タスクがありません</h3>
                    <p class="empty-description">
                        上のフォームから新しいタスクを追加してください
                    </p>
                `;
            }
        }
    }

    // ===== イベントハンドラー =====

    /**
     * フォーム送信を処理
     * @param {Event} e - 送信イベント
     */
    handleFormSubmit(e) {
        e.preventDefault();

        try {
            this.clearError();

            const formData = this.getFormData();

            if (this.currentEditingTodo) {
                // 編集モード
                this.todoManager.updateTodo(this.currentEditingTodo.id, formData);
                this.exitEditMode();
            } else {
                // 新規追加モード
                this.todoManager.addTodo(formData);
                this.resetForm();
            }

        } catch (error) {
            this.showError(error.message);
        }
    }

    /**
     * 検索入力を処理（デバウンス付き）
     * @param {Event} e - 入力イベント
     */
    handleSearchInput(e) {
        clearTimeout(this.searchDebounceTimer);

        this.searchDebounceTimer = setTimeout(() => {
            this.todoManager.setFilter({ search: e.target.value });
        }, 300);
    }

    /**
     * フィルター変更を処理
     * @param {Event} e - 変更イベント
     */
    handleFilterChange(e) {
        const filterType = e.target.id.replace('filter', '').replace('sortBy', 'sortBy').toLowerCase();
        const value = e.target.value;

        const filterUpdate = {};

        if (filterType === 'sortby') {
            filterUpdate.sortBy = value;
        } else {
            filterUpdate[filterType] = value;
        }

        this.todoManager.setFilter(filterUpdate);
    }

    /**
     * TODOの完了状態切り替えを処理
     * @param {string} todoId - TodoのID
     */
    handleTodoToggle(todoId) {
        try {
            this.todoManager.toggleTodo(todoId);
        } catch (error) {
            this.showToast(error.message, 'error');
        }
    }

    /**
     * キーボードショートカットを処理
     * @param {Event} e - キーボードイベント
     */
    handleKeyboardShortcuts(e) {
        // Ctrl+N: 新しいタスク（フォーカスをタイトル欄に）
        if (e.ctrlKey && e.key === 'n') {
            e.preventDefault();
            this.elements.todoTitle?.focus();
        }

        // Escape: モーダルを閉じる、編集モードを終了
        if (e.key === 'Escape') {
            if (this.elements.modal?.classList.contains('show')) {
                this.closeModal();
            } else if (this.currentEditingTodo) {
                this.exitEditMode();
            }
        }

        // Ctrl+/: 検索フィールドにフォーカス
        if (e.ctrlKey && e.key === '/') {
            e.preventDefault();
            this.elements.searchInput?.focus();
        }
    }

    /**
     * インポートファイルダイアログを処理
     * @param {Event} e - ファイル選択イベント
     */
    handleImport(e) {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const jsonString = event.target.result;

                // 確認ダイアログを表示
                this.showConfirmModal(
                    'データのインポート',
                    'インポートされたデータで現在のデータを上書きしますか？',
                    () => {
                        if (this.todoManager.importData(jsonString, false)) {
                            this.showToast('データをインポートしました', 'success');
                        } else {
                            this.showToast('インポートに失敗しました', 'error');
                        }
                    }
                );

            } catch (error) {
                this.showToast('ファイルの読み込みに失敗しました', 'error');
            }

            // ファイル選択をリセット
            e.target.value = '';
        };

        reader.readAsText(file);
    }

    // ===== CRUD操作UI =====

    /**
     * TODOを編集モードにする
     * @param {Todo} todo - 編集するTodo
     */
    editTodo(todo) {
        this.currentEditingTodo = todo;

        // フォームにデータを設定
        if (this.elements.todoTitle) this.elements.todoTitle.value = todo.title;
        if (this.elements.todoDescription) this.elements.todoDescription.value = todo.description;
        if (this.elements.todoCategory) this.elements.todoCategory.value = todo.category;
        if (this.elements.todoPriority) this.elements.todoPriority.value = todo.priority;
        if (this.elements.todoDueDate && todo.dueDate) {
            // datetime-local形式に変換
            const date = new Date(todo.dueDate);
            const localDateTime = new Date(date.getTime() - date.getTimezoneOffset() * 60000)
                .toISOString().slice(0, 16);
            this.elements.todoDueDate.value = localDateTime;
        }

        // ボタンテキストを変更
        if (this.elements.submitBtn) {
            this.elements.submitBtn.innerHTML = '<span class="btn-icon">✏️</span>タスクを更新';
        }

        // フォームまでスクロール
        this.elements.todoForm?.scrollIntoView({ behavior: 'smooth' });

        // タイトルフィールドにフォーカス
        this.elements.todoTitle?.focus();
    }

    /**
     * TODOを複製
     * @param {Todo} todo - 複製するTodo
     */
    duplicateTodo(todo) {
        try {
            const duplicateData = {
                title: `${todo.title}のコピー`,
                description: todo.description,
                category: todo.category,
                priority: todo.priority,
                dueDate: todo.dueDate,
                completed: false
            };

            this.todoManager.addTodo(duplicateData);
        } catch (error) {
            this.showToast(error.message, 'error');
        }
    }

    /**
     * TODO削除の確認ダイアログを表示
     * @param {Todo} todo - 削除するTodo
     */
    confirmDeleteTodo(todo) {
        this.showConfirmModal(
            'タスクの削除',
            `"${todo.title}" を削除しますか？<br>この操作は取り消せません。`,
            () => {
                try {
                    this.todoManager.deleteTodo(todo.id);
                } catch (error) {
                    this.showToast(error.message, 'error');
                }
            }
        );
    }

    /**
     * 編集モードを終了
     */
    exitEditMode() {
        this.currentEditingTodo = null;
        this.resetForm();

        // ボタンテキストを元に戻す
        if (this.elements.submitBtn) {
            this.elements.submitBtn.innerHTML = '<span class="btn-icon">+</span>タスクを追加';
        }
    }

    // ===== フォーム操作 =====

    /**
     * フォームデータを取得
     * @returns {Object} - フォームデータ
     */
    getFormData() {
        const data = {
            title: this.elements.todoTitle?.value.trim(),
            description: this.elements.todoDescription?.value.trim(),
            category: this.elements.todoCategory?.value,
            priority: this.elements.todoPriority?.value,
            dueDate: this.elements.todoDueDate?.value ? new Date(this.elements.todoDueDate.value) : null
        };

        return data;
    }

    /**
     * フォームをリセット
     */
    resetForm() {
        this.elements.todoForm?.reset();
        this.clearError();

        // デフォルト値を設定
        if (this.elements.todoPriority) this.elements.todoPriority.value = 'medium';
    }

    /**
     * エラーメッセージを表示
     * @param {string} message - エラーメッセージ
     */
    showError(message) {
        if (this.elements.titleError) {
            this.elements.titleError.textContent = message;
            this.elements.titleError.style.display = 'block';
        }

        // フィールドにエラー状態を追加
        this.elements.todoTitle?.classList.add('error');
    }

    /**
     * エラーメッセージをクリア
     */
    clearError() {
        if (this.elements.titleError) {
            this.elements.titleError.textContent = '';
            this.elements.titleError.style.display = 'none';
        }

        // フィールドのエラー状態を削除
        this.elements.todoTitle?.classList.remove('error');
    }

    // ===== フィルター操作 =====

    /**
     * フィルターをクリア
     */
    clearFilters() {
        // フォーム要素をクリア
        if (this.elements.searchInput) this.elements.searchInput.value = '';
        if (this.elements.filterCategory) this.elements.filterCategory.value = '';
        if (this.elements.filterPriority) this.elements.filterPriority.value = '';
        if (this.elements.filterStatus) this.elements.filterStatus.value = '';
        if (this.elements.sortBy) this.elements.sortBy.value = 'createdAt';

        // TodoManagerのフィルターをクリア
        this.todoManager.clearFilter();
    }

    // ===== エクスポート・インポート =====

    /**
     * データをエクスポート
     */
    exportData() {
        try {
            const exportData = this.todoManager.exportData();
            if (!exportData) {
                throw new Error('エクスポートデータの生成に失敗しました');
            }

            // ファイルとしてダウンロード
            const blob = new Blob([exportData], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `todos-${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);

            this.showToast('データをエクスポートしました', 'success');

        } catch (error) {
            this.showToast(error.message, 'error');
        }
    }

    /**
     * インポートファイル選択をトリガー
     */
    triggerImport() {
        this.elements.importFile?.click();
    }

    // ===== モーダル操作 =====

    /**
     * 確認モーダルを表示
     * @param {string} title - モーダルタイトル
     * @param {string} message - メッセージ
     * @param {function} onConfirm - 確認時のコールバック
     */
    showConfirmModal(title, message, onConfirm) {
        if (!this.elements.modal) return;

        this.elements.modalTitle.textContent = title;
        this.elements.modal.querySelector('.modal-body').innerHTML = `<p>${message}</p>`;

        // 確認ボタンのイベントリスナーをリセット
        const newConfirmBtn = this.elements.modalConfirm.cloneNode(true);
        this.elements.modalConfirm.parentNode.replaceChild(newConfirmBtn, this.elements.modalConfirm);
        this.elements.modalConfirm = newConfirmBtn;

        this.elements.modalConfirm.addEventListener('click', () => {
            onConfirm();
            this.closeModal();
        });

        this.showModal();
    }

    /**
     * モーダルを表示
     */
    showModal() {
        if (this.elements.modal) {
            this.elements.modal.classList.add('show');
            this.elements.modal.setAttribute('aria-hidden', 'false');

            // フォーカストラップ
            this.elements.modalConfirm?.focus();
        }
    }

    /**
     * モーダルを閉じる
     */
    closeModal() {
        if (this.elements.modal) {
            this.elements.modal.classList.remove('show');
            this.elements.modal.setAttribute('aria-hidden', 'true');
        }
    }

    // ===== 通知・トースト =====

    /**
     * トースト通知を表示
     * @param {string} message - メッセージ
     * @param {string} [type='info'] - 通知タイプ
     * @param {number} [duration=3000] - 表示時間（ミリ秒）
     */
    showToast(message, type = 'info', duration = 3000) {
        if (!this.elements.toastContainer) return;

        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.textContent = message;

        this.elements.toastContainer.appendChild(toast);

        // 自動削除
        setTimeout(() => {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
        }, duration);
    }

    // ===== ユーティリティ =====

    /**
     * HTMLをエスケープ
     * @param {string} text - エスケープするテキスト
     * @returns {string} - エスケープされたテキスト
     */
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    /**
     * 日付をフォーマット
     * @param {Date|string} date - フォーマットする日付
     * @returns {string} - フォーマットされた日付文字列
     */
    formatDate(date) {
        const d = new Date(date);
        return d.toLocaleDateString('ja-JP', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }
}